import {
  ACCESS_COOKIE_NAME,
  clearAuthCookies,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth-cookies";
import { authUseCases } from "@/modules/auth/application/auth.use-cases";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  await authUseCases.logout({ accessToken, refreshToken });

  const origin = request.headers.get("x-forwarded-proto") === "https"
    ? `https://${request.headers.get("host")}`
    : request.nextUrl.origin;
  const loginUrl = new URL("/login", origin);
  const response = NextResponse.redirect(loginUrl, 303);
  clearAuthCookies(response);

  return response;
}
