"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import BoxManager from "./BoxManager";

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }
    const sb = getBrowserSupabase();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <Shell>
        <div className="rounded-xl border border-line bg-white p-6 text-center text-muted">
          Supabase לא מוגדר. הוסיפו את משתני הסביבה{" "}
          <code className="text-ink">NEXT_PUBLIC_SUPABASE_URL</code> ו-
          <code className="text-ink">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ואז רעננו.
        </div>
      </Shell>
    );
  }

  if (!ready) {
    return (
      <Shell>
        <div className="py-10 text-center text-muted">טוען…</div>
      </Shell>
    );
  }

  return (
    <Shell>
      {session ? (
        <BoxManager
          session={session}
          onSignOut={() => getBrowserSupabase().auth.signOut()}
        />
      ) : (
        <LoginForm />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8">
      <h1 className="mb-6 text-center text-2xl font-bold">ניהול קטלוג OXO POP</h1>
      {children}
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await getBrowserSupabase().auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) setError("פרטי התחברות שגויים");
  };

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex max-w-sm flex-col gap-3 rounded-xl border border-line bg-white p-6"
    >
      <div className="text-center text-muted">התחברות מנהל</div>
      <input
        type="email"
        placeholder="אימייל"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="rounded-md border border-line px-3 py-2 outline-none focus:border-brand"
      />
      <input
        type="password"
        placeholder="סיסמה"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="rounded-md border border-line px-3 py-2 outline-none focus:border-brand"
      />
      {error && <div className="text-sm text-brand">{error}</div>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-brand py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {busy ? "מתחבר…" : "התחברות"}
      </button>
    </form>
  );
}
