# Third-party Components and Service Terms

LoopClose's original contribution is the application workflow, decision policy, tenant model, evaluation fixtures, integration code, and interface. It relies on the following off-the-shelf components. Exact resolved versions are preserved in `package-lock.json` and `apps/api/package-lock.json`.

## Runtime libraries

| Component                           |      Resolved version | Licence    | Use                                        |
| ----------------------------------- | --------------------: | ---------- | ------------------------------------------ |
| Next.js                             |                16.3.3 | MIT        | Web framework and Vercel build output      |
| React / React DOM                   |                19.2.6 | MIT        | User interface                             |
| NestJS packages                     | 11.2.3 / related 11.x | MIT        | API framework, JWT and TypeORM integration |
| TypeORM                             |      lockfile version | MIT        | PostgreSQL persistence and migrations      |
| `pg`                                |                8.23.0 | MIT        | PostgreSQL driver                          |
| bcrypt                              |                 6.0.0 | MIT        | Password hashing                           |
| class-transformer / class-validator |        0.5.1 / 0.15.1 | MIT        | Request validation                         |
| Nodemailer                          |                 9.0.6 | MIT-0      | Optional approved SMTP delivery            |
| Passport / passport-jwt             |         0.7.0 / 4.0.1 | MIT        | Authentication integration                 |
| reflect-metadata                    |                 0.2.2 | Apache-2.0 | Decorator metadata                         |
| RxJS                                |                 7.8.2 | Apache-2.0 | NestJS reactive dependency                 |

Development dependencies—including TypeScript, Jest, ESLint, Prettier, Tailwind tooling, and type definitions—are declared in the package manifests and lockfiles. Their installed package metadata reports MIT or Apache-2.0 licences.

## Optional hosted and local services

| Service                       | Purpose                         | Required for core evaluation? | Operator responsibility                                                                                                     |
| ----------------------------- | ------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Neon or compatible PostgreSQL | Full application persistence    | No                            | Use an authorized account, follow provider terms, and avoid real meeting data unless approved.                              |
| Vercel                        | Hosted frontend and API         | No                            | Configure two projects and keep secrets in project environment variables.                                                   |
| Google Meet REST API / OAuth  | Optional transcript import      | No                            | Follow Google API/OAuth policies, request read-only access, add test users, and obtain participant/organization permission. |
| SMTP provider                 | Optional real reminder delivery | No                            | Use an authorized sender, comply with anti-spam rules, and retain human approval.                                           |
| Ollama                        | Optional local extraction model | No                            | Install and run locally under its applicable licence; deterministic rules remain the default.                               |

Provider quotas, prices, and terms can change. The reproduction guide therefore makes no promise that a particular hosted free tier will remain available. The evidence commands make no hosted-service calls.

## Visual assets

- `public/logo-mark.svg` and `public/favicon.svg` are original vector assets created for LoopClose during the hackathon.
- `public/login-team.jpg` was generated specifically for the project as a fictional team scene; it is not presented as a photograph of real participants.
- `public/og.png` is the project social-preview asset.
- Framework starter icons in `public/file.svg`, `globe.svg`, and `window.svg` are inherited Next.js starter assets under the framework's applicable licence.

## Data

All files under `data/` are synthetic fixtures created for this project. Do not replace them with private transcripts in a public submission.
