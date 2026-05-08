import { jwtConfig } from "@/lib/jwt";
import { NextResponse } from "next/server";

export const ACCESS_COOKIE_NAME = "access_token";
export const REFRESH_COOKIE_NAME = "refresh_token";

const cookieBaseOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  path: "/",
};

export const setAuthCookies = (
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string },
): void => {
  response.cookies.set({
    ...cookieBaseOptions,
    name: ACCESS_COOKIE_NAME,
    value: tokens.accessToken,
    maxAge: jwtConfig.accessTokenMaxAgeSeconds,
  });

  response.cookies.set({
    ...cookieBaseOptions,
    name: REFRESH_COOKIE_NAME,
    value: tokens.refreshToken,
    maxAge: jwtConfig.refreshTokenMaxAgeSeconds,
  });
};

export const clearAuthCookies = (response: NextResponse): void => {
  response.cookies.set({
    ...cookieBaseOptions,
    name: ACCESS_COOKIE_NAME,
    value: "",
    maxAge: 0,
  });

  response.cookies.set({
    ...cookieBaseOptions,
    name: REFRESH_COOKIE_NAME,
    value: "",
    maxAge: 0,
  });
};
