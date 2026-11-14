// Afstand tussen woonplaats en bedrijf, met de gratis PDOK Locatieserver (overheid, alleen Nederland).
const PDOK = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free";
const cache = new Map();

// Geeft { lat, lon } van een plaats, postcode of adres, of null.
export async function coordinaten(q) {
  const key = String(q || "").trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);
  try {
    const url = `${PDOK}?q=${encodeURIComponent(q)}&rows=1&fl=centroide_ll,weergavenaam,type`;
    const res = await fetch(url, { cache: "force-cache" });
    const json = await res.json();
    const doc = json?.response?.docs?.[0];
    const m = doc?.centroide_ll?.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    const punt = m ? { lon: Number(m[1]), lat: Number(m[2]) } : null;
    cache.set(key, punt);
    return punt;
  } catch {
    return null;
  }
}

// Hemelsbrede afstand in km
export function km(a, b) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Ruwe schatting van de reistijd op basis van de afstand
export function reistijd(afstand) {
  if (afstand == null) return "";
  if (afstand <= 7) return `± ${Math.max(5, Math.round(afstand * 4))} min fietsen`;
  if (afstand <= 15) return `± ${Math.round(afstand * 2 + 5)} min met de bus of ${Math.round(afstand * 4)} min fietsen`;
  return `± ${Math.round(afstand * 1.6 + 10)} min met het OV`;
}

export async function afstandTussen(woonplaats, adres) {
  const [a, b] = await Promise.all([coordinaten(woonplaats), coordinaten(adres)]);
  if (!a || !b) return null;
  return Math.round(km(a, b) * 10) / 10;
}
