"use client";

import { useEffect } from "react";
import { toast } from "sonner";

interface WelcomeCityToastProps {
  cityName: string;
  citySlug: string;
  todayNewOffers: number;
}

const keyForCity = (citySlug: string): string => `rentvago_welcome_city_${citySlug}`;

export function WelcomeCityToast({ cityName, citySlug, todayNewOffers }: WelcomeCityToastProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storageKey = keyForCity(citySlug);
    const seenWelcomeToast = window.localStorage.getItem(storageKey);
    if (seenWelcomeToast) return;

    window.localStorage.setItem(storageKey, new Date().toISOString());

    toast.success(
      `Bienvenido a RentVago ${cityName}. Tenemos ${Math.max(0, todayNewOffers)} nuevas ofertas para ti hoy.`,
    );
  }, [cityName, citySlug, todayNewOffers]);

  return null;
}
