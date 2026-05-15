export type JsonObject = Record<string, unknown>;

export const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null;

export const getNestedValue = (source: unknown, path: string): unknown => {
  if (!isJsonObject(source)) return undefined;

  const direct = source[path];
  if (direct !== undefined) return direct;

  return path.split(".").reduce<unknown>((current, segment) => {
    if (!isJsonObject(current)) return undefined;
    return current[segment];
  }, source);
};

export const getFirstNonEmptyString = (source: unknown, paths: string[]): string => {
  for (const path of paths) {
    const value = getNestedValue(source, path);
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return "";
};

export const getFirstNonEmptyText = (source: unknown, paths: string[]): string => {
  for (const path of paths) {
    const value = getNestedValue(source, path);

    if (typeof value === "string" && value.trim().length > 0) return value.trim();

    if (!isJsonObject(value)) continue;

    const nested = getFirstNonEmptyString(value, [
      "text",
      "description",
      "value",
      "content",
      "message",
      "body",
    ]);
    if (nested.length > 0) return nested;
  }
  return "";
};

export const isValidHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

export const parsePriceAmount = (amount: string | number | undefined): number => {
  if (amount === undefined || amount === null) return 0;
  if (typeof amount === "number") return Number.isFinite(amount) ? Math.round(amount) : 0;
  const normalized = String(amount).replace(/[^0-9]/g, "");
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parsePositiveInteger = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return undefined;
    const n = Math.trunc(value);
    return n > 0 ? n : undefined;
  }
  if (typeof value === "string") {
    const match = value.match(/\d{1,2}/);
    if (!match) return undefined;
    const parsed = Number.parseInt(match[0], 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
};

export const getFirstParsablePrice = (source: unknown, paths: string[]): number => {
  for (const path of paths) {
    const value = getNestedValue(source, path);
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value);
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = parsePriceAmount(value);
      if (parsed > 0) return parsed;
    }
  }
  return 0;
};

export const getFirstPositiveInteger = (source: unknown, paths: string[]): number | undefined => {
  for (const path of paths) {
    const parsed = parsePositiveInteger(getNestedValue(source, path));
    if (parsed !== undefined) return parsed;
  }
  return undefined;
};

export const collectImageUrls = (
  source: unknown,
  collectionPaths: string[],
  scalarPaths: string[],
): string[] => {
  const seen = new Set<string>();
  const urls: string[] = [];

  const push = (v: string) => {
    const url = v.trim();
    if (isValidHttpUrl(url) && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  };

  const extract = (value: unknown) => {
    if (typeof value === "string") { push(value); return; }
    if (Array.isArray(value)) { value.forEach(extract); return; }
    if (!isJsonObject(value)) return;
    for (const p of scalarPaths) {
      const nested = getNestedValue(value, p);
      if (typeof nested === "string") push(nested);
    }
  };

  for (const path of collectionPaths) extract(getNestedValue(source, path));
  return urls;
};

export const getApifyApiToken = (): string => {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN no está definido en .env");
  return token;
};

export const clampLimit = (count: number, max: number): number => {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("El límite del scraper debe ser un entero positivo.");
  }
  return Math.min(count, max);
};
