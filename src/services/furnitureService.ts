import { supabase } from '../lib/supabase';

export const furnitureService = {
  async getAll() {
    console.log('furnitureService: Fetching all products...');
    const { data, error } = await supabase
      .from('furniture')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('furnitureService: Fetch error', error);
      throw error;
    }
    console.log('furnitureService: Fetched', data?.length, 'products');
    return data || [];
  },

  async getVisible() {
    // NOTE: The DB schema uses only 'is_hidden'. RLS also enforces this at DB level.
    // This filter is defense-in-depth for the client side.
    const { data, error } = await supabase
      .from('furniture')
      .select('*')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    console.log('furnitureService: Returned', data?.length, 'visible items to user');
    return data || [];
  },

  async getHidden() {
    // Only 'is_hidden' column exists in schema — use it as sole source of truth
    const { data, error } = await supabase
      .from('furniture')
      .select('*')
      .eq('is_hidden', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    console.log('furnitureService: Returned', data?.length, 'hidden items to admin');
    return data || [];
  },

  async add(item: any, adminId: string) {
    console.log('furnitureService: Adding item', item.name);
    
    // 1. Insert the product
    const { data, error } = await supabase
      .from('furniture')
      .insert(item)
      .select()
      .single();
    
    if (error) {
      console.error('furnitureService: Insert error', error);
      throw error;
    }

    // 2. Log activity (Non-blocking: if this fails, the product is still added)
    try {
      if (adminId) {
        await this.logActivity(adminId, 'ADDED_ITEM', { name: item.name, id: data.id });
      }
    } catch (e) {
      console.warn('furnitureService: Log failed (ignoring)', e);
    }
    
    return data;
  },

  async update(id: string, updates: any, adminId: string) {
    const { data, error } = await supabase
      .from('furniture')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    try {
      if (adminId) await this.logActivity(adminId, 'EDITED_ITEM', { id, updates });
    } catch (e) {}
    
    return data;
  },

  async delete(id: string, name: string, adminId: string) {
    const { error } = await supabase
      .from('furniture')
      .delete()
      .eq('id', id);
    
    if (error) throw error;

    // Log activity
    await this.logActivity(adminId, 'DELETE_PRODUCT', { productId: id, name });
  },


  async toggleVisibility(id: string, isHidden: boolean, adminId: string, productName?: string) {
    // Only update 'is_hidden' — the single source of truth per DB schema
    const { error } = await supabase
      .from('furniture')
      .update({ is_hidden: isHidden })
      .eq('id', id);

    if (error) throw error;
    
    // Log with full product context for the audit trail
    const action = isHidden ? 'HIDE_PRODUCT' : 'SHOW_PRODUCT';
    await this.logActivity(adminId, action, { 
      productId: id, 
      name: productName || 'Unknown',
      status: isHidden ? 'Hidden from users' : 'Now visible to users'
    });
  },

  async uploadImage(uri: string) {
    console.log('furnitureService: Uploading image...', uri);
    try {
      // If it's already a web URL, don't re-upload
      if (uri.startsWith('http')) return uri;

      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      
      const filename = `${Date.now()}.jpg`;
      const path = `products/${filename}`;

      const { error } = await supabase.storage
        .from('furniture')
        .upload(path, arrayBuffer, { 
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('furniture')
        .getPublicUrl(path);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Upload error', err);
      return uri; // Return original uri as fallback
    }
  },

  async logActivity(adminId: string, action: string, details: any) {
    // Only log if we have a valid adminId (UUID)
    if (!adminId || adminId.length < 30) return; 
    
    await supabase.from('activity_logs').insert({
      admin_id: adminId,
      action,
      details
    });
  }
};
