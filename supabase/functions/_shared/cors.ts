/**
 * Shared CORS headers — required for Expo/React Native clients calling
 * Supabase Edge Functions from mobile or web.
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

/**
 * Verify the caller's JWT and return the decoded user payload.
 * Throws a Response with status 401 if the token is missing or invalid.
 */
export async function verifyUser(req: Request): Promise<{ id: string; email: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Decode JWT payload (middle segment, base64url)
  const token = authHeader.replace('Bearer ', '');
  const [, payloadB64] = token.split('.');
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

  if (!payload?.sub) {
    throw new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return { id: payload.sub, email: payload.email ?? '' };
}

/** Standard JSON success response */
export function okJson(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Standard JSON error response */
export function errJson(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
