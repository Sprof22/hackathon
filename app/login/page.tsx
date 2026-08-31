"use client";

import { FormEvent, useState } from "react";
import { api } from "../lib/api";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setMessage("");
    setShowPassword(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api<{
        accessToken: string;
        user: { id: string; name: string; email: string; role: string; organizationId: string };
      }>(`/auth/${mode}`, { method: "POST", body: JSON.stringify(values) });
      localStorage.setItem("loopclose_token", result.accessToken);
      localStorage.setItem("loopclose_user", JSON.stringify(result.user));
      location.href = "/";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual" aria-label="A product team reviewing meeting commitments">
        <div className="auth-visual-content">
          <a className="auth-visual-brand" href="/">
            <span className="brand-mark" aria-hidden="true" />
            <span>LoopClose</span>
          </a>
          <div className="auth-visual-copy">
            <span className="auth-kicker">MEETINGS THAT MOVE WORK FORWARD</span>
            <h2>Turn every commitment into a verified outcome.</h2>
            <p>
              Capture ownership, follow up automatically, and keep the full decision trail visible
              to your team.
            </p>
          </div>
          <div className="auth-proof">
            <strong>Evidence-first automation</strong>
            <span>Nothing closes without a clear signal.</span>
          </div>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-wrap">
          <nav className="flow-nav auth-nav">
            <a className="flow-brand auth-form-brand" href="/">
              <span className="brand-mark" aria-hidden="true" />
              <span>LoopClose</span>
            </a>
            <button className="auth-nav-action" type="button" onClick={switchMode}>
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </nav>
          <div className="flow-heading">
            <h1>{mode === "login" ? "Welcome back" : "Create your workspace"}</h1>
            <p>
              {mode === "login"
                ? "Sign in to review your team’s commitments."
                : "Your workspace keeps your team’s meeting data private."}
            </p>
          </div>
          <form className="form-card" onSubmit={submit}>
            {mode === "register" && (
              <>
                <label className="field">
                  Full name
                  <input
                    name="name"
                    required
                    minLength={2}
                    autoComplete="name"
                    placeholder="Alex Morgan"
                  />
                </label>
                <label className="field">
                  Organization name
                  <input
                    name="organizationName"
                    required
                    minLength={2}
                    autoComplete="organization"
                    placeholder="Acme Product Team"
                  />
                </label>
              </>
            )}
            <label className="field">
              Work email
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="alex@company.com"
              />
            </label>
            <label className="field">
              Password
              <div className="password-control">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  minLength={8}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  <span
                    className={`eye-icon ${showPassword ? "visible" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </label>
            <div className="form-actions">
              <span className={`form-message ${message ? "error" : ""}`}>
                {message ||
                  (mode === "login"
                    ? "Your session is protected with a signed token."
                    : "Use at least 8 characters for your password.")}
              </span>
              <button className="primary-button" disabled={busy}>
                {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create workspace"}
              </button>
            </div>
          </form>
          <div className="auth-switch">
            <span>{mode === "login" ? "New to LoopClose?" : "Already have an account?"}</span>
            <button type="button" onClick={switchMode}>
              {mode === "login" ? "Create your account" : "Sign in instead"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
