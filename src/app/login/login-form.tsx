"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Handle hash token from invite/magic link landing on login page
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      // Supabase client auto-detects the hash and sets the session
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          // Check if this is an invite (user may need to set password)
          const type = new URLSearchParams(hash.substring(1)).get("type");
          if (type === "invite" || type === "recovery") {
            router.push("/set-password");
          } else {
            router.push("/dashboard");
          }
          router.refresh();
        }
      });
    }
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMagicLinkSent(true);
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setResetSent(true);
  }

  if (resetSent) {
    return (
      <div className="rounded-lg border p-6 text-center space-y-2">
        <p className="text-sm font-medium">Check your email</p>
        <p className="text-sm text-muted-foreground">
          We sent a password reset link to <strong>{email}</strong>.
          Click the link in the email to set a new password.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setResetSent(false); setShowForgot(false); }}
        >
          Back to login
        </Button>
      </div>
    );
  }

  if (magicLinkSent) {
    return (
      <div className="rounded-lg border p-6 text-center space-y-2">
        <p className="text-sm font-medium">Check your email</p>
        <p className="text-sm text-muted-foreground">
          We sent a magic link to <strong>{email}</strong>.
          Click the link in the email to sign in.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMagicLinkSent(false)}
        >
          Back to login
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      {showForgot ? (
        <div className="space-y-3 pt-1">
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send a link to reset your password.
          </p>
          <Button
            className="w-full"
            onClick={handleForgotPassword}
            disabled={loading || !email}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setShowForgot(false)}
          >
            Back to login
          </Button>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:underline w-full text-center"
            onClick={() => setShowForgot(true)}
          >
            Forgot password?
          </button>

          <Separator />

          <Button
            variant="outline"
            className="w-full"
            onClick={handleMagicLink}
            disabled={loading}
          >
            Sign in with magic link
          </Button>
        </>
      )}
    </div>
  );
}
