import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleAuthUrl } from "@/lib/calendar/google";
import { getPublicOrigin } from "@/lib/origin";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const origin = getPublicOrigin(request);

  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const redirectUri = new URL("/api/auth/google/callback", origin).toString();
  return NextResponse.redirect(buildGoogleAuthUrl(redirectUri, user.id));
}
