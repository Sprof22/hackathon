"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";

type GoogleMeetStatus = {
  configured: boolean;
  connected: boolean;
  googleEmail: string | null;
  lastImportedAt: string | null;
};

type ImportResult = {
  meeting?: { id: string; title: string; meetingDate: string };
  items: unknown[];
  verification: unknown[];
  speakers?: number;
  transcriptEntries?: number;
};

type ImportSummary = {
  source: "google" | "manual";
  title: string;
  commitments: number;
  checked: number;
  speakers?: number;
  transcriptEntries?: number;
};

export default function NewMeeting() {
  const [meet, setMeet] = useState<GoogleMeetStatus | null>(null);
  const [canConnect, setCanConnect] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  useEffect(() => {
    const roleTimer = window.setTimeout(() => {
      try {
        const user = JSON.parse(localStorage.getItem("loopclose_user") || "{}") as {
          role?: string;
        };
        setCanConnect(user.role === "owner");
      } catch {
        setCanConnect(false);
      }
    }, 0);

    api<GoogleMeetStatus>("/integrations/google-meet/status")
      .then(setMeet)
      .catch((error) =>
        setFeedback({
          type: "error",
          text: error instanceof Error ? error.message : "Could not check Google Meet status.",
        })
      )
      .finally(() => setLoadingStatus(false));
    return () => window.clearTimeout(roleTimer);
  }, []);

  async function connectGoogleMeet() {
    setGoogleBusy(true);
    setFeedback({ type: "info", text: "Opening Google authorization…" });
    try {
      const { url } = await api<{ url: string }>("/integrations/google-meet/auth-url");
      location.href = url;
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Could not start Google connection.",
      });
      setGoogleBusy(false);
    }
  }

  async function importLatestMeet() {
    setGoogleBusy(true);
    setSummary(null);
    setFeedback({
      type: "info",
      text: "Finding the latest completed meeting and processing its transcript…",
    });
    try {
      const result = await api<ImportResult>("/integrations/google-meet/import-latest", {
        method: "POST",
      });
      setSummary({
        source: "google",
        title: result.meeting?.title ?? "Latest Google Meet",
        commitments: result.items.length,
        checked: result.verification.length,
        speakers: result.speakers,
        transcriptEntries: result.transcriptEntries,
      });
      setFeedback(null);
      setMeet((current) =>
        current ? { ...current, lastImportedAt: new Date().toISOString() } : current
      );
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Could not import the latest Google Meet.",
      });
    } finally {
      setGoogleBusy(false);
    }
  }

  async function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setManualBusy(true);
    setSummary(null);
    setFeedback({ type: "info", text: "Processing the pasted transcript…" });
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      const result = await api<ImportResult>("/meetings", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setSummary({
        source: "manual",
        title: String(values.title),
        commitments: result.items.length,
        checked: result.verification.length,
      });
      setFeedback(null);
      form.reset();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Could not process this transcript.",
      });
    } finally {
      setManualBusy(false);
    }
  }

  const connectionLabel = loadingStatus
    ? "Checking connection"
    : meet?.connected
      ? "Google Meet connected"
      : "Google Meet not connected";

  return (
    <main className="flow-page meeting-import-page">
      <div className="flow-wrap meeting-import-wrap">
        <nav className="flow-nav meeting-import-nav">
          <Link className="flow-brand" href="/">
            <span className="brand-mark" aria-hidden="true" />
            <span>LoopClose</span>
          </Link>
          <Link href="/">← Dashboard</Link>
        </nav>

        <header className="meeting-import-heading">
          <span className="meeting-eyebrow">Meeting ingestion</span>
          <h1>Bring the meeting in. We’ll handle the follow-through.</h1>
          <p>
            Import a completed Google Meet transcript, verify existing commitments, and capture new
            action items with their original evidence.
          </p>
        </header>

        <section className={`meet-import-card ${meet?.connected ? "is-connected" : ""}`}>
          <div className="meet-import-topline">
            <div className="google-meet-lockup">
              <span className="google-meet-icon" aria-hidden="true">
                <i />
              </span>
              <div>
                <span className="integration-kicker">Recommended</span>
                <h2>Import from Google Meet</h2>
              </div>
            </div>
            <span className={`meet-status ${meet?.connected ? "connected" : ""}`}>
              <i aria-hidden="true" />
              {connectionLabel}
            </span>
          </div>

          <div className="meet-import-body">
            <div className="meet-import-copy">
              <h3>Your latest transcript, processed in one step</h3>
              <p>
                LoopClose finds the latest completed transcript generated by Google Meet. No
                copying, downloading, or reformatting required.
              </p>
              <ol className="import-steps" aria-label="Import process">
                <li>
                  <span>1</span>
                  Find the latest completed meeting
                </li>
                <li>
                  <span>2</span>
                  Attribute transcript entries to speakers
                </li>
                <li>
                  <span>3</span>
                  Verify and extract commitments
                </li>
              </ol>
            </div>

            <aside className="meet-import-action">
              {loadingStatus ? (
                <div className="connection-skeleton" aria-label="Loading Google Meet status" />
              ) : !meet?.configured ? (
                <>
                  <span className="action-label">Setup required</span>
                  <strong>Google OAuth is not configured</strong>
                  <p>Add the Google credentials to the backend environment before connecting.</p>
                  <Link className="secondary-button button-link" href="/organization">
                    View integration setup
                  </Link>
                </>
              ) : meet.connected ? (
                <>
                  <span className="action-label">Connected account</span>
                  <strong>{meet.googleEmail || "Google Workspace"}</strong>
                  <p>
                    {meet.lastImportedAt
                      ? `Last imported ${new Date(meet.lastImportedAt).toLocaleString()}`
                      : "Ready for your first transcript import."}
                  </p>
                  <button
                    className="primary-button meet-import-button"
                    onClick={importLatestMeet}
                    disabled={googleBusy}
                  >
                    {googleBusy ? (
                      <>
                        <span className="button-spinner" aria-hidden="true" /> Processing meeting…
                      </>
                    ) : (
                      <>
                        Import latest meeting <span aria-hidden="true">→</span>
                      </>
                    )}
                  </button>
                  <small>Only completed transcripts are available to import.</small>
                </>
              ) : (
                <>
                  <span className="action-label">One-time connection</span>
                  <strong>Connect your workspace</strong>
                  <p>Read-only access lets LoopClose retrieve completed Meet transcripts.</p>
                  {canConnect ? (
                    <button
                      className="primary-button meet-import-button"
                      onClick={connectGoogleMeet}
                      disabled={googleBusy}
                    >
                      {googleBusy ? "Opening Google…" : "Connect Google Meet"}
                    </button>
                  ) : (
                    <Link className="secondary-button button-link" href="/organization">
                      Ask an owner to connect
                    </Link>
                  )}
                  <small>LoopClose never receives your Google password.</small>
                </>
              )}
            </aside>
          </div>
        </section>

        {feedback ? (
          <div className={`import-feedback ${feedback.type}`} role="status">
            <span aria-hidden="true">{feedback.type === "error" ? "!" : "↻"}</span>
            <p>{feedback.text}</p>
          </div>
        ) : null}

        {summary ? (
          <section className="import-success" aria-live="polite">
            <div className="success-icon" aria-hidden="true">
              ✓
            </div>
            <div className="success-copy">
              <span>
                {summary.source === "google" ? "Google Meet imported" : "Transcript processed"}
              </span>
              <h2>{summary.title}</h2>
              <p>The meeting is now part of your organization’s follow-through history.</p>
            </div>
            <dl className="success-metrics">
              {summary.transcriptEntries !== undefined ? (
                <div>
                  <dt>Transcript entries</dt>
                  <dd>{summary.transcriptEntries}</dd>
                </div>
              ) : null}
              {summary.speakers !== undefined ? (
                <div>
                  <dt>Speakers</dt>
                  <dd>{summary.speakers}</dd>
                </div>
              ) : null}
              <div>
                <dt>New commitments</dt>
                <dd>{summary.commitments}</dd>
              </div>
              <div>
                <dt>Existing items checked</dt>
                <dd>{summary.checked}</dd>
              </div>
            </dl>
            <Link className="primary-button button-link" href="/">
              Review dashboard
            </Link>
          </section>
        ) : null}

        <div className="manual-divider">
          <span>or</span>
        </div>

        <section className={`manual-import ${manualOpen ? "is-open" : ""}`}>
          <button
            className="manual-import-toggle"
            type="button"
            onClick={() => setManualOpen((open) => !open)}
            aria-expanded={manualOpen}
          >
            <span className="manual-file-icon" aria-hidden="true">
              ≡
            </span>
            <span>
              <strong>Paste a transcript manually</strong>
              <small>Use this fallback for Zoom, Teams, or transcripts from another source.</small>
            </span>
            <i aria-hidden="true">⌄</i>
          </button>

          {manualOpen ? (
            <form className="manual-import-form" onSubmit={submitManual}>
              <div className="form-row">
                <label className="field">
                  Meeting title
                  <input name="title" required placeholder="Weekly product sync" />
                </label>
                <label className="field">
                  Meeting date
                  <input
                    name="meetingDate"
                    required
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
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
                <span className="form-message">
                  Include speaker names for accurate ownership and evidence attribution.
                </span>
                <button className="primary-button" disabled={manualBusy}>
                  {manualBusy ? "Processing…" : "Process transcript"}
                </button>
              </div>
            </form>
          ) : null}
        </section>

        <p className="meet-privacy-note">
          <span aria-hidden="true">◇</span> Transcripts stay scoped to your organization. LoopClose
          requests read-only Google Meet access.
        </p>
      </div>
    </main>
  );
}
