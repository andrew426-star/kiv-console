// Real design system pulled directly from the kivaroai.com marketing site's
// source (tailwind.config.ts, src/index.css, index.html, real hero copy) —
// not guessed or generic. Given to the agents actually responsible for
// Kivaro AI's and Andrew's brand image (see CREATIVE_BRAND_AGENTS below)
// so anything they propose — visuals, copy, captions, ad concepts — stays
// consistent with the real brand instead of a generic AI-startup look.
export const KIVARO_BRAND_PALETTE = `KIVARO AI'S REAL BRAND DESIGN SYSTEM (from kivaroai.com — ground any visual or written brand work in this, not a generic AI-startup look):

Colors — dark mode only, HSL, a "HUD green" palette:
- Background: near-black with a green tint (hsl(150 20% 4%))
- Primary/signature color: emerald green (hsl(152 76% 46%)) — used for glows, borders, primary buttons
- Mint accent (hsl(162 72% 55%)), lime accent (hsl(82 80% 55%)), deep emerald (hsl(155 50% 15%)) for depth/variation
- Emphasis headlines often use a diagonal gradient sweeping green -> mint -> lime as gradient text

Typography (both Google Fonts):
- Syne — headlines/display text, bold to extrabold weights, tight tracking on large text, wide uppercase tracking for small "eyebrow" labels
- Outfit — body copy, light-to-medium weights

Visual frame/motifs — a "HUD / command console" aesthetic:
- Subtle glowing green borders on cards/panels that intensify on hover
- Faint background grid-line patterns
- Thin animated "scan line" sweeps
- Glass-morphism: blurred, translucent panel surfaces
- Soft film-grain/noise texture overlays
- Generous rounded corners, staggered fade-up entrance animations
- Deliberately avoids generic "robot"/sci-fi AI clichés — leans into precision, discipline, and institutional sophistication instead

Writing voice:
- Confident, precise, institutional — written for a sophisticated hedge-fund/finance audience, not a general consumer one
- Short, declarative headline fragments (real example: "Intelligent Systems. Disciplined Execution.")
- Body copy is benefit-forward and specific, using real finance/ops vocabulary (due diligence, NAV, reconciliation, decision infrastructure) — never hypey or vague
- CTAs are direct action verbs (real examples: "Schedule Discovery Call", "Explore Services")
- Tagline: "AI Automation & Intelligence for Hedge Funds"`;

// Canvas (Andrew's personal brand) and Broadcast (Kivaro AI's brand) are
// the two agents explicitly in charge of brand image/promotion.
export const CREATIVE_BRAND_AGENTS = new Set(["canvas", "broadcast"]);
