"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";

type Organization = { id: string; name: string; slug: string; createdAt: string };
type Member = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "manager" | "qa";
  createdAt: string;
};
type GoogleMeetStatus = {
  configured: boolean;
  connected: boolean;
  googleEmail: string | null;
  lastImportedAt: string | null;
};
type GoogleMeetImport = {
  items: unknown[];
  verification: unknown[];
  speakers: number;
  transcriptEntries: number;
};

export default function OrganizationPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [message, setMessage] = useState("Loading organization…");
  const [busy, setBusy] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [googleMeet, setGoogleMeet] = useState<GoogleMeetStatus | null>(null);
  const [googleMessage, setGoogleMessage] = useState("");
  const [googleBusy, setGoogleBusy] = useState(false);
  async function load() {
    try {
      const [workspace, people, meetStatus] = await Promise.all([
        api<Organization>("/organization"),
        api<Member[]>("/organization/members"),
        api<GoogleMeetStatus>("/integrations/google-meet/status"),
      ]);
      setOrganization(workspace);
      setMembers(people);
      setGoogleMeet(meetStatus);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load organization");
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const currentUser = JSON.parse(localStorage.getItem("loopclose_user") || "{}") as {
          role?: string;
        };
        setCanEdit(currentUser.role === "owner");
      } catch {
        setCanEdit(false);
      }
      const params = new URLSearchParams(location.search);
      const result = params.get("googleMeet");
      if (result === "connected") setGoogleMessage("Google Meet connected successfully.");
      if (result === "cancelled") setGoogleMessage("Google Meet connection was cancelled.");
      if (result === "error")
        setGoogleMessage(params.get("message") || "Google Meet could not be connected.");
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function connectGoogleMeet() {
    setGoogleBusy(true);
    setGoogleMessage("Opening Google authorization…");
    try {
      const { url } = await api<{ url: string }>("/integrations/google-meet/auth-url");
      location.href = url;
    } catch (error) {
      setGoogleMessage(
        error instanceof Error ? error.message : "Could not start Google connection"
      );
      setGoogleBusy(false);
    }
  }

  async function importLatestMeet() {
    setGoogleBusy(true);
    setGoogleMessage("Finding your latest completed Google Meet transcript…");
    try {
      const result = await api<GoogleMeetImport>("/integrations/google-meet/import-latest", {
        method: "POST",
      });
      setGoogleMessage(
        `Imported ${result.transcriptEntries} transcript entries from ${result.speakers} participant(s) and found ${result.items.length} commitment(s).`
      );
      await load();
    } catch (error) {
      setGoogleMessage(error instanceof Error ? error.message : "Could not import Google Meet");
    } finally {
      setGoogleBusy(false);
    }
  }

  async function disconnectGoogleMeet() {
    if (!confirm("Disconnect Google Meet from this organization?")) return;
    setGoogleBusy(true);
    try {
      await api<{ connected: false }>("/integrations/google-meet", { method: "DELETE" });
      setGoogleMeet((current) =>
        current ? { ...current, connected: false, googleEmail: null } : current
      );
      setGoogleMessage("Google Meet disconnected.");
    } catch (error) {
      setGoogleMessage(error instanceof Error ? error.message : "Could not disconnect Google Meet");
    } finally {
      setGoogleBusy(false);
    }
  }
  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const name = String(new FormData(event.currentTarget).get("name") || "");
    try {
      const workspace = await api<Organization>("/organization", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setOrganization(workspace);
      setMessage("Organization name updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update organization");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="flow-page">
      <div className="flow-wrap">
        <nav className="flow-nav">
          <Link className="flow-brand" href="/">
            <span className="brand-mark" aria-hidden="true" />
            <span>LoopClose</span>
          </Link>
          <Link href="/">← Dashboard</Link>
        </nav>
        <div className="flow-heading">
          <h1>Organization</h1>
          <p>Manage your workspace identity and see who has access.</p>
        </div>
        <form className="form-card organization-card" onSubmit={update}>
          <label className="field">
            Organization name
            <input
              name="name"
              key={organization?.name}
              defaultValue={organization?.name || ""}
              required
              minLength={2}
              disabled={!canEdit}
            />
          </label>
          <div className="organization-meta">
            <span>Workspace ID</span>
            <code>{organization?.slug || "—"}</code>
          </div>
          <div className="form-actions">
            <span className={`form-message ${message && !organization ? "error" : ""}`}>
              {message ||
                (canEdit
                  ? "Only organization owners can change this name."
                  : "Ask an organization owner to make changes.")}
            </span>
            {canEdit ? (
              <button className="primary-button" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            ) : null}
          </div>
        </form>
        <section className="integration-section">
          <div className="panel-head">
            <div>
              <h2>Meeting integrations</h2>
              <p>Import completed transcripts directly into your organization</p>
            </div>
          </div>
          <article className="integration-card">
            <div className="integration-icon" aria-hidden="true">
              G
            </div>
            <div className="integration-copy">
              <div className="integration-title">
                <strong>Google Meet</strong>
                <span className={googleMeet?.connected ? "connected" : "not-connected"}>
                  {googleMeet?.connected ? "Connected" : "Not connected"}
                </span>
              </div>
              <p>
                Import the latest transcript generated after a Google Meet and process it with
                LoopClose automatically.
              </p>
              {googleMeet?.googleEmail ? (
                <small>Connected as {googleMeet.googleEmail}</small>
              ) : null}
              {googleMeet?.lastImportedAt ? (
                <small>Last import {new Date(googleMeet.lastImportedAt).toLocaleString()}</small>
              ) : null}
              {googleMessage ? <div className="integration-message">{googleMessage}</div> : null}
            </div>
            <div className="integration-actions">
              {!googleMeet?.configured ? (
                <span className="setup-required">Backend setup required</span>
              ) : googleMeet.connected ? (
                <>
                  <button
                    className="primary-button"
                    onClick={importLatestMeet}
                    disabled={googleBusy}
                  >
                    {googleBusy ? "Working…" : "Import latest meeting"}
                  </button>
                  {canEdit ? (
                    <button
                      className="quiet-button"
                      onClick={disconnectGoogleMeet}
                      disabled={googleBusy}
                    >
                      Disconnect
                    </button>
                  ) : null}
                </>
              ) : canEdit ? (
                <button
                  className="primary-button"
                  onClick={connectGoogleMeet}
                  disabled={googleBusy}
                >
                  {googleBusy ? "Connecting…" : "Connect Google Meet"}
                </button>
              ) : (
                <span className="setup-required">Ask an organization owner to connect</span>
              )}
            </div>
          </article>
        </section>
        <section className="members-section">
          <div className="panel-head">
            <div>
              <h2>Members</h2>
              <p>People who can access this organization’s data</p>
            </div>
            <span className="data-count">{members.length} total</span>
          </div>
          <div className="list-card">
            {members.map((member) => (
              <article className="member-row" key={member.id}>
                <span className="member-avatar">
                  {member.name
                    .split(" ")
                    .map((value) => value[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.email}</small>
                </div>
                <span className={`role-badge ${member.role}`}>{member.role}</span>
              </article>
            ))}
            {!members.length ? (
              <div className="empty-state">{message || "No members yet."}</div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
