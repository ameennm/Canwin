// Shared response helpers for Pages Functions.

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function error(message, status = 400) {
  return json({ error: message }, status);
}

// Logs the real error server-side and returns a generic message, so database
// internals never reach the browser.
export function serverError(err, context = 'Request') {
  console.error(`${context} failed:`, err);
  return error('Something went wrong. Please try again.', 500);
}

export function isAdmin(data) {
  return data?.user?.rank === 'Super Admin';
}

export function forbidden() {
  return error('Unauthorized', 403);
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
