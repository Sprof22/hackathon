# Submission Checklist

## Completed in the repository

- [x] Full frontend and backend source code
- [x] `.env.example` placeholders and secret-safe `.gitignore`
- [x] Intended user, bottleneck, value, pre-existing work, failure mode, and hot take in README
- [x] Clearly labelled evidence-linked Improvement Changelog
- [x] Clean reproduction commands for baseline, final evaluation, tests, builds, and full solution
- [x] Required data and expected output documented
- [x] Versions, approximate runtime, and cost documented
- [x] Executable stateless baseline
- [x] Executable deterministic final evaluation with per-item evidence
- [x] Instructions and boundaries for every product agent
- [x] Representative product and development trajectories with retries and human checkpoints
- [x] Five-minute video script
- [x] Third-party components, licences, services, and original visual/data disclosures
- [x] Human approval before reminders leave the system
- [x] QA review for ambiguous or autonomous status decisions
- [x] Organization-scoped data access and encrypted Google OAuth tokens
- [x] Synthetic public evaluation data

## Human/external actions still required

- [ ] **Rotate the Neon password that was pasted into the development conversation.** Update local/Vercel `DATABASE_URL`; never place it in Git.
- [ ] Create/configure the Google OAuth client if Google Meet will be shown in the video.
- [ ] Add production Vercel environment variables and redeploy both projects.
- [ ] Run the final verification commands from a clean clone.
- [ ] Confirm `git status` contains only intended source/documentation changes.
- [ ] Commit and push the final repository.
- [ ] Make the repository accessible to judges or grant the required access.
- [ ] Create a judge/demo account using synthetic data if login is required.
- [ ] Record the video using `docs/VIDEO_SCRIPT.md`; keep it under five minutes.
- [ ] Upload the video and verify its sharing permissions in a private/incognito window.
- [ ] Verify the live frontend, backend root, and `/api/health` immediately before submission.
- [ ] Review and accept the participation agreement's submission-ownership and training terms.
- [ ] Submit the repository, reproduction guide, video, trajectories, and any requested live URL before the deadline.

## Final secret check

Run:

```bash
git ls-files | xargs rg -n --hidden \
  '(postgres(ql)?://[^[:space:]]+:[^[:space:]]+@|GOOGLE_CLIENT_SECRET=\\S+|SMTP_PASS=\\S+|npg_[A-Za-z0-9]+)'
```

Only obvious placeholders in `.env.example` should appear. Review results manually; no automated scan guarantees that all private information is absent.
