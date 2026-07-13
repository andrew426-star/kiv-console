import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { ensureTabExists, appendRows, getColumnValues } from "@/lib/google/sheets";
import { GLE_SPREADSHEET_ID, MAPS_DATA_TAB, MAPS_DATA_HEADER, WEBSITES_TAB, WEBSITES_HEADER } from "./spreadsheets";

type PlaceResult = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  websiteUri?: string;
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  location?: { latitude: number; longitude: number };
  addressComponents?: Array<{ shortText: string; longText: string; types: string[] }>;
};

function extractState(place: PlaceResult): string {
  const component = place.addressComponents?.find((c) =>
    c.types.includes("administrative_area_level_1"),
  );
  return component?.shortText ?? "";
}

async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is not configured");

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.types,places.rating,places.userRatingCount,places.location,places.addressComponents",
    },
    body: JSON.stringify({ textQuery: query }),
  });
  if (!res.ok) throw new Error(`Places search failed: ${await res.text()}`);
  const data = (await res.json()) as { places?: PlaceResult[] };
  return data.places ?? [];
}

export type DiscoveryResult = { totalFound: number; newlyAdded: number };

// Stage 1a/1b — Places Text Search, written into the GLE spreadsheet's
// "Maps Data" and "Websites" tabs. Dedupes against place_ids already
// present so re-running (or the daily job) never creates duplicate rows.
export async function discoverCompanies(query: string): Promise<DiscoveryResult> {
  const accessToken = await getWorkspaceAccessToken();
  if (!accessToken) throw new Error("Google account not connected");

  await ensureTabExists(accessToken, GLE_SPREADSHEET_ID, MAPS_DATA_TAB, MAPS_DATA_HEADER);
  await ensureTabExists(accessToken, GLE_SPREADSHEET_ID, WEBSITES_TAB, WEBSITES_HEADER);

  const [places, existingPlaceIds] = await Promise.all([
    searchPlaces(query),
    getColumnValues(accessToken, GLE_SPREADSHEET_ID, MAPS_DATA_TAB, "B"),
  ]);
  const existing = new Set(existingPlaceIds);
  const newPlaces = places.filter((p) => !existing.has(p.id));

  const mapsRows = newPlaces.map((p) => [
    p.displayName?.text ?? "",
    p.id,
    (p.types ?? []).join(", "),
    p.rating ?? "",
    p.formattedAddress ?? "",
    p.location?.latitude ?? "",
    p.location?.longitude ?? "",
    extractState(p),
  ]);
  await appendRows(accessToken, GLE_SPREADSHEET_ID, MAPS_DATA_TAB, mapsRows);

  const websiteRows = newPlaces
    .filter((p) => p.websiteUri)
    .map((p) => [
      p.displayName?.text ?? "",
      p.websiteUri ?? "",
      p.id,
      p.formattedAddress ?? "",
      p.userRatingCount ?? "",
      p.rating ?? "",
    ]);
  await appendRows(accessToken, GLE_SPREADSHEET_ID, WEBSITES_TAB, websiteRows);

  return { totalFound: places.length, newlyAdded: newPlaces.length };
}
