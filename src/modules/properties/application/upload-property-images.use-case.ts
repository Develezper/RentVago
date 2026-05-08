interface UploadPropertyImagesInput {
  images?: Array<string | null | undefined>;
  source?: "DIRECT" | "SCRAPING";
}

const normalizeImageValue = (value: string): string => value.trim();

const toMockStorageUrl = (rawValue: string, source: "DIRECT" | "SCRAPING", index: number): string => {
  const safeFileName = rawValue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `https://storage.rentvago.mock/properties/${source.toLowerCase()}/${Date.now()}-${index}-${safeFileName || "image"}.jpg`;
};

const toPublicImageUrl = (
  rawValue: string,
  source: "DIRECT" | "SCRAPING",
  index: number,
): string => {
  try {
    const parsedUrl = new URL(rawValue);
    return parsedUrl.toString();
  } catch {
    return toMockStorageUrl(rawValue, source, index);
  }
};

export class UploadPropertyImagesUseCase {
  async execute({ images = [], source = "DIRECT" }: UploadPropertyImagesInput): Promise<string[]> {
    const seen = new Set<string>();
    const normalizedImages: string[] = [];

    images.forEach((image, index) => {
      if (typeof image !== "string") return;
      const normalizedValue = normalizeImageValue(image);
      if (normalizedValue.length === 0) return;

      const publicUrl = toPublicImageUrl(normalizedValue, source, index);
      const dedupeKey = publicUrl.toLowerCase();

      if (seen.has(dedupeKey)) return;

      seen.add(dedupeKey);
      normalizedImages.push(publicUrl);
    });

    return normalizedImages;
  }
}
