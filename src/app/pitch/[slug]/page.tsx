import { cache, Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { getRows } from "@/lib/google/sheets";
import { findFolderIdByName, findVideoByNameInFolder } from "@/lib/google/drive";
import {
  SALES_PITCH_LOG_SPREADSHEET_ID,
  SALES_PITCH_LOG_TAB,
  OUTREACH_VIDEOS_DRIVE_FOLDER_NAME,
} from "@/lib/ale/spreadsheets";
import { buildDriveVideoEmbed, buildLandingPageIntro, resolveVideoEmbed, type VideoEmbed } from "@/lib/ale/outreach-copy";
import { createAdminClient } from "@/lib/supabase/admin";

// Column indices matching SALES_PITCH_LOG_HEADER in src/lib/ale/spreadsheets.ts.
const COL = { company: 0, hook: 8, landingPageUrl: 9, videoUrl: 11 } as const;

type PitchPageData = { companyName: string; hook: string; video: VideoEmbed | null } | null;

// React cache() so generateMetadata and the page body share one round trip
// per request. Deliberately does NOT log a view itself — only the page body
// does, exactly once, so metadata resolution never double-counts a view.
//
// Video resolution order: a manually-pasted URL in the sheet's Video URL
// column wins if present (YouTube/Loom/Vimeo/direct link); otherwise, live
// search the "Outreach Videos" Drive folder for a file whose name contains
// the company name — Andrew just has to drop a filmed video in there, no
// linking step required. Both paths are optional; most companies won't
// have a video yet.
const getPitchRow = cache(async (slug: string): Promise<PitchPageData> => {
  // A prospect-facing link — a broken Google connection must never crash
  // this page (no error boundary exists in this app); it's better for a
  // stale/unreachable pitch link to 404 than to show the generic Next.js
  // server-error page to someone Andrew just sent this link to.
  try {
    const accessToken = await getWorkspaceAccessToken();
    if (!accessToken) return null;

    const rows = await getRows(accessToken, SALES_PITCH_LOG_SPREADSHEET_ID, SALES_PITCH_LOG_TAB);
    const row = rows.find((r) => (r[COL.landingPageUrl] ?? "").split("/pitch/").pop() === slug);
    if (!row) return null;

    const companyName = row[COL.company] ?? "";
    const pastedVideoUrl = row[COL.videoUrl] ?? "";

    let video: VideoEmbed | null = pastedVideoUrl ? resolveVideoEmbed(pastedVideoUrl) : null;
    if (!video && companyName) {
      try {
        const folderId = await findFolderIdByName(accessToken, OUTREACH_VIDEOS_DRIVE_FOLDER_NAME);
        const match = folderId
          ? await findVideoByNameInFolder(accessToken, folderId, companyName)
          : null;
        video = match ? buildDriveVideoEmbed(match.id) : null;
      } catch (err) {
        console.error(`Drive video lookup failed for "${companyName}"`, err);
      }
    }

    return { companyName, hook: row[COL.hook] ?? "", video };
  } catch (err) {
    console.error(`Failed to load pitch row for "${slug}"`, err);
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPitchRow(slug);
  return {
    title: data ? `${data.companyName} — Kivaro AI` : "Kivaro AI",
    // These pages can carry competitively-sensitive framing — never crawlable.
    robots: { index: false, follow: false },
  };
}

// The uncached Sheets/Supabase work below has to live in its own
// Suspense-wrapped component, not directly in the page — Cache Components
// (next.config.ts's cacheComponents: true) treats any uncached async data
// access outside <Suspense> as a build error ("blocking route"), same
// reason every other dynamic page in this app (e.g. src/app/(dashboard)/
// agents/page.tsx) wraps its data-fetching component in Suspense.
async function PitchContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPitchRow(slug);
  if (!data) notFound();

  // Insert-per-view — awaited so it's recorded before the response sends,
  // but a failure here must never block the prospect from seeing the page
  // (same "don't fail the primary artifact over a secondary one" precedent
  // as generateShowcase()'s try/catch in salespitch.ts). Only fires after a
  // successful row lookup, so guessed/bad slugs never pollute the log.
  try {
    const { error } = await createAdminClient()
      .from("pitch_page_views")
      .insert({ slug, company_name: data.companyName });
    if (error) console.error(`Failed to log view for "${slug}"`, error);
  } catch (err) {
    console.error(`Failed to log view for "${slug}"`, err);
  }

  const intro = buildLandingPageIntro({ companyName: data.companyName, hook: data.hook });
  const video = data.video;

  return (
    <>
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Kivaro AI
        </p>
        <h1 className="font-heading text-2xl font-bold text-gradient-green">{data.companyName}</h1>
      </div>

      <p className="text-lg leading-relaxed">{intro}</p>

      {video ? (
        video.kind === "direct" ? (
          <video controls src={video.src} className="w-full rounded-lg border border-border/60" />
        ) : (
          <iframe
            src={video.src}
            allow="autoplay; fullscreen"
            allowFullScreen
            className="aspect-video w-full rounded-lg border border-border/60"
          />
        )
      ) : null}

      <a
        href="https://calendly.com/andrewthomas6208/onboarding-call"
        target="_blank"
        rel="noreferrer"
        className="w-fit rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Let&apos;s talk
      </a>
    </>
  );
}

function PitchSkeleton() {
  return (
    <div className="flex flex-col gap-6 opacity-0">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-24 w-full rounded bg-muted" />
    </div>
  );
}

export default function PitchPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-8">
      <Suspense fallback={<PitchSkeleton />}>
        <PitchContent params={params} />
      </Suspense>
    </main>
  );
}
