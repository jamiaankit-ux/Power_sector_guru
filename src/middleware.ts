import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/session";

const PROTECTED = ["/dashboard", "/learn", "/admin", "/profile", "/checkout"];
// Pages the Play Store / App Store apps must not show (purchases happen on the website).
const WEB_ONLY = ["/pricing", "/checkout", "/install"];
const APP_UA_MARKER = "PowerSectorAcademyApp";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if ((req.headers.get("user-agent") ?? "").includes(APP_UA_MARKER) && WEB_ONLY.some((p) => pathname.startsWith(p)))
    return NextResponse.redirect(new URL("/courses", req.url));
  if (!PROTECTED.some((p) => pathname.startsWith(p))) return NextResponse.next();
  const s = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin") && s.role !== "ADMIN" && s.role !== "INSTRUCTOR")
    return NextResponse.redirect(new URL("/dashboard", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/learn/:path*", "/admin/:path*", "/profile", "/checkout/:path*", "/pricing/:path*", "/install"] };
