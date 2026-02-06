/**
 * Health check endpoint for Kubernetes readiness/liveness probes.
 * GET /api/ping returns 200 when the app process is up.
 */
export function GET() {
  return Response.json({ ok: true }, { status: 200 });
}
