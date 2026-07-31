import { getNeonAuth } from '@/lib/neonAuth';

export const dynamic = 'force-dynamic';

/**
 * Neon Auth's API surface. The SDK owns every route under /api/auth — sign-in,
 * sign-up, callbacks, session, sign-out.
 *
 * The handler is resolved per request rather than at module load so that a
 * deployment without Neon Auth provisioned still builds and serves; it just
 * answers 503 here instead of crashing the whole route tree.
 */

type RouteHandler = (request: Request, context: unknown) => Promise<Response> | Response;

let handlers: { GET: RouteHandler; POST: RouteHandler } | null = null;

function resolve(): { GET: RouteHandler; POST: RouteHandler } | null {
  if (handlers) return handlers;
  const auth = getNeonAuth();
  if (!auth) return null;
  handlers = auth.handler() as unknown as { GET: RouteHandler; POST: RouteHandler };
  return handlers;
}

function unavailable(): Response {
  return Response.json(
    { error: 'Neon Auth is not configured on this deployment.' },
    { status: 503 },
  );
}

export async function GET(request: Request, context: unknown) {
  const resolved = resolve();
  return resolved ? resolved.GET(request, context) : unavailable();
}

export async function POST(request: Request, context: unknown) {
  const resolved = resolve();
  return resolved ? resolved.POST(request, context) : unavailable();
}
