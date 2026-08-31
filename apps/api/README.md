# LoopClose API

The API is a feature-oriented NestJS modular monolith. Each business capability owns its controller,
service, DTOs, entities, and tests; cross-cutting authentication and database configuration live in
explicit shared boundaries.

```text
src/
├── action-items/          # extraction, verification, action-item API, audit events
├── auth/                  # registration, login, JWT issuing, users
├── common/                # request decorators, guards, authenticated-user contract
├── dashboard/             # organization-scoped dashboard projection
├── database/              # TypeORM connection and ordered migrations
├── integrations/
│   └── google-meet/       # OAuth, transcript import, encrypted connection state
├── meetings/              # meeting ingestion orchestration
├── notifications/         # email/capture delivery and QA notification history
├── organizations/         # tenant workspace and bootstrap migration support
└── reminders/             # human-approved reminder workflow
```

`app.module.ts` is the composition root. Feature modules expose only the providers needed by another
feature. All business queries include the authenticated `organizationId`; the tests under `common`
and `database` cover tenant scoping and PostgreSQL metadata safety.

See the repository-level `REPRODUCE.md` for setup, environment variables, and exact verification
commands.
