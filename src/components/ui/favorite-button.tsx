"use client";

import { useState } from "react";

interface FavoriteToggleResponse {
  data?: {
    propertyId: string;
    isFavorite: boolean;
  };
  error?: string;
}

interface FavoriteButtonProps {
  propertyId: string;
  initialIsFavorite: boolean;
  className?: string;
  onToggle?: (isFavorite: boolean) => void;
}

export function FavoriteButton({
  propertyId,
  initialIsFavorite,
  className,
  onToggle,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState<boolean>(initialIsFavorite);
  const [isPending, setIsPending] = useState<boolean>(false);

  const handleClick = async (): Promise<void> => {
    if (isPending) return;

    const previousValue = isFavorite;
    const optimisticValue = !previousValue;
    setIsFavorite(optimisticValue);
    setIsPending(true);

    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ propertyId }),
      });

      const payload: FavoriteToggleResponse = await response.json();

      if (!response.ok || !payload.data) {
        setIsFavorite(previousValue);
        return;
      }

      setIsFavorite(payload.data.isFavorite);
      onToggle?.(payload.data.isFavorite);
    } catch {
      setIsFavorite(previousValue);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
        isFavorite
          ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
          : "border-gray-700 bg-gray-900 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
      } disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-4 w-4 ${isFavorite ? "fill-current" : "fill-none"}`}
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M12 21s-6.7-4.35-9.33-8.35A5.5 5.5 0 0 1 12 5.16a5.5 5.5 0 0 1 9.33 7.49C18.7 16.65 12 21 12 21z" />
      </svg>
    </button>
  );
}
