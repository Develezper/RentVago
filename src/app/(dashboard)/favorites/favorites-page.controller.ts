"use client";

import { useCallback, useEffect, useState } from "react";
import { FavoriteItem, favoritesResponseSchema } from "./favorites-page.shared";

const defaultFavoritesError = "No fue posible cargar tus favoritos.";

const extractApiError = (payload: unknown, fallbackMessage: string): string => {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return fallbackMessage;
};

export function useFavoritesPageController() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const loadFavorites = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/favorites", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setErrorMessage(extractApiError(payload, defaultFavoritesError));
        setFavorites([]);
        return;
      }

      const parsed = favoritesResponseSchema.parse(payload);
      setFavorites(parsed.data);
    } catch {
      setErrorMessage("Error de red o respuesta invalida del servidor.");
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadFavorites();
    }, 0);

    return () => clearTimeout(timeout);
  }, [loadFavorites]);

  const handleToggle = useCallback((propertyId: string, isFavorite: boolean): void => {
    if (!isFavorite) {
      setFavorites((previous) =>
        previous.filter((favorite) => favorite.propertyId !== propertyId),
      );
    }
  }, []);

  return { favorites, isLoading, errorMessage, handleToggle };
}
