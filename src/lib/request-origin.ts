import type { NextRequest } from "next/server";

const firstHeaderValue = (value: string | null): string | null => {
  const firstValue = value?.split(",")[0]?.trim();
  return firstValue && firstValue.length > 0 ? firstValue : null;
};

const resolveForwardedProtocol = (request: NextRequest): "http" | "https" => {
  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));

  if (forwardedProto === "https" || request.headers.has("x-arr-ssl")) {
    return "https";
  }

  if (forwardedProto === "http") {
    return "http";
  }

  return request.nextUrl.protocol === "https:" ? "https" : "http";
};

export const resolveRequestOrigin = (request: NextRequest): string => {
  const protocol = resolveForwardedProtocol(request);
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost ?? request.headers.get("host") ?? request.nextUrl.host;

  return `${protocol}://${host}`;
};

export const createRequestUrl = (request: NextRequest, pathname: string): URL =>
  new URL(pathname, resolveRequestOrigin(request));
