"use client";
import { FormEvent, useState } from "react";
import { api } from "../../lib/api";

export default function NewMeeting() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Processing transcript…");
    setError(false);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      const result = await api<{ items: unknown[]; verification: unknown[] }>("/meetings", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setMessage(
        `Done — extracted ${result.items.length} commitment(s) and checked ${result.verification.length} open item(s).`
      );
      form.reset();
    } catch (err) {
      setError(true);
      setMessage(err instanceof Error ? err.message : "Processing failed");
    }
  }
  return (
    <main className="flow-page">
      <div className="flow-wrap">
        <nav className="flow-nav">
          <a className="flow-brand" href="/">
            LoopClose
          </a>
          <a href="/">← Dashboard</a>
        </nav>
        <div className="flow-heading">
          <h1>Process a meeting</h1>
          <p>
            Add a transcript. LoopClose will check existing commitments before extracting new ones.
          </p>
        </div>
        <form className="form-card" onSubmit={submit}>
          <div className="form-row">
            <label className="field">
              Meeting title
              <input name="title" required placeholder="Weekly product sync" />
            </label>
            <label className="field">
              Meeting date
              <input name="meetingDate" required type="date" defaultValue="2026-08-30" />
            </label>
          </div>
          <label className="field">
            Transcript
            <textarea
              name="transcript"
              required
              minLength={20}
              placeholder={
                "Sarah: I finished the checkout retry fix and it is now shipped.\nMarcus: I’ll publish the onboarding brief by September 2."
              }
            />
          </label>
          <div className="form-actions">
            <span className={`form-message ${error ? "error" : ""}`}>
              {message || "Only explicit, attributable commitments are extracted."}
            </span>
            <button className="primary-button">Process meeting</button>
          </div>
        </form>
      </div>
    </main>
  );
}
