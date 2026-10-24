import * as jwt from '@tsndr/cloudflare-worker-jwt';
import { error } from '../../lib/server/http.js';

const PUBLIC_ROUTES = ['/api/auth/login', '/api/auth/register'];

// Course and bonus definitions are readable by any promoter but only the admin may change them.
function requiresAdmin(pathname, method) {
  if (pathname.startsWith('/api/admin/') || pathname === '/api/admin') return true;
  const managed = /^\/api\/(courses|bonuses)(\/|$)/.test(pathname);
  return managed && method !== 'GET';
}

export async function onRequest(context) {
  const { request, env } = context;
  const { pathname } = new URL(request.url);

  if (PUBLIC_ROUTES.includes(pathname)) {
    return await context.next();
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error('Unauthorized', 401);
  }

  const secret = env.JWT_SECRET;
  if (!secret) {
    return error('Server misconfigured: JWT_SECRET is not set', 500);
  }

  const token = authHeader.split(' ')[1];
  let payload;
  try {
    if (!(await jwt.verify(token, secret))) return error('Invalid token', 401);
    payload = jwt.decode(token).payload;
  } catch {
    return error('Token verification failed', 401);
  }

  // Read rank and status fresh from the database on every request, so a
  // suspension, deletion or rank change takes effect immediately.
  const user = await env.DB.prepare('SELECT id, phone, rank, state AS status FROM users WHERE id = ?').bind(payload.id).first();
  if (!user || user.status !== 'active') {
    return error('Your account is not active. Please log in again.', 401);
  }

  if (requiresAdmin(pathname, request.method) && user.rank !== 'Super Admin') {
    return error('Unauthorized: Admin access required', 403);
  }

  context.data = context.data || {};
  context.data.user = { id: user.id, phone: user.phone, rank: user.rank };
  return await context.next();
}
