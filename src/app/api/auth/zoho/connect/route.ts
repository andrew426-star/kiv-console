import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildZohoAuthUrl } from "@/lib/zoho/oauth";
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

  const redirectUri = new URL("/api/auth/zoho/callback", origin).toString();
  try {
    return NextResponse.redirect(buildZohoAuthUrl(redirectUri, user.id));
  } catch {
    return NextResponse.redirect(new URL("/autonomy?error=zoho_not_configured", origin));
  }
}
