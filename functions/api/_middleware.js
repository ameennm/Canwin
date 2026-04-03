import * as jwt from '@tsndr/cloudflare-worker-jwt';

export async function onRequest(context) {
  const { request, env } = context;
  const { pathname } = new URL(request.url);

  // Skip auth for login, register, and test-db
  if (pathname.startsWith('/api/auth/login') || 
      pathname.startsWith('/api/auth/register') || 
      pathname.startsWith('/api/test-db')) {
    return await context.next();
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const token = authHeader.split(' ')[1];
  const secret = env.JWT_SECRET || 'fallback_secret_key_change_in_production';

  try {
    const isValid = await jwt.verify(token, secret);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    
    const { payload } = jwt.decode(token);
    // Attach user to the request context data so downstream handlers can access it
    context.data = context.data || {};
    context.data.user = payload;
    
    return await context.next();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Token verification failed' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
}
