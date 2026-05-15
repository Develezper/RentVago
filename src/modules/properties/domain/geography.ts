export const CITY_CATALOG = [
  {
    slug: "medellin",
    name: "Medellin",
    aliases: ["medellin", "medellín"],
  },
  {
    slug: "sabaneta",
    name: "Sabaneta",
    aliases: ["sabaneta"],
  },
  {
    slug: "envigado",
    name: "Envigado",
    aliases: ["envigado"],
  },
  {
    slug: "bogota",
    name: "Bogota",
    aliases: ["bogota", "bogotá"],
  },
  {
    slug: "cali",
    name: "Cali",
    aliases: ["cali"],
  },
  {
    slug: "cartagena",
    name: "Cartagena",
    aliases: ["cartagena"],
  },
] as const;

export type CitySlug = (typeof CITY_CATALOG)[number]["slug"];
export type CityName = (typeof CITY_CATALOG)[number]["name"];
export type CityDefinition = (typeof CITY_CATALOG)[number];

export const ACTIVE_CITY_SLUGS = ["medellin", "sabaneta", "envigado"] as const;
export type ActiveCitySlug = (typeof ACTIVE_CITY_SLUGS)[number];
export type ActiveCityDefinition = Extract<CityDefinition, { slug: ActiveCitySlug }>;

const ACTIVE_CITY_SLUG_SET: ReadonlySet<string> = new Set(ACTIVE_CITY_SLUGS);

const normalizeCityValue = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

export const isActiveCitySlug = (value: string): value is ActiveCitySlug => {
  return ACTIVE_CITY_SLUG_SET.has(value);
};

export const resolveCityByInput = (value: string): CityDefinition | null => {
  const normalized = normalizeCityValue(value);
  if (normalized.length === 0) return null;

  for (const city of CITY_CATALOG) {
    if (normalizeCityValue(city.slug) === normalized) return city;
    if (normalizeCityValue(city.name) === normalized) return city;
    if (city.aliases.some((alias) => normalizeCityValue(alias) === normalized)) {
      return city;
    }
  }

  return null;
};

export const resolveActiveCityByInput = (value: string): ActiveCityDefinition | null => {
  const city = resolveCityByInput(value);
  if (!city || !isActiveCitySlug(city.slug)) return null;
  return city as ActiveCityDefinition;
};

export const getCityBySlug = (slug: string): CityDefinition | null => {
  return CITY_CATALOG.find((city) => city.slug === slug) ?? null;
};

export const ACTIVE_CITY_OPTIONS: ReadonlyArray<ActiveCityDefinition> = CITY_CATALOG.filter(
  (city): city is ActiveCityDefinition => isActiveCitySlug(city.slug),
);
