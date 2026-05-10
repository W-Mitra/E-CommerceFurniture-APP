/**
 * Edge Function: place-order
 *
 * Security guarantees:
 * - Requires a valid user JWT (no anonymous orders)
 * - Fetches real prices from the DB — client-supplied prices are ignored
 * - Rejects hidden / deleted products
 * - Calculates the authoritative total server-side
 */
/// <reference lib="deno.window" />
import { serve } from 'std/http/server.ts';
import { createClient } from 'supabase-js';
import { corsHeaders, verifyUser, okJson, errJson } from '../_shared/cors.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate caller
    const caller = await verifyUser(req);

    // 2. Parse request body
    const { items, shipping_address, buyer_name, buyer_phone } = await req.json();

    if (!items?.length || !shipping_address || !buyer_name || !buyer_phone) {
      return errJson('Missing required order fields', 400);
    }

    // 3. Build Supabase client with SERVICE ROLE (bypasses RLS for price lookup)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    // 4. Fetch authoritative product data — NEVER trust client prices
    const productIds: string[] = items.map((i: any) => i.id);
    const { data: products, error: productError } = await supabase
      .from('furniture')
      .select('id, name, price, is_hidden')
      .in('id', productIds);

    if (productError) return errJson('Could not verify products', 500);

    // 5. Validate: all products must exist and be visible
    const productMap = new Map(products!.map((p: any) => [p.id, p]));
    for (const item of items) {
      const product = productMap.get(item.id);
      if (!product) return errJson(`Product not found: ${item.id}`, 422);
      if (product.is_hidden) return errJson(`Product unavailable: ${product.name}`, 422);
      if (item.quantity < 1 || item.quantity > 99) {
        return errJson(`Invalid quantity for: ${product.name}`, 422);
      }
    }

    // 6. Calculate server-side total (ignore any client-supplied total/price)
    const verifiedItems = items.map((item: any) => {
      const product = productMap.get(item.id)!;
      return {
        id: item.id,
        name: product.name,
        price: product.price,   // ← real price from DB
        quantity: item.quantity,
      };
    });

    const totalAmount = verifiedItems.reduce(
      (sum: number, i: any) => sum + i.price * i.quantity,
      0,
    );

    // 7. Insert the order using the verified data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: caller.id,
        items: verifiedItems,
        total_amount: totalAmount,
        shipping_address,
        buyer_name,
        buyer_phone,
        status: 'placed',
      })
      .select('id, total_amount, status')
      .single();

    if (orderError) return errJson('Failed to place order: ' + orderError.message, 500);

    return okJson({ success: true, order }, 201);
  } catch (err) {
    if (err instanceof Response) return err; // re-throw auth errors
    return errJson('Internal server error', 500);
  }
});
