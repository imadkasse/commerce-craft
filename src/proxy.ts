import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAIN_HOSTS = new Set([
  "localhost",
  "commercecraft.app",
  "www.commercecraft.app",
  "proxy.commercecraft.app",
  "commerce-craft-six.vercel.app",
]);

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/store",
  "/products",
  "/orders",
  "/team",
  "/landing-pages",
  "/stores",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rawHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.hostname;
  const host = rawHost.split(":")[0].toLowerCase();

  const mainHosts = new Set(MAIN_HOSTS);
  const appHost = process.env.NEXT_PUBLIC_APP_HOST?.toLowerCase();
  if (appHost) mainHosts.add(appHost);

  if (!mainHosts.has(host)) {
    let storeSlug: string | null = null;
    let customDomain: string | null = null;

    if (host.endsWith(".commercecraft.app")) {
      storeSlug = host.slice(0, -".commercecraft.app".length);
    } else if (host.endsWith(".localhost")) {
      storeSlug = host.slice(0, -".localhost".length);
    } else {
      customDomain = host;
    }

    if (storeSlug || customDomain) {
      const lastSegment = pathname.split("/").pop() ?? "";
      if (
        pathname.startsWith("/lp/") ||
        pathname.startsWith("/_next/") ||
        pathname.startsWith("/api/") ||
        /\./.test(lastSegment)
      ) {
        return NextResponse.next();
      }

      const url = request.nextUrl.clone();
      url.pathname = storeSlug
        ? `/s/${storeSlug}${pathname}`
        : `/s/domain/${customDomain}${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  const token = request.cookies.get("commercecraft_token")?.value;

  if (!token) {
    const isProtected = PROTECTED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    );

    if (isProtected) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
