-- ============================================================
-- Furniture App — Complete Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ── profiles ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username     TEXT UNIQUE,
  full_name    TEXT,
  email        TEXT,
  phone        TEXT,
  address      TEXT,
  avatar_url   TEXT,
  role         TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── furniture ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS furniture (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  price        DECIMAL(10, 2) NOT NULL,
  category     TEXT,
  image_url    TEXT,
  is_hidden    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── orders ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users ON DELETE SET NULL,
  items            JSONB NOT NULL DEFAULT '[]',
  total_amount     DECIMAL(10, 2) NOT NULL,
  shipping_address TEXT,
  buyer_name       TEXT,
  buyer_phone      TEXT,
  status           TEXT DEFAULT 'placed'
                     CHECK (status IN ('placed','processing','shipped','delivered')),
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── activity_logs ─────────────────────────────────────────────
-- action values: ADDED_ITEM | EDITED_ITEM | DELETE_PRODUCT |
--                HIDE_PRODUCT | SHOW_PRODUCT | DELETED_USER
CREATE TABLE IF NOT EXISTS activity_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  details    JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── app_settings ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default security policies
INSERT INTO app_settings (key, value)
VALUES ('security_policies', '{
  "twoFactor": true,
  "autoLogout": false,
  "biometricAuth": true,
  "strictPasswords": true,
  "dataEncryption": true,
  "auditLogging": true
}')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE furniture     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings  ENABLE ROW LEVEL SECURITY;

-- ── profiles policies ────────────────────────────────────────
CREATE POLICY "Profiles viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ── furniture policies ───────────────────────────────────────
-- Users can only see items where is_hidden = FALSE.
-- Admins bypass this and can see all items (including hidden ones).
CREATE POLICY "Anyone can view visible furniture"
  ON furniture FOR SELECT
  USING (
    is_hidden = FALSE
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert furniture"
  ON furniture FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can update furniture"
  ON furniture FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can delete furniture"
  ON furniture FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ── orders policies ──────────────────────────────────────────
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can update order status"
  ON orders FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ── activity_logs policies ───────────────────────────────────
-- NOTE: Writes from the app should go through the admin-log Edge Function
-- which uses service_role. Direct inserts are restricted to admins only.
CREATE POLICY "Admins can view logs"
  ON activity_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can insert logs"
  ON activity_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ── app_settings policies ────────────────────────────────────
CREATE POLICY "Settings viewable by everyone"
  ON app_settings FOR SELECT USING (true);

CREATE POLICY "Admins can update settings"
  ON app_settings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================================
-- Trigger: auto-create profile row when a new user signs up
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
