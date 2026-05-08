export const DEFAULT_POST_AUTH_REDIRECT_PATH = "/search";

export const sanitizePostAuthRedirect = (
  value: string | null | undefined,
): string | null => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  try {
    const parsed = new URL(value, "http://localhost");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
};

export const buildAuthPageHref = (
  pathname: "/login" | "/register",
  next: string,
): string => {
  if (next === DEFAULT_POST_AUTH_REDIRECT_PATH) {
    return pathname;
  }
  return `${pathname}?next=${encodeURIComponent(next)}`;
};
