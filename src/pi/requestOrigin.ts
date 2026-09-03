/**
 * Same-origin guard for the dev-server HTTP surfaces (provider proxy and the
 * Pi control plane).
 *
 * Both surfaces mutate or read the host machine — the proxy forwards to
 * arbitrary URLs, the Pi host runs tools and writes files — so an unrelated
 * web page must not be able to drive them. Absent an Origin header the
 * request is trusted: curl and other non-browser clients cannot be defended
 * by Origin anyway, and anything running as this user on this machine
 * already has full access.
 *
 * "Same origin" is strict — scheme, hostname and port must match the Host
 * header the request was sent to — so a page served from another local port
 * (or another host) is rejected like any other cross-origin caller.
 */
export function sameOriginRequestAllowed(req: {
  headers: Record<string, string | string[] | undefined>;
}): boolean {
  const rawOrigin = headerValue(req.headers.origin);
  if (!rawOrigin) return true;
  if (rawOrigin === "null") return false;

  let origin: URL;
  try {
    origin = new URL(rawOrigin);
  } catch {
    return false;
  }
  if (origin.protocol !== "http:" && origin.protocol !== "https:") return false;
  if (!isLoopbackHostname(origin.hostname)) return false;

  const hostHeader = headerValue(req.headers.host);
  if (!hostHeader) return false;
  const host = parseHostHeader(hostHeader);
  if (!host) return false;
  if (!isLoopbackHostname(host.hostname)) return false;

  const originPort = origin.port || (origin.protocol === "https:" ? "443" : "80");
  const hostPort = host.port || (origin.protocol === "https:" ? "443" : "80");
  return origin.hostname === host.hostname && originPort === hostPort;
}

function parseHostHeader(value: string): { hostname: string; port?: string } | undefined {
  try {
    const url = new URL(`http://${value}`);
    return { hostname: url.hostname, port: url.port || undefined };
  } catch {
    return undefined;
  }
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
