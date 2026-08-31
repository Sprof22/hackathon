# Agent Instructions and Boundaries

LoopClose uses three constrained agentic stages. “Agent” here means a component that observes meeting state, applies a documented decision policy, and produces a structured next action. The default path is deterministic and does not call a hosted language model. `NotificationService` is a controlled executor, not an agent: it may deliver only an already-approved reminder.

## Shared rules

Every agent must:

1. Operate only inside the authenticated `organizationId`.
2. Preserve the source text used for a decision.
3. Prefer no action over an invented owner, commitment, status, or email.
4. Never send an email directly.
5. Expose uncertainty to an owner, manager, or QA reviewer.
6. Treat silence as absence of evidence, never proof of completion.

## 1. Extraction agent

**Purpose:** Turn a meeting transcript into new, attributable commitments.

**Input:** Transcript text and meeting date.

**Default operational instruction:**

> Extract only an explicit future commitment attributable to a named speaker. Preserve the exact source sentence. Return the task, owner name, optional owner email, optional deadline, and source quote. Do not turn discussion, aspiration, passive ownership, or an unattributed sentence into a commitment.

**Deterministic implementation:** `apps/api/src/action-items/commitment-extractor.ts` accepts forms such as `Sarah: I'll ship…` and rejects ordinary discussion. It removes a narrow set of leading task verbs but keeps the complete source quote.

**Optional Ollama system instruction (verbatim from the implementation):**

> Extract only explicit commitments. Return JSON: `{items:[{task,ownerName,ownerEmail,deadline,sourceQuote}]}`. Never invent evidence.

**Allowed tools:** Read the current transcript; optionally call a locally configured Ollama instance; create organization-scoped action-item records.

**Failure behavior:** If Ollama is unavailable or returns unusable output, fall back to deterministic rules. If no explicit commitment is found, return an empty list.

## 2. Verification agent

**Purpose:** Compare a later meeting with previously open commitments.

**Input:** Current transcript plus organization-scoped open, blocked, or stale action items.

**Operational instruction:**

> For each prior commitment, find a sentence connected to the owner or meaningful task terms. Preserve that sentence as evidence. Blocker language may set `blocked`. Negated completion must remain open. Explicit completion may propose `done`; autonomous closure is allowed only when a quote exists and confidence is at least `AUTO_CLOSE_THRESHOLD` (`0.86` by default). Ambiguous progress must remain below the threshold and route to `needs_review`. No relevant quote means no autonomous status change; repeated silence or an overdue deadline may produce `stale`.

**Decision table:**

| Observation                            | Proposed confidence | Applied result                                           |
| -------------------------------------- | ------------------: | -------------------------------------------------------- |
| Explicit blocker                       |              `0.93` | `blocked`                                                |
| Explicit completion with task overlap  |         `0.68–0.98` | `done` only at `>=0.86`; otherwise `needs_review`        |
| “Almost done” / “should be ready soon” |              `0.55` | `needs_review`                                           |
| Negated completion                     |                none | `open`                                                   |
| No relevant evidence                   |                none | `open`, then potentially `stale` after policy conditions |

**Allowed tools:** Read scoped action items; write action-item status, confidence, resolution time, status events, and QA notifications; request reminder drafting for stale/blocked work.

**Human checkpoint:** `needs_review` is never silently converted to done. QA, manager, or organization owner inspects the quote and decides what to do next.

## 3. Reminder agent

**Purpose:** Draft a polite status request for stale or blocked work.

**Input:** One organization-scoped action item with task, owner, owner email, and original source quote.

**Operational instruction:**

> Draft a factual check-in that names the tracked task and quotes the original commitment. Ask whether it is done, in progress, or blocked. Do not accuse the owner, add facts, change the task, or send the message.

**Allowed tools:** Read one scoped action item; create one scoped reminder draft. If an unapproved draft already exists, return it instead of creating a duplicate.

**Failure behavior:** If the owner email is missing, stop with `Add the owner's email before drafting a reminder`.

**Human checkpoint:** An authenticated user reviews recipient, subject, and body and explicitly selects **Approve and send**. Only then may the notification executor use capture mode or SMTP.

## Controlled notification executor

The notification component receives a reminder only from the approval endpoint. In `EMAIL_MODE=capture`, it writes the exact recipient, subject, body, action-item ID, reminder ID, and `captured` status to PostgreSQL without contacting anyone. In SMTP mode, it records `sent` or `failed`. This boundary keeps consequential communication observable and reversible until approval.

## Google Meet adapter

The Meet integration is an input adapter rather than an agent. An organization owner grants read-only OAuth permission. The adapter fetches the latest completed transcript, resolves participant display names, constructs speaker-labelled text, rejects duplicate imports, and hands the result to the same meeting-ingestion pipeline. OAuth tokens are encrypted before storage and scoped to one organization.

## Qualified reviewer

For this use case, a qualified reviewer is an organization owner, delivery manager, or QA lead who understands the team's commitments and has authority to review evidence or contact an owner. LoopClose assists that reviewer; it does not replace employment, performance, compliance, or disciplinary judgment.
