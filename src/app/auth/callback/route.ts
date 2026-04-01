import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  let authenticated = false;

  if (code) {
    // PKCE flow — exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) authenticated = true;
  } else if (tokenHash && type) {
    // Token hash flow — verify OTP (used by invite emails)
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "invite" | "recovery" | "email",
    });
    if (!error) authenticated = true;
  }

  if (authenticated) {
    if (type === "invite" || type === "recovery") {
      return NextResponse.redirect(`${origin}/set-password`);
    }
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // If nothing worked, go to login
  return NextResponse.redirect(`${origin}/login`);
}
