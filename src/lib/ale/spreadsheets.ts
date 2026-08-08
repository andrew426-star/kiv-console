// The three real, pre-existing Google Sheets this pipeline reads/writes —
// shared IDs and tab layouts, referenced across all three ALE stages.

export const GLE_SPREADSHEET_ID = "1GBg4tiEVJqwQdW9zxIlnVNhln7qkcuwz8z3oSoGxKo0";
export const ALE_SPREADSHEET_ID = "1iiBVFIV3qvSyqlHxGBdCRx3DlEgFKmi9P20INXmmYKs";
export const SALES_PITCH_LOG_SPREADSHEET_ID = "1YEAJ0AQpaYgK7FTGXj-qRpQWNjjgVRZkUVxsqrrQCZg";
export const SALES_PITCH_DRIVE_FOLDER_NAME = "Sales Pitches: Investment Institutions";
export const SHOWCASE_DRIVE_FOLDER_NAME = "Client Showcases";
// Andrew's manually-filmed per-company outreach videos land here, named
// with the company name somewhere in the file name (e.g. "Trive Capital -
// outreach.mp4") — generateSalesPitch() (salespitch.ts) looks these up by
// name and links directly to the video in the outreach email, no manual
// linking step needed.
export const OUTREACH_VIDEOS_DRIVE_FOLDER_NAME = "Outreach Videos";

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

// Stage 3 — Sales Pitch Sub-Engine (Sales Pitch Log spreadsheet). All three
// of these tabs already existed (header row only, no data yet) with a
// different, richer schema than the original spec's field list — matching
// what's actually there, same as Stage 2's lesson. No place_id column
// anywhere in this spreadsheet either.
export const HISTORY_TAB = "History of Company";
export const HISTORY_HEADER = ["Company", "Company History", "Key Achievements", "Hook"];

export const PROBLEMS_TAB = "Problems";
export const PROBLEMS_HEADER = [
  "Company",
  "Source URL",
  "Date",
  "Operational Pain Point",
  "Proposed AI/No-Code Solution",
];

export const NEW_ERA_TAB = "\"New Era\" Proposition/No Problems";
export const NEW_ERA_HEADER = [
  "Company",
  "Strategic Opportunity",
  "Use Case",
  "Architecture",
  "Components",
  "Demo Setup",
  "Live Demo Script",
  "Pre-Built vs Build Live",
  "Benefit",
];

// This tab didn't exist yet (unlike the three above) — designed to match
// the same Company-Name-keyed convention as everything else in these
// spreadsheets.
export const SALES_PITCH_LOG_TAB = "ALE Sales Pitch Log";
// "Showcase Doc URL" appended at the end (not inserted before "Generated
// At") so existing rows just show a blank there rather than shifting every
// column after it — same lesson as the earlier Demo Setup header fix.
// "Hook"/"Outreach Email"/"Video URL" appended the same way — Hook is
// duplicated from HISTORY_TAB so this row stays self-contained; Video URL
// is pre-filled if a matching video already exists in the Outreach Videos
// Drive folder at generation time, otherwise left blank for Andrew to paste
// in manually once he films/uploads one. Outreach no longer routes through
// a personalized landing page — the video (once it exists) is linked
// directly in the email itself. "Email Sent At" appended last — blank
// until Pipeline's outreach-send tool actually sends this row's email,
// then holds the real send timestamp; also the duplicate-send guard (a
// populated value means don't send again).
// "Outreach Queued At" appended last, same append-never-insert convention
// as everything above — blank until Andrew arms a company for the hourly
// outreach drip (src/lib/ale/outreach-drip.ts), then holds the time it was
// queued. A row with this populated and "Email Sent At" still blank is
// what the drip works through; clearing this cell by hand cancels a
// queued send.
export const SALES_PITCH_LOG_HEADER = [
  "Company",
  "Doc URL",
  "Initial Pitch",
  "Email Variation",
  "Follow-Up Call Variation",
  "Demo Setup",
  "Generated At",
  "Showcase Doc URL",
  "Hook",
  "Outreach Email",
  "Video URL",
  "Email Sent At",
  "Outreach Queued At",
];

// Column indices into SALES_PITCH_LOG_HEADER above, shared by everything
// that reads/writes a specific cell (rather than each call site
// hand-deriving the same numbers) — getRows() returns rows starting at
// sheet row 2 (header excluded), so array index i is sheet row i + 2.
//
// "Email Variation" is the source of truth for what actually gets sent:
// it's the full-length pitch email the generator writes, and the short
// "quick idea" template that used to override it is gone. "Outreach
// Email" is now just the send-ready rendering of it, stored so the Doc
// and the sheet show the same text a recipient will get.
export const EMAIL_VARIATION_COL = 3;
export const OUTREACH_EMAIL_COL = 9;
export const VIDEO_URL_COL = 10;
export const EMAIL_SENT_AT_COL = 11;
export const EMAIL_SENT_AT_COLUMN_LETTER = "L";
export const OUTREACH_QUEUED_AT_COL = 12;
export const OUTREACH_QUEUED_AT_COLUMN_LETTER = "M";
