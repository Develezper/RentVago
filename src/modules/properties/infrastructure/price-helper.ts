const removeRepeatedSeparators = (value: string, separator: "." | ","): string => {
  return value.split(separator).join("");
};

const normalizeNumericString = (rawValue: string): string => {
  const compactValue = rawValue
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\d,.-]/g, "");

  if (compactValue.length === 0) return "";

  const commaCount = (compactValue.match(/,/g) ?? []).length;
  const dotCount = (compactValue.match(/\./g) ?? []).length;

  if (commaCount > 0 && dotCount > 0) {
    const lastCommaIndex = compactValue.lastIndexOf(",");
    const lastDotIndex = compactValue.lastIndexOf(".");

    if (lastCommaIndex > lastDotIndex) {
      return removeRepeatedSeparators(compactValue, ".").replace(",", ".");
    }

    return removeRepeatedSeparators(compactValue, ",");
  }

  if (commaCount > 0) {
    if (commaCount > 1) {
      return removeRepeatedSeparators(compactValue, ",");
    }

    const decimals = compactValue.split(",")[1] ?? "";
    return decimals.length > 0 && decimals.length <= 2
      ? compactValue.replace(",", ".")
      : compactValue.replace(",", "");
  }

  if (dotCount > 0) {
    if (dotCount > 1) {
      return removeRepeatedSeparators(compactValue, ".");
    }

    const decimals = compactValue.split(".")[1] ?? "";
    return decimals.length > 0 && decimals.length <= 2
      ? compactValue
      : compactValue.replace(".", "");
  }

  return compactValue;
};

export const normalizePriceToNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== "string") return undefined;

  const normalizedString = normalizeNumericString(value);
  if (normalizedString.length === 0) return undefined;

  const parsed = Number(normalizedString);
  if (!Number.isFinite(parsed)) return undefined;

  return parsed;
};

export const normalizePositivePriceToNumber = (value: unknown): number | undefined => {
  const parsed = normalizePriceToNumber(value);
  if (parsed === undefined || parsed <= 0) return undefined;
  return parsed;
};
