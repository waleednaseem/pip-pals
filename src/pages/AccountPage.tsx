import { useAuth } from "@/context/AuthContext";
import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountPage({ mode }: { mode: "login" | "signup" }) {
  const { user, loading, login, signup } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  if (!loading && user) return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const message = isSignup
      ? await signup({ email, username, password })
      : await login({ login: email, password });
    setBusy(false);
    if (message) setError(message);
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Pip Pals</p>
          <h1 className="mt-1 text-2xl font-semibold">{isSignup ? "Create account" : "Log in"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your history stays with this account.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{isSignup ? "Email" : "Email or username"}</Label>
          <Input
            id="email"
            type={isSignup ? "email" : "text"}
            autoComplete={isSignup ? "email" : "username"}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        {isSignup && (
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : isSignup ? "Sign up" : "Log in"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Log in
              </Link>
            </>
          ) : (
            <>
              Need an account?{" "}
              <Link to="/signup" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
