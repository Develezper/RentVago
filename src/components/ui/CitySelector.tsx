"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ACTIVE_CITY_OPTIONS, type ActiveCitySlug } from "@/modules/properties/domain/geography";

const DEFAULT_STORAGE_KEY = "rentvago-selected-city";
const DEFAULT_COOKIE_KEY = "rentvago_selected_city";

interface CitySelectorProps {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  persistSelection?: boolean;
  storageKey?: string;
  cookieKey?: string;
  className?: string;
  onChange?: (value: ActiveCitySlug | "") => void;
}

const isActiveCitySlug = (value: string): value is ActiveCitySlug => {
  return ACTIVE_CITY_OPTIONS.some((city) => city.slug === value);
};

const readPersistedCity = (storageKey: string): ActiveCitySlug | "" => {
  if (typeof window === "undefined") return "";

  const persisted = window.localStorage.getItem(storageKey) ?? "";
  return isActiveCitySlug(persisted) ? persisted : "";
};

const persistCity = (value: ActiveCitySlug | "", storageKey: string, cookieKey: string): void => {
  if (typeof window === "undefined") return;

  if (value.length > 0) {
    window.localStorage.setItem(storageKey, value);
    document.cookie = `${cookieKey}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } else {
    window.localStorage.removeItem(storageKey);
    document.cookie = `${cookieKey}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
};

export function CitySelector({
  id,
  name,
  label = "Sede",
  value,
  includeAllOption = true,
  allOptionLabel = "Todas las sedes",
  persistSelection = true,
  storageKey = DEFAULT_STORAGE_KEY,
  cookieKey = DEFAULT_COOKIE_KEY,
  className,
  onChange,
}: CitySelectorProps) {
  const [internalValue, setInternalValue] = useState<ActiveCitySlug | "">(() => {
    if (typeof value === "string") {
      return isActiveCitySlug(value) ? value : "";
    }

    if (!persistSelection) return "";
    return readPersistedCity(storageKey);
  });

  useEffect(() => {
    if (typeof value !== "string") return;
    setInternalValue(isActiveCitySlug(value) ? value : "");
  }, [value]);

  useEffect(() => {
    if (!persistSelection) return;
    if (typeof value === "string" && value.trim().length > 0) return;

    const persisted = readPersistedCity(storageKey);
    if (persisted.length === 0 || persisted === internalValue) return;

    setInternalValue(persisted);
    onChange?.(persisted);
  }, [internalValue, onChange, persistSelection, storageKey, value]);

  const selectedValue = useMemo(() => {
    if (typeof value === "string") {
      return isActiveCitySlug(value) ? value : "";
    }

    return internalValue;
  }, [internalValue, value]);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextValue = event.target.value;
    const resolvedValue: ActiveCitySlug | "" = isActiveCitySlug(nextValue) ? nextValue : "";

    if (typeof value !== "string") {
      setInternalValue(resolvedValue);
    }

    if (persistSelection) {
      persistCity(resolvedValue, storageKey, cookieKey);
    }

    onChange?.(resolvedValue);
  };

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-500"
      >
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={selectedValue}
        onChange={handleChange}
        className="h-11 w-full rounded-2xl border border-gray-800 bg-gray-900 px-3 text-sm font-medium text-white outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-500"
      >
        {includeAllOption ? <option value="">{allOptionLabel}</option> : null}
        {ACTIVE_CITY_OPTIONS.map((city) => (
          <option key={city.slug} value={city.slug}>
            {city.name}
          </option>
        ))}
      </select>
    </div>
  );
}
