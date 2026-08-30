# Reproduce LoopClose

## Prerequisites

- Node.js 22+
- A free Neon PostgreSQL project
- Optional: Ollama with `llama3.2` installed
- Optional: SMTP credentials from any provider that permits authenticated sending

## Configure

1. Copy `.env.example` to `.env`.
2. Copy `apps/api/.env.example` to `apps/api/.env`.
3. Put the Neon pooled connection string in `apps/api/.env` as `DATABASE_URL`.
4. Replace `JWT_SECRET` with a long random value.
5. Keep `DB_SYNCHRONIZE=true` for the first hackathon run so TypeORM creates the schema. Set it to `false` after the first successful startup.

The default `LLM_PROVIDER=rules` is free and deterministic. To use a local model, set `LLM_PROVIDER=ollama` and start Ollama. The system falls back to rules if Ollama is unavailable.

For real email, set `EMAIL_MODE=smtp` and fill the SMTP values. Keep `EMAIL_MODE=capture` while developing; the exact messages are saved to `notification_deliveries` instead of leaving the system.

## Run

In one terminal:

```bash
cd apps/api
npm install
npm run start:dev
```

In another:

```bash
npm install
npm run dev
```

Open the printed local URL, then visit `/login` to create the first manager account.

## Verify

```bash
cd apps/api
npm test
npm run build
cd ../..
npm run eval
npm run build
```
