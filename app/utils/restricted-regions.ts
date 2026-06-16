import { getRuntimeConfigArray } from "@/utils/runtime-config";

export type IpLocationInfo = {
  ip?: string;
  city?: string;
  region?: string;
  regionCode?: string;
  region_code?: string;
  country?: string;
  countryCode?: string;
  country_code?: string;
  country_name?: string;
};

type RestrictedCountryCity = {
  country: string;
  city: string;
};

const COUNTRY_CITY_SEPARATOR = /\s*[-:/]\s*/;

const normalizeLocation = (value?: string) =>
  (value || "").trim().replace(/[\s._-]+/g, "").toLowerCase();

const getCountryCandidates = (ipInfo: IpLocationInfo) => [
  ipInfo.country,
  ipInfo.countryCode,
  ipInfo.country_code,
  ipInfo.country_name,
  ipInfo.region,
];

const parseRestrictedCountryCity = (
  value: string
): RestrictedCountryCity | null => {
  const [country, ...cityParts] = value.split(COUNTRY_CITY_SEPARATOR);
  const city = cityParts.join(" ").trim();

  if (!country?.trim() || !city) {
    return null;
  }

  return {
    country: country.trim(),
    city,
  };
};

export function getRestrictedRegions(): string[] {
  return getRuntimeConfigArray("VITE_RESTRICTED_REGIONS");
}

export function getRestrictedCountryCities(): RestrictedCountryCity[] {
  return getRuntimeConfigArray("VITE_RESTRICTED_COUNTRY_CITIES")
    .map(parseRestrictedCountryCity)
    .filter((item): item is RestrictedCountryCity => Boolean(item));
}

export function isCountryCityRestricted(
  ipInfo: IpLocationInfo,
  restrictedCountryCities = getRestrictedCountryCities()
) {
  const city = normalizeLocation(ipInfo.city);
  const countryCandidates = getCountryCandidates(ipInfo).map(normalizeLocation);

  if (!city || countryCandidates.length === 0) {
    return false;
  }

  return restrictedCountryCities.some((item) => {
    return (
      normalizeLocation(item.city) === city &&
      countryCandidates.includes(normalizeLocation(item.country))
    );
  });
}
