export const SESSION_PATH_PREFIX = "/session/";

export function sessionIdFromPathname(pathname: string | null): string | null {
  if (!pathname?.startsWith(SESSION_PATH_PREFIX)) {
    return null;
  }
  const rest = pathname.slice(SESSION_PATH_PREFIX.length);
  const segment = rest.split("/")[0];
  return segment ?? null;
}
