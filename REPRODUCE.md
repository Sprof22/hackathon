# Clean Reproduction Guide

This guide assumes a clean machine with no LoopClose files or credentials. The core evidence run is local, deterministic, and does not require PostgreSQL, Google, SMTP, a paid model, or network access after dependencies are installed. The full product run requires PostgreSQL.

## Tested environment

| Component         | Reproduction version               |
| ----------------- | ---------------------------------- |
| Node.js           | `22.13.1` (`>=22.13.0` required)   |
| npm               | `10.9.2`                           |
| Next.js / React   | `16.3.3` / `19.2.6`                |
| NestJS            | `11.2.3`                           |
| PostgreSQL driver | `pg 8.23.0`                        |
| Database          | PostgreSQL-compatible Neon project |
| Default reasoning | Deterministic rules, no model call |

Linux, macOS, or WSL should work. Commands below use a POSIX shell.

## 1. Clone and install

```bash
git clone https://github.com/Sprof22/hackathon.git
cd hackathon
npm ci
cd apps/api
npm ci
cd ../..
```

With a typical broadband connection, both installs take approximately 20–60 seconds. Package caches and network speed can change this substantially.

## 2. Reproduce the baseline

The baseline is intentionally simple and stateless: it reads only each latest transcript and applies completion/blocker keywords. It has no database memory, evidence threshold, negation handling, or review state.

```bash
npm run baseline
```

Expected output:

```text
Stateless baseline: 3/6 correct outcomes (50.0%), 2 unsafe false closes, 1 missing outcomes.
```

Approximate runtime: under one second. Cost: `$0`; no external API is called.

## 3. Reproduce the final evaluation

```bash
npm run eval
```

Expected output:

```text
Evaluated 6 outcomes: baseline 3/6, LoopClose 6/6; wrote eval/results.md
```

The command rewrites [eval/results.md](./eval/results.md) with summary metrics and every individual prediction. Approximate runtime: under one second. Cost: `$0`; no external API is called.

### Evaluation data

- `data/ground_truth.json`: six labelled commitments across three meeting series.
- `data/transcripts/*-meeting-1.txt`: initial explicit commitments.
- `data/transcripts/*-meeting-2.txt`: completion, negation, blocker, ambiguity, and silence cases.

All data is synthetic and safe to share. The result is a regression/safety check, not a statistically meaningful production benchmark.

## 4. Run tests and production builds

```bash
cd apps/api
npm test
npm run build
cd ../..
npm run build
```

Expected results:

- API: all Jest suites and tests pass.
- API TypeScript build exits with code `0`.
- Next.js build lists `/`, `/login`, `/meetings/new`, `/organization`, `/approvals`, `/qa`, `/action-items/[id]`, and `/api/[...path]`.

On the tested laptop, API tests take roughly 3 seconds and both builds together take roughly 7 seconds. Runtime varies by CPU and cache. Cost: `$0` locally.

## 5. Configure the full application

Create local environment files from the committed placeholders:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Create a free Neon PostgreSQL project or use another PostgreSQL-compatible database. Put its pooled connection string in `apps/api/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
DB_SYNCHRONIZE=true
JWT_SECRET=replace-with-a-random-secret
WEB_ORIGIN=http://localhost:3000
LLM_PROVIDER=rules
AUTO_CLOSE_THRESHOLD=0.86
EMAIL_MODE=capture
```

Generate the local JWT secret without committing it:

```bash
openssl rand -base64 48
```

Put the output after `JWT_SECRET=`. Keep `DB_SYNCHRONIZE=true` for the first clean startup because the original base schema is created through TypeORM synchronization; later migrations add tenancy, delivery context, and Google Meet connections. After a successful first startup, it can be set to `false`.

Set the frontend proxy target in the root `.env`:

```env
LOOPCLOSE_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Never commit either `.env` file. `.gitignore` excludes them.

## 6. Start the solution

Terminal 1:

```bash
cd apps/api
npm run start:dev
```

Expected API address: `http://localhost:4000`.

Health checks:

```bash
curl http://localhost:4000/
curl http://localhost:4000/api/health
```

Expected responses:

```text
Welcome to LoopClose v0.0.1
{"status":"ok","service":"loopclose-api"}
```

Terminal 2, from the repository root:

```bash
npm run dev
```

Open `http://localhost:3000/login`. Create an account; registration also creates an isolated organization and makes the first user its owner.

## 7. Reproduce a realistic product execution

1. Open **Meetings → New meeting**.
2. Paste `data/transcripts/series-1-meeting-1.txt`, use title `Checkout planning`, and process it.
3. Confirm that Sarah and Marcus become open commitments with source quotes.
4. Process `data/transcripts/series-1-meeting-2.txt` as a later meeting.
5. Confirm that Sarah closes with completion evidence while Marcus remains open because the sentence explicitly says he did not claim completion.
6. Repeat with series 3 to see Amina route to QA as `needs_review` and Diego remain open.
7. On an action-item detail page, add a synthetic owner email such as `owner@example.test`, draft a reminder, inspect it, and approve it.
8. With `EMAIL_MODE=capture`, confirm the delivery status is **captured**, not sent externally.

This demonstrates extraction, persistence, cross-meeting verification, calibrated review, human approval, and safe delivery simulation.

## 8. Optional real SMTP

Keep capture mode for judging unless a real delivery demonstration is necessary. To enable SMTP in the backend environment:

```env
EMAIL_MODE=smtp
SMTP_HOST=your-provider-host
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_FROM=LoopClose <notifications@example.com>
```

An authenticated human must still approve each reminder. SMTP credentials remain outside Git. Provider charges and terms depend on the provider selected.

## 9. Optional Google Meet import

The core evaluation does not require Google. To demonstrate post-meeting import:

1. Enable the Google Meet REST API in a Google Cloud project.
2. Configure an OAuth consent screen; for the hackathon, keep it in testing mode and add the demo account as a test user.
3. Create an OAuth Web application client.
4. Add `http://localhost:4000/api/integrations/google-meet/callback` as a local authorized redirect URI.
5. Add these backend-only variables:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/integrations/google-meet/callback
GOOGLE_TOKEN_ENCRYPTION_KEY=another-long-random-secret
```

6. Restart the API, sign in as an organization owner, and open **Organization → Connect Google Meet**.
7. Enable transcription during a Google Meet, end the meeting, wait for Google to generate the transcript, then select **Import latest meeting**.

Expected output: LoopClose reports the number of speakers, transcript entries, and commitments, and the imported meeting appears on the dashboard. Availability of Google Meet transcription depends on the Google Workspace account and administrator settings.

## 10. Hosted deployment

Deploy the repository twice on Vercel:

- Frontend project: repository root, detected as Next.js.
- Backend project: root directory `apps/api`, with the backend environment variables.

Production backend variables must include:

```env
WEB_ORIGIN=https://YOUR-FRONTEND.vercel.app
GOOGLE_REDIRECT_URI=https://YOUR-BACKEND.vercel.app/api/integrations/google-meet/callback
```

Production frontend variables must include:

```env
LOOPCLOSE_API_URL=https://YOUR-BACKEND.vercel.app/api
NEXT_PUBLIC_SITE_URL=https://YOUR-FRONTEND.vercel.app
```

Add the production Google callback to the OAuth client's authorized redirect URIs before connecting.

## Runtime and cost summary

| Operation                        | Approximate tested runtime |                       Required external cost |
| -------------------------------- | -------------------------: | -------------------------------------------: |
| Baseline                         |                      `<1s` |                                         `$0` |
| Final evaluation                 |                      `<1s` |                                         `$0` |
| API test suite                   |                      `~3s` |                                         `$0` |
| API + frontend builds            |                      `~7s` |                                         `$0` |
| Full local app                   |   Continuous until stopped |  PostgreSQL account; free-tier options exist |
| Optional Ollama                  |         Hardware-dependent |                 No API charge; local compute |
| Optional SMTP / Google / hosting |         Provider-dependent | Depends on account, quota, and service terms |

## Troubleshooting

- **API cannot find `pg`:** run `npm ci` inside `apps/api`, not only at the repository root.
- **Vercel says no `public` output:** the backend and frontend project roots are mixed up. The frontend root is `/`; the backend root is `apps/api`.
- **Frontend shows a Vercel 404:** verify the frontend project is using the repository root and Next.js preset.
- **Google integration says setup required:** the three OAuth variables are missing from the backend process.
- **No Google transcript found:** transcription was not enabled, the file is still generating, or the connected account cannot access that conference record.
- **Reminder is captured instead of sent:** this is expected in `EMAIL_MODE=capture`.
