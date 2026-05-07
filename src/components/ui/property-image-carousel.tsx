"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

interface PropertyImageCarouselProps {
  images: string[];
  alt: string;
  heightClassName?: string;
  showThumbnails?: boolean;
  badgeLabel?: string;
}

const normalizeImages = (images: string[]): string[] => {
  const seen = new Set<string>();

  return images
    .map((image) => image.trim())
    .filter((image) => {
      if (image.length === 0) return false;
      const key = image.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export function PropertyImageCarousel({
  images,
  alt,
  heightClassName = "h-72 sm:h-96",
  showThumbnails = false,
  badgeLabel,
}: PropertyImageCarouselProps) {
  const normalizedImages = useMemo(() => normalizeImages(images), [images]);
  const [activeIndex, setActiveIndex] = useState(0);

  const hasImages = normalizedImages.length > 0;

  const previousImage = () => {
    if (!hasImages) return;
    setActiveIndex((previous) =>
      previous === 0 ? normalizedImages.length - 1 : previous - 1,
    );
  };

  const nextImage = () => {
    if (!hasImages) return;
    setActiveIndex((previous) =>
      previous === normalizedImages.length - 1 ? 0 : previous + 1,
    );
  };

  return (
    <div className="space-y-3">
      <div className={`relative overflow-hidden rounded-2xl bg-gray-900 ${heightClassName}`}>
        {hasImages ? (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={normalizedImages[activeIndex]}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <Image
                  src={normalizedImages[activeIndex]}
                  alt={`${alt} - imagen ${activeIndex + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                  priority={activeIndex === 0}
                />
              </motion.div>
            </AnimatePresence>

            {badgeLabel ? (
              <span className="absolute bottom-3 left-3 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-gray-200">
                {badgeLabel}
              </span>
            ) : null}

            {normalizedImages.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={previousImage}
                  className="absolute left-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-700 bg-black/75 text-white transition hover:border-green-500 hover:text-green-300"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-700 bg-black/75 text-white transition hover:border-green-500 hover:text-green-300"
                  aria-label="Imagen siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-gray-700 bg-black/70 px-2 py-1">
                  {normalizedImages.map((_, index) => (
                    <button
                      type="button"
                      key={`dot-${index}`}
                      onClick={() => setActiveIndex(index)}
                      aria-label={`Ir a imagen ${index + 1}`}
                      className={`h-2 w-2 rounded-full transition ${
                        index === activeIndex ? "bg-green-400" : "bg-gray-500"
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-600">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
      </div>

      {showThumbnails && normalizedImages.length > 1 ? (
        <div className="grid grid-cols-4 gap-2">
          {normalizedImages.slice(0, 8).map((image, index) => (
            <button
              type="button"
              key={`thumb-${image}-${index}`}
              onClick={() => setActiveIndex(index)}
              className={`relative h-16 overflow-hidden rounded-xl border transition ${
                index === activeIndex
                  ? "border-green-500"
                  : "border-gray-800 hover:border-gray-600"
              }`}
              aria-label={`Seleccionar miniatura ${index + 1}`}
            >
              <Image src={image} alt={`${alt} miniatura ${index + 1}`} fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
