// The three real, pre-existing Google Sheets this pipeline reads/writes —
// shared IDs and tab layouts, referenced across all three ALE stages.

export const GLE_SPREADSHEET_ID = "1GBg4tiEVJqwQdW9zxIlnVNhln7qkcuwz8z3oSoGxKo0";
export const ALE_SPREADSHEET_ID = "1iiBVFIV3qvSyqlHxGBdCRx3DlEgFKmi9P20INXmmYKs";
export const SALES_PITCH_LOG_SPREADSHEET_ID = "1YEAJ0AQpaYgK7FTGXj-qRpQWNjjgVRZkUVxsqrrQCZg";
export const SALES_PITCH_DRIVE_FOLDER_NAME = "Sales Pitches: Investment Institutions";

// Stage 1 — Geolocation Lead Engine (GLE spreadsheet)
export const MAPS_DATA_TAB = "Maps Data";
export const MAPS_DATA_HEADER = [
  "name",
  "place_id",
  "types",
  "rating",
  "address",
  "latitude",
  "longitude",
  "state",
];

export const WEBSITES_TAB = "Websites";
export const WEBSITES_HEADER = [
  "name",
  "website",
  "place_id",
  "formatted_address",
  "user_ratings_total",
  "rating",
];

export const HUNTER_TAB = "Hunter";
// "email" isn't in the original spec's Hunter column list, but the
// contact's email address has to be captured somewhere for Stage 2's
// Contacts tab ("Person Email Address") to be populated from it — added.
export const HUNTER_HEADER = [
  "place_id",
  "formatted_address",
  "name",
  "website",
  "user_ratings_total",
  "rating",
  "email",
  "first_name",
  "last_name",
  "position",
  "position_raw",
  "seniority",
  "department",
  "linkedin",
  "twitter",
  "phone_number",
];

// Stage 2 — Autonomous Lead Engine (ALE spreadsheet). Both tabs already
// existed with real data before this pipeline touched them (confirmed via
// the Sheets API, not the original spec's field list) — these headers
// match what's actually there, keyed by Company Name rather than
// place_id since that column doesn't exist in the real sheet.
export const COMPANIES_TAB = "Companies";
export const COMPANIES_HEADER = [
  "Company Name",
  "Website",
  "Location",
  "Phone",
  "Business Overview (Strategy, Capital & Scale)",
  "AUM",
  "Researched",
];

export const CONTACTS_TAB = "Contacts";
export const CONTACTS_HEADER = [
  "Company Name",
  "Website",
  "Location",
  "Phone",
  "Business Overview",
  "Contact Name",
  "Title",
  "Email",
  "LinkedIn",
  "Instagram",
  "Twitter (X)",
  "Facebook",
];

// Stage 3 — Sales Pitch Sub-Engine (Sales Pitch Log spreadsheet)
export const HISTORY_TAB = "History of Company";
export const HISTORY_HEADER = ["place_id", "Company", "Company History", "Key Achievements", "Hook"];

export const PROBLEMS_TAB = "Problems";
export const PROBLEMS_HEADER = [
  "place_id",
  "Company",
  "Problem",
  "Proposed Solution",
  "Platforms",
  "Code Languages",
  "Plan",
  "Detailed Use",
  "Demo Description",
];

export const NEW_ERA_TAB = "\"New Era\" Proposition/No Problems";
export const NEW_ERA_HEADER = ["place_id", "Company", "AI Integration Idea"];

export const SALES_PITCH_LOG_TAB = "ALE Sales Pitch Log";
export const SALES_PITCH_LOG_HEADER = [
  "place_id",
  "Company",
  "Doc URL",
  "Initial Pitch",
  "Email Variation",
  "Follow-Up Call Variation",
  "Generated At",
];
