# LoopClose

LoopClose is an evidence-first meeting follow-through system for delivery managers, QA leads, operations teams, and small product teams that make commitments in recurring meetings.

## User, bottleneck, and value

The intended user leaves a meeting with several verbal commitments, then manually copies tasks into another tool, chases owners, and tries to remember whether a later meeting actually confirmed completion. Ordinary meeting summaries capture what was said once; they do not maintain accountable state across meetings. This creates three costly failure modes: commitments disappear, vague progress is mistaken for completion, and follow-up messages are sent without review.

LoopClose persists explicit, attributable commitments; checks later transcripts for exact evidence; and separates autonomous evidence-backed updates from ambiguous cases that require a person. The value is not another summary. It is a visible decision trail from the original quote to the final outcome.

## Evidence-backed result

On the checked-in six-item synthetic safety set, the executable stateless baseline produced **3/6 correct final outcomes and two unsafe false closes**. LoopClose produced **6/6 correct outcomes and zero unsafe false closes**. This is a small deterministic regression set, not a production-accuracy claim. Run `npm run baseline` and `npm run eval`, then inspect [the generated evidence](./eval/results.md).

## What it does

- Accepts pasted transcripts or imports the latest generated Google Meet transcript.
- Extracts only explicit commitments with an owner and source quote.
- Stores meetings, commitments, status history, reminders, and delivery logs in PostgreSQL.
- Verifies open commitments against later meetings.
- Auto-closes only when a completion quote meets the `0.86` threshold.
- Routes ambiguous completion language to QA review.
- Ages silent or overdue work toward stale instead of inventing completion.
- Drafts owner reminders but requires human approval before email delivery.
- Isolates every business record and Google connection by organization.

## Realistic execution

```text
Initial transcript
  → Extraction agent saves explicit commitment + owner + quote
  → Neon stores organization-scoped state

Follow-up transcript
  → Verification agent loads open commitments
  ├─ explicit completion + evidence + confidence ≥ 0.86 → close + QA audit
  ├─ blocker evidence → blocked + reminder draft
  ├─ ambiguous completion → needs_review + human checkpoint
  └─ no evidence → remains open / eventually stale

Approved reminder
  → Notification executor sends through SMTP or records a safe capture
```

The product agents, their exact operational instructions, allowed tools, and boundaries are documented in [Agent Instructions](./docs/AGENT_INSTRUCTIONS.md). Representative executions, tool responses, retries, and human checkpoints are in [Agent Trajectories](./docs/AGENT_TRAJECTORIES.md).

## Architecture

- **Web:** Next.js 16 and React 19 at the repository root.
- **API:** NestJS in `apps/api`, deployed independently as a Vercel function.
- **Database:** PostgreSQL/Neon through TypeORM.
- **Default reasoning:** Free deterministic rules; optional local Ollama extraction.
- **Email:** Database capture by default; optional SMTP after approval.
- **Meeting integration:** Organization-scoped Google OAuth and Google Meet REST API.

Every API read and write is scoped to the authenticated `organizationId`. Google tokens are encrypted before storage. The Google integration requests read-only Meet access and never asks for a Google password.

## Run and reproduce

Follow [REPRODUCE.md](./REPRODUCE.md) from a clean environment. It contains exact setup, solution, baseline, evaluation, test, build, Google Meet, and email-capture commands, plus expected output, versions, runtime, and cost.

Quick evidence-only run—no database, credentials, paid model, or network API is required:

```bash
npm ci
npm run baseline
npm run eval
```

## Improvement Changelog

[CHANGELOG.md](./CHANGELOG.md) records every meaningful iteration, the evidence that motivated it, the resulting decision, and the evidence used to verify the change. The largest contribution was replacing stateless completion keywords with persistent commitments plus an evidence/confidence gate. The removed experiment was the Vinext/Cloudflare adapter, which complicated Vercel routing without improving the core result.

## Safety and responsible data use

- The evaluation uses only synthetic transcripts in `data/`.
- No autonomous close occurs without a stored evidence quote and sufficient confidence.
- Ambiguous completion is reviewed by a manager or QA member.
- Reminder emails require an explicit human approval action.
- `EMAIL_MODE=capture` keeps consequential messages inside the database during demos.
- Secrets are excluded through `.gitignore`; only placeholder `.env.example` files are committed.
- Do not upload real meeting transcripts unless every participant and the organization permit that processing.

The primary reviewer is the authenticated organization owner, manager, or QA member. They can inspect evidence, withhold reminder approval, and review uncertain outcomes before those outcomes affect people.

## What existed before the competition

The repository history begins with the LoopClose hackathon MVP (`d576144`). No separate pre-competition LoopClose product or proprietary dataset is represented in this repository. The pre-existing pieces are the developers' general engineering knowledge and the third-party open-source libraries and hosted services listed in [THIRD_PARTY.md](./THIRD_PARTY.md). All application workflow code, synthetic fixtures, evaluation logic, interface work, organization isolation, approval flow, and Google Meet integration shown here are part of this repository's hackathon development history.

## Main failure mode

The deterministic rules engine can miss paraphrased, multilingual, overlapping-speaker, or badly attributed commitments. A missed commitment is safer than a fabricated one, but it still creates operational risk. The system therefore keeps source evidence visible, avoids claiming production accuracy, and supports a local model only as an optional extractor with a deterministic fallback.

## Hot take

**The most useful meeting agent is not the one that writes the smoothest summary; it is the one that knows when the evidence is too weak to act.** Stateful memory, calibrated restraint, and a human checkpoint matter more than eloquence when software can close work or contact a person.

## Submission map

- [Improvement Changelog](./CHANGELOG.md)
- [Clean Reproduction Guide](./REPRODUCE.md)
- [Evaluation Results](./eval/results.md)
- [Agent Instructions](./docs/AGENT_INSTRUCTIONS.md)
- [Agent Trajectories](./docs/AGENT_TRAJECTORIES.md)
- [Five-minute Video Script](./docs/VIDEO_SCRIPT.md)
- [Third-party Components and Terms](./THIRD_PARTY.md)
- [Submission Checklist](./SUBMISSION_CHECKLIST.md)
