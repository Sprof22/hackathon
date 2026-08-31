"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../lib/api";

type ItemStatus = "open" | "done" | "blocked" | "needs_review" | "stale";
type ActionItem = {
  id: string;
  task: string;
  ownerName: string;
  ownerEmail: string | null;
  deadline: string | null;
  sourceQuote: string;
  status: ItemStatus;
  statusConfidence: number | null;
  autoClosed: boolean;
  createdAt: string;
  resolvedAt: string | null;
  meeting: { id: string; title: string; meetingDate: string };
};
type Reminder = {
  id: string;
  actionItemId: string;
  recipientEmail: string;
  subject: string;
  emailBody: string;
  approved: boolean;
  approvedBy: string | null;
  sentAt: string | null;
  createdAt: string;
};
type Delivery = {
  id: string;
  actionItemId: string | null;
  reminderId: string | null;
  recipient: string;
  subject: string;
  status: "captured" | "sent" | "failed";
  error: string | null;
  createdAt: string;
};
type Detail = { item: ActionItem; reminders: Reminder[]; deliveries: Delivery[] };

const labels: Record<ItemStatus, string> = {
  open: "Open",
  done: "Done",
  blocked: "Blocked",
  needs_review: "Needs review",
  stale: "Stale",
};
function tone(status: ItemStatus) {
  return status === "needs_review" || status === "blocked" ? "review" : status;
}
function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(value)
  );
}

export default function ActionItemDetail() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [message, setMessage] = useState("Loading action item…");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState("");
  async function load() {
    try {
      const data = await api<Detail>(`/action-items/${id}`);
      setDetail(data);
      setMessage("");
      setError(false);
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "Could not load this action item");
    }
  }
  useEffect(() => {
    load();
  }, [id]);
  async function saveOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("owner");
    setMessage("");
    try {
      const email = String(new FormData(event.currentTarget).get("email") || "");
      await api(`/action-items/${id}/owner-email`, {
        method: "PATCH",
        body: JSON.stringify({ email }),
      });
      await load();
      setMessage("Owner email saved.");
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "Could not save owner email");
    } finally {
      setBusy("");
    }
  }
  async function draftReminder() {
    setBusy("draft");
    setMessage("");
    try {
      await api(`/action-items/${id}/reminders`, { method: "POST" });
      await load();
      setMessage("Reminder drafted and added to the approval queue.");
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "Could not draft reminder");
    } finally {
      setBusy("");
    }
  }
  async function approveReminder(reminderId: string) {
    setBusy(reminderId);
    setMessage("");
    try {
      await api(`/approvals/${reminderId}/approve`, { method: "POST" });
      await load();
      setMessage("Reminder approved. Delivery status is shown below.");
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "Could not approve reminder");
    } finally {
      setBusy("");
    }
  }
  function deliveryFor(reminderId: string) {
    return detail?.deliveries.find((delivery) => delivery.reminderId === reminderId);
  }

  return (
    <main className="flow-page action-detail-page">
      <div className="flow-wrap action-detail-wrap">
        <nav className="flow-nav">
          <a className="flow-brand" href="/">
            <span className="brand-mark" aria-hidden="true" />
            <span>LoopClose</span>
          </a>
          <div className="detail-nav-actions">
            <a href="/approvals">Approval queue</a>
            <a href="/">← Dashboard</a>
          </div>
        </nav>
        {!detail ? (
          <section className="list-card">
            <div className={`empty-state ${error ? "detail-error" : ""}`}>{message}</div>
          </section>
        ) : (
          <>
            <header className="detail-heading">
              <div>
                <span className={`pill ${tone(detail.item.status)}`}>
                  {labels[detail.item.status]}
                </span>
                <h1>{detail.item.task}</h1>
                <p>
                  Owned by {detail.item.ownerName} · Captured from {detail.item.meeting.title}
                </p>
              </div>
              {detail.item.statusConfidence != null ? (
                <span className="detail-confidence">
                  {Math.round(detail.item.statusConfidence * 100)}% confidence
                </span>
              ) : null}
            </header>
            {message ? (
              <div className={`dashboard-notice ${error ? "error" : "success"}`}>{message}</div>
            ) : null}
            <div className="detail-grid">
              <section className="detail-card evidence-card">
                <div className="detail-card-head">
                  <div>
                    <span>COMMITMENT EVIDENCE</span>
                    <h2>Original meeting context</h2>
                  </div>
                  <span className="metric-icon violet">“</span>
                </div>
                <blockquote>{detail.item.sourceQuote}</blockquote>
                <dl className="detail-facts">
                  <div>
                    <dt>Meeting</dt>
                    <dd>{detail.item.meeting.title}</dd>
                  </div>
                  <div>
                    <dt>Meeting date</dt>
                    <dd>{formatDate(detail.item.meeting.meetingDate)}</dd>
                  </div>
                  <div>
                    <dt>Deadline</dt>
                    <dd>{formatDate(detail.item.deadline)}</dd>
                  </div>
                  <div>
                    <dt>Resolution</dt>
                    <dd>
                      {detail.item.resolvedAt ? formatDate(detail.item.resolvedAt) : "Still active"}
                    </dd>
                  </div>
                </dl>
              </section>
              <aside className="detail-card owner-card">
                <div className="detail-card-head">
                  <div>
                    <span>OWNER CONTACT</span>
                    <h2>{detail.item.ownerName}</h2>
                  </div>
                  <span className="owner-avatar">
                    {detail.item.ownerName
                      .split(" ")
                      .map((value) => value[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                </div>
                <p>Add a verified address before LoopClose drafts any external reminder.</p>
                <form onSubmit={saveOwner}>
                  <label className="field">
                    Owner email
                    <input
                      type="email"
                      name="email"
                      key={detail.item.ownerEmail}
                      defaultValue={detail.item.ownerEmail || ""}
                      required
                      placeholder="owner@company.com"
                      autoComplete="email"
                    />
                  </label>
                  <button className="secondary-action" disabled={busy === "owner"}>
                    {busy === "owner" ? "Saving…" : "Save owner email"}
                  </button>
                </form>
              </aside>
            </div>
            <section className="detail-card reminder-section">
              <div className="reminder-section-head">
                <div>
                  <span>FOLLOW-UP WORKFLOW</span>
                  <h2>Reminder history</h2>
                  <p>Every reminder requires approval before delivery.</p>
                </div>
                <button
                  className="primary-button"
                  onClick={draftReminder}
                  disabled={!detail.item.ownerEmail || busy === "draft"}
                >
                  {busy === "draft" ? "Drafting…" : "＋ Draft reminder"}
                </button>
              </div>
              {!detail.item.ownerEmail ? (
                <div className="workflow-hint">
                  Add the owner’s email above to enable reminder drafting.
                </div>
              ) : null}
              {detail.reminders.length === 0 ? (
                <div className="dashboard-empty">
                  No reminders have been drafted for this action item.
                </div>
              ) : (
                <div className="reminder-list">
                  {detail.reminders.map((reminder) => {
                    const delivery = deliveryFor(reminder.id);
                    const status = delivery?.status ?? (reminder.approved ? "approved" : "pending");
                    return (
                      <article className="reminder-entry" key={reminder.id}>
                        <div className="reminder-copy">
                          <div className="reminder-title-row">
                            <h3>{reminder.subject}</h3>
                            <span className={`delivery-badge ${status}`}>
                              <i />
                              {status === "pending"
                                ? "Awaiting approval"
                                : status === "captured"
                                  ? "Captured for demo"
                                  : status === "failed"
                                    ? "Delivery failed"
                                    : status === "sent"
                                      ? "Email sent"
                                      : "Approved"}
                            </span>
                          </div>
                          <p className="reminder-recipient">
                            To: {reminder.recipientEmail} · Drafted {formatDate(reminder.createdAt)}
                          </p>
                          <p className="reminder-body">{reminder.emailBody}</p>
                          {delivery ? (
                            <div className={`delivery-detail ${delivery.status}`}>
                              <strong>
                                {delivery.status === "sent"
                                  ? "Delivered by SMTP"
                                  : delivery.status === "captured"
                                    ? "Saved without sending"
                                    : "SMTP delivery failed"}
                              </strong>
                              <span>
                                {delivery.error ||
                                  `${delivery.recipient} · ${formatDate(delivery.createdAt)}`}
                              </span>
                            </div>
                          ) : null}
                        </div>
                        {!reminder.approved ? (
                          <button
                            className="approve-action"
                            onClick={() => approveReminder(reminder.id)}
                            disabled={busy === reminder.id}
                          >
                            {busy === reminder.id ? "Sending…" : "Approve & send"}
                          </button>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
