import { Link } from "react-router-dom";
import { useState } from "react";

type Mode = "login" | "signup";

export default function AuthForm({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isLogin = mode === "login";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!email.trim() || !password.trim()) {
      setMessage("Enter email and password.");
      return;
    }
    if (!isLogin && !name.trim()) {
      setMessage("Enter your name.");
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    setBusy(false);
    setMessage(
      isLogin
        ? "Login will connect to the account API soon. Your tools still work without an account."
        : "Sign up will connect to the account API soon. You can use every tool free without signing up."
    );
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-[var(--gray-border)] bg-white p-6 shadow-[var(--shadow-md)] sm:p-8">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">
          {isLogin ? "Log in" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-[var(--gray-muted)]">
          {isLogin
            ? "Welcome back to File Studio."
            : "Free forever — no credit card needed."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {!isLogin && (
            <label className="block text-sm font-medium">
              Name
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--gray-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
                placeholder="Your name"
              />
            </label>
          )}
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--gray-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
              placeholder="you@example.com"
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--gray-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
              placeholder="••••••••"
            />
          </label>

          {message && (
            <p className="rounded-lg bg-[var(--brand-soft)] px-3 py-2 text-sm text-[var(--brand-dark)]">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-[6px] bg-[var(--brand)] py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-dark)] disabled:opacity-60"
          >
            {busy ? "Please wait…" : isLogin ? "Log in" : "Sign up free"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[var(--gray-muted)]">
          {isLogin ? (
            <>
              Don&apos;t have an account?{" "}
              <Link
                to="/studio/signup"
                className="font-semibold text-[var(--brand)] hover:underline"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link
                to="/studio/login"
                className="font-semibold text-[var(--brand)] hover:underline"
              >
                Log in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
