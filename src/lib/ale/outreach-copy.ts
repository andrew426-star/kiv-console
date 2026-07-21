// Both templates wrap the same already-generated `hook` (see salespitch.ts)
// so the email and the landing page read as one continuous message across
// the email -> click -> page path, not two independently-worded pieces.
// Deliberately NOT a Gemini call — this needs no new reasoning, just
// formatting, so a template is more reliable and free.

export function buildOutreachEmail(params: {
  companyName: string;
  hook: string;
  landingPageUrl: string;
}): string {
  const { companyName, hook, landingPageUrl } = params;
  return [
    `Subject: A quick idea for ${companyName}`,
    "",
    hook,
    "",
    `I put together a short breakdown of how Kivaro AI could help ${companyName} specifically — take a look here: ${landingPageUrl}`,
    "",
    "Worth a quick call if it's useful?",
    "",
    "Andrew",
    "Kivaro AI",
  ].join("\n");
}

export function buildLandingPageIntro(params: { companyName: string; hook: string }): string {
  return `${params.hook} We put together a short breakdown of how Kivaro AI could help ${params.companyName} specifically.`;
}

export type VideoEmbed = { kind: "youtube" | "loom" | "vimeo" | "drive" | "direct"; src: string };

export function resolveVideoEmbed(url: string): VideoEmbed {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  if (yt) return { kind: "youtube", src: `https://www.youtube.com/embed/${yt[1]}` };

  const loom = url.match(/loom\.com\/share\/([\w-]+)/);
  if (loom) return { kind: "loom", src: `https://www.loom.com/embed/${loom[1]}` };

  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { kind: "vimeo", src: `https://player.vimeo.com/video/${vimeo[1]}` };

  return { kind: "direct", src: url };
}

// A video found by findVideoByNameInFolder (src/lib/google/drive.ts) — the
// standard iframe-embeddable preview URL for a Drive file. Requires the
// file's sharing to be "Anyone with the link can view"; otherwise the
// embed shows a permission prompt instead of the video.
export function buildDriveVideoEmbed(fileId: string): VideoEmbed {
  return { kind: "drive", src: `https://drive.google.com/file/d/${fileId}/preview` };
}
