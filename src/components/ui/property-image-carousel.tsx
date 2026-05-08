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
  const [isCurrentImageLoading, setIsCurrentImageLoading] = useState(normalizedImages.length > 0);
  const [failedImages, setFailedImages] = useState<Record<string, true>>({});

  const hasImages = normalizedImages.length > 0;
  const safeActiveIndex = hasImages ? activeIndex % normalizedImages.length : 0;
  const activeImage = hasImages ? normalizedImages[safeActiveIndex] : null;
  const activeImageFailed = activeImage ? failedImages[activeImage] === true : false;

  const previousImage = () => {
    if (!hasImages) return;
    setIsCurrentImageLoading(true);
    setActiveIndex((previous) =>
      previous === 0 ? normalizedImages.length - 1 : previous - 1,
    );
  };

  const nextImage = () => {
    if (!hasImages) return;
    setIsCurrentImageLoading(true);
    setActiveIndex((previous) =>
      previous === normalizedImages.length - 1 ? 0 : previous + 1,
    );
  };

  return (
    <div className="space-y-3">
      <div className={`relative overflow-hidden rounded-2xl bg-gray-900 ${heightClassName}`}>
        {hasImages ? (
          <>
            {!activeImageFailed && activeImage ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeImage}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  {isCurrentImageLoading ? (
                    <div className="absolute inset-0 animate-pulse bg-linear-to-r from-gray-800 via-gray-700 to-gray-800" />
                  ) : null}
                  <Image
                    src={activeImage}
                    alt={`${alt} - imagen ${safeActiveIndex + 1}`}
                    fill
                    className={`object-cover transition-opacity duration-300 ${
                      isCurrentImageLoading ? "opacity-0" : "opacity-100"
                    }`}
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 70vw, 960px"
                    priority={safeActiveIndex === 0}
                    onLoad={() => setIsCurrentImageLoading(false)}
                    onError={() => {
                      if (!activeImage) return;
                      setFailedImages((previous) => ({ ...previous, [activeImage]: true }));
                      setIsCurrentImageLoading(false);
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-600">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}

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
                      onClick={() => {
                        setIsCurrentImageLoading(true);
                        setActiveIndex(index);
                      }}
                      aria-label={`Ir a imagen ${index + 1}`}
                      className={`h-2 w-2 rounded-full transition ${
                        index === safeActiveIndex ? "bg-green-400" : "bg-gray-500"
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
              onClick={() => {
                setIsCurrentImageLoading(true);
                setActiveIndex(index);
              }}
              className={`relative h-16 overflow-hidden rounded-xl border transition ${
                index === safeActiveIndex
                  ? "border-green-500"
                  : "border-gray-800 hover:border-gray-600"
              }`}
              aria-label={`Seleccionar miniatura ${index + 1}`}
            >
              <Image
                src={image}
                alt={`${alt} miniatura ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 22vw, 96px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
