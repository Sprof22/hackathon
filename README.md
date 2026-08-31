# LoopClose

LoopClose turns meeting commitments into accountable, verified outcomes. It extracts explicit action items, remembers them across meetings, auto-closes only evidence-backed high-confidence completions, and routes stale or ambiguous work to a human.

## What is implemented

- Professional dashboard with meeting ingestion, QA review, and approval screens
- NestJS API with PostgreSQL/Neon persistence through TypeORM
- Email/password accounts with bcrypt password hashing and signed JWT sessions
- Organization workspaces with tenant-scoped data access across every workflow
- Free rules engine by default, with optional local Ollama structured extraction
- Evidence-required verification with an `0.86` auto-close threshold
- QA audit records for autonomous closes, stale items, and ambiguous updates
- Approval-gated reminder emails
- SMTP delivery with database capture mode for safe demos
- Synthetic evaluation fixtures and deterministic unit tests

## Architecture

The standard Next.js web experience is at the repository root. The NestJS API lives in `apps/api`. Neon is the source of truth for organizations, meetings, users, action items, status history, reminders, QA alerts, and notification delivery logs. Every business record is scoped to the authenticated user's organization.

```text
Transcript → verify existing items → extract new commitments → Neon
                    │                         │
                    ├─ high confidence + quote → auto-close → QA digest
                    ├─ ambiguous → needs review → QA alert
                    └─ stale/blocked → reminder draft → approval → email
```

## Quick start

See [REPRODUCE.md](./REPRODUCE.md). Copy both `.env.example` files, add a Neon connection string, then run the API and web app. No paid AI key is required.

## Trust boundary

An item can only close autonomously when its confidence is at least `0.86` and an exact evidence quote is saved. Lower-confidence completion language goes to review. Reminder messages always require approval. QA receives an audit record for every autonomous close.

## Original work and dependencies

The workflow, confidence gate, verification heuristics, persistence model, QA audit loop, approval flow, synthetic evaluation data, and interface are original to this project. Next.js, React, NestJS, TypeORM, PostgreSQL, bcrypt, Nodemailer, and optional Ollama are off-the-shelf dependencies.
