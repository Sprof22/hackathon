# Five-minute Submission Video Script

Target length: **4:40–4:55**. Use synthetic data and `EMAIL_MODE=capture`. Do not show `.env`, Neon credentials, OAuth secrets, real inboxes, or private meeting transcripts.

## 0:00–0:35 — Problem and user

**Narration:**

> Delivery managers leave recurring meetings with verbal commitments spread across transcripts. A normal summary captures one meeting, but it does not remember who promised what, verify a later completion, or control follow-up. LoopClose turns attributable commitments into evidence-backed state across meetings.

Show the README's user/bottleneck section, then the login/dashboard.

## 0:35–1:00 — Simple baseline

Run:

```bash
npm run baseline
```

**Narration:**

> Our baseline reads only the latest transcript and applies keywords. On six synthetic outcomes it gets three right, falsely closes two, and loses one because it has no memory. It even reads “did not claim it was complete” as done.

## 1:00–2:00 — Realistic execution, first meeting

1. Sign into the demo organization.
2. Open **New meeting**.
3. Paste `series-1-meeting-1.txt` and process it.
4. Return to the dashboard and open one action item.

**Narration:**

> The extraction agent accepts only explicit named commitments. It saves the owner, due date, and exact quote; ordinary discussion is rejected. Every record is scoped to the signed-in organization.

## 2:00–2:55 — Follow-up verification

Process `series-1-meeting-2.txt`.

Show Sarah as done and Marcus as open. Open Sarah's evidence and QA history if time allows.

**Narration:**

> The next meeting is checked against prior open work before new extraction. Sarah closes because her completion quote overlaps the task and clears 0.86. Marcus stays open because negation is checked before completion keywords. The evidence remains visible to QA.

Briefly show series 3/Amina in QA:

> “Should be ready soon” receives low confidence and routes to a person instead of closing.

## 2:55–3:35 — Controlled reminder

Open a blocked or stale action item, add `owner@example.test`, draft a reminder, inspect it, and approve it.

**Narration:**

> The reminder agent cannot guess an address and cannot send. A human supplies the contact, reviews the exact recipient and body, then approves. Capture mode records what would have been delivered without contacting anyone.

Show delivery status **captured**.

## 3:35–4:05 — Optional Google Meet ingestion

If OAuth is configured, show **Organization → Google Meet** and import a synthetic/demo meeting. Otherwise show the implemented connection card and explain the prerequisite.

**Narration:**

> Copy-paste can also be removed. An owner grants read-only Meet access; LoopClose imports the latest generated transcript, resolves speakers, blocks duplicates, and uses the same controlled pipeline.

## 4:05–4:30 — Final comparison and changelog

Run:

```bash
npm run eval
```

Show `eval/results.md`.

**Narration:**

> LoopClose gets all six synthetic outcomes correct with zero unsafe false closes. This is a small deterministic safety set, not a production benchmark. The largest gain came from persistent commitments plus the evidence/confidence gate.

Show the Improvement Changelog briefly.

## 4:30–4:50 — Removed experiment, failure mode, hot take

**Narration:**

> We removed the Vinext adapter after Vercel routing failures and standardized on Next.js. Our main remaining failure mode is paraphrased or multilingual language outside the deterministic patterns. Our hot take: the best meeting agent is not the smoothest summarizer—it is the one that knows when the evidence is too weak to act.

End on the dashboard or logo. Do not exceed five minutes.
