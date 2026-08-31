# Representative Agent Trajectories

These are normalized, human-readable trajectories reconstructed from the checked-in synthetic fixtures, executable rules, tests, and database operations. They are not hidden model chain-of-thought logs. Each trace shows the instruction, observable action, tool response, feedback, retry, and human checkpoint needed to reproduce the result.

## Trajectory 1 — Extract explicit commitments

**Instruction:** Extract only explicit, named commitments and preserve exact evidence.

**Input:** `data/transcripts/series-1-meeting-1.txt`

| Step | Agent action                                                                | Tool or system response                                                                                 | Feedback and next decision                                     |
| ---- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1    | Split the transcript into attributable statements.                          | Three lines: Sarah commitment, Marcus commitment, team discussion.                                      | Only the first two use explicit first-person future language.  |
| 2    | Parse Sarah's statement.                                                    | Owner `Sarah`; task `ship the checkout retry fix`; deadline text `August 28`; exact quote retained.     | Structured commitment is safe to persist.                      |
| 3    | Parse Marcus's statement.                                                   | Owner `Marcus`; task `publish the onboarding brief`; deadline text `September 2`; exact quote retained. | Structured commitment is safe to persist.                      |
| 4    | Evaluate the discussion line.                                               | No named explicit commitment pattern.                                                                   | Reject it rather than inventing an owner.                      |
| 5    | Save through TypeORM with the authenticated organization ID and meeting ID. | Two action-item records returned.                                                                       | Dashboard can now carry these commitments into later meetings. |

**Final result:** 2 commitments, 0 discussion lines mislabelled.

**Retry path:** If `LLM_PROVIDER=ollama` is selected and the local call fails, the extraction service catches the failure and repeats extraction through the deterministic rules.

## Trajectory 2 — Verify completion and handle negation

**Instruction:** Completion requires matching evidence; negated completion remains open.

**Input:** Stored Sarah and Marcus commitments plus `series-1-meeting-2.txt`.

| Step | Agent action                                                        | Tool or system response                                                         | Feedback and next decision                                                    |
| ---- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1    | Query open items where `organizationId` matches the signed-in user. | Sarah and Marcus records returned.                                              | Compare both with the new transcript.                                         |
| 2    | Match Sarah's owner/task terms.                                     | Evidence: `Sarah: I finished the checkout retry fix and it is now shipped.`     | Completion terms and sufficient task overlap produce confidence above `0.86`. |
| 3    | Apply Sarah's result.                                               | Status event saved; Sarah becomes `done`, `autoClosed=true`, evidence retained. | Add the autonomous decision to the QA audit trail.                            |
| 4    | Match Marcus's line.                                                | Evidence includes `did not claim it was complete`.                              | Negation rule runs before completion keywords. Keep `open`; do not close.     |
| 5    | Save status history and return verification results.                | One safe close, one open result.                                                | Continue to extraction of any genuinely new commitments.                      |

**Final result:** Sarah `done`; Marcus `open`. The stateless baseline incorrectly marks both done.

**Human checkpoint:** Sarah's autonomous close is visible in QA. A reviewer can inspect the exact sentence rather than trusting an unexplained status.

## Trajectory 3 — Route ambiguous progress to QA

**Instruction:** Progress language is not completion; uncertainty must be visible.

**Input:** Amina's stored commitment plus `Amina: We made progress on pricing and it should be ready soon.`

| Step | Agent action                                     | Tool or system response                                                             | Feedback and next decision                            |
| ---- | ------------------------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1    | Match owner and task term `pricing`.             | Relevant quote found.                                                               | There is evidence, but it is not proof of completion. |
| 2    | Detect `made progress` / `should be ready soon`. | Proposed completion confidence `0.55`.                                              | `0.55 < 0.86`; autonomous close is forbidden.         |
| 3    | Apply threshold policy.                          | Action item becomes `needs_review`; QA notification stores quote and item identity. | Wait for a qualified reviewer.                        |

**Final result:** `needs_review`, not `done` and not silently open.

**Rejected experiment:** Lowering the threshold or treating `ready` as completion would reproduce the baseline's unsafe false close. That experiment was removed.

## Trajectory 4 — Draft, retry, approve, and capture a reminder

**Instruction:** Draft a factual check-in, never send without approval.

| Step | Agent or human action                                                          | Tool or system response                                                  | Feedback and next decision                           |
| ---- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------- |
| 1    | Reminder agent receives a blocked item without `ownerEmail`.                   | Error: `Add the owner's email before drafting a reminder`.               | Stop; do not guess an address.                       |
| 2    | Human opens the action-item detail page and adds a synthetic/authorized email. | Scoped item update succeeds.                                             | Retry is now permitted.                              |
| 3    | Reminder agent drafts a message quoting the original commitment.               | Unapproved reminder saved; no email delivery exists.                     | Present recipient, subject, and body to the human.   |
| 4    | Human reviews and selects **Approve and send**.                                | Approval endpoint records approver ID and invokes notification executor. | Consequential action now has explicit authorization. |
| 5    | Executor runs in `EMAIL_MODE=capture`.                                         | Delivery row records `captured`; no external message leaves the system.  | Demo is safe and auditable.                          |

**Final result:** A reproducible reminder and delivery record with a human checkpoint and no real recipient contacted.

## Trajectory 5 — Import a Google Meet transcript

**Instruction:** Read only a user-authorized completed transcript, preserve speakers, and prevent duplicates.

| Step | Adapter action                                                        | Tool or system response                                                                  | Feedback and next decision                                        |
| ---- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1    | Organization owner selects **Connect Google Meet**.                   | Google OAuth requests `meetings.space.readonly`; callback returns an authorization code. | Encrypt tokens and bind the connection to that organization.      |
| 2    | User selects **Import latest meeting** after transcription completes. | Meet API lists recent ended conference records and generated transcripts.                | Choose the latest record with `FILE_GENERATED`.                   |
| 3    | Fetch transcript entries and participants.                            | Speaker resource IDs, display names, text, and timestamps returned.                      | Sort entries, map speaker names, and build `Speaker: text` lines. |
| 4    | Compare conference identity with prior import.                        | If identical, return `The latest Google Meet transcript has already been imported`.      | Stop duplicate processing; otherwise continue.                    |
| 5    | Submit to meeting-ingestion service.                                  | Same extraction, verification, QA, and persistence pipeline runs.                        | Report speakers, entries, and extracted commitments.              |

**Retry paths:** Missing OAuth configuration shows **Backend setup required**. No generated transcript returns a clear not-found message; the user waits for generation or enables transcription in the next meeting. Expired access tokens are refreshed; unreadable credentials require reconnection.

## Development-agent trajectory disclosure

Codex was the development agent used to inspect and modify the repository. No parallel subagents were used. Private system prompts and hidden reasoning are not part of the submission; the representative trajectory below contains the human instructions, observable tool actions, outputs, retries, and checkpoints that shaped the code.

| Human instruction / feedback                                                                              | Observable development action                                                                                                                    | Tool response                                                                                          | Next decision                                                                                         |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Use `/Users/mac/Desktop/hackathon`, Neon, free tooling, real notifications, and a professional interface. | Inspected the challenge material and repository; built Next/Nest/Postgres workflow with deterministic rules and capture-mode email.              | Local builds/tests plus the live UI exposed missing flows over successive iterations.                  | Preserve free rules as default; make email consequential only after approval.                         |
| Frontend and backend deployment produced missing-output and `404: NOT_FOUND` errors.                      | Inspected Vercel build logs and repository layout. Removed Vinext/Vite adapter and rebuilt with standard Next.js.                                | `next build` compiled and Vercel deployment completed.                                                 | Keep two Vercel projects with explicit roots and API proxy.                                           |
| Backend logs reported ESM loading, missing exported handler, and missing `pg`.                            | Inspected Nest entrypoint and package dependencies; exported a Vercel handler and installed/imported PostgreSQL driver.                          | Nest initialized and database connection advanced past the driver error.                               | Add health/root endpoints and document separate deployment.                                           |
| Human asked whether one organization would leak data.                                                     | Added organization records, JWT organization claims, scoped repositories, and tenancy tests.                                                     | Tests confirmed organization filters on dashboard, details, reminders, and deliveries.                 | Surface workspace management in the UI.                                                               |
| Human asked for live action-item notifications.                                                           | Added details, owner email, reminder draft, approval, and delivery status.                                                                       | API tests and builds passed; UI exposed full controlled workflow.                                      | Retain capture mode as the safe demo default.                                                         |
| Human asked for post-meeting Google Meet import.                                                          | Checked official Meet API behavior, implemented OAuth, encrypted tokens, transcript/participant retrieval, and duplicate protection.             | Unit tests and both production builds passed; environment audit found no OAuth credentials configured. | Leave Google Cloud credential creation as an explicit human-owned deployment step.                    |
| Submission rules required evidence-linked improvements and baseline comparison.                           | Audited README/changelog/eval; discovered the existing result was qualitative. Implemented an executable baseline and per-item final comparison. | First evaluation attempt failed because Node strip-only mode could not import decorated Nest classes.  | Extracted deterministic logic into a pure module and reran successfully: baseline 3/6, LoopClose 6/6. |

This disclosure intentionally reports observable engineering behavior rather than private chain-of-thought.
