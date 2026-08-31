# Deployment evidence

This note records the deployment feedback that drove the frontend runtime change. It contains no credentials or private meeting data.

## Failed configuration

The repository was initially imported into Vercel using the Vite preset and the repository root. The build invoked the API package instead of a deployable frontend and ended with:

```text
> @loopclose/api@0.1.0 build
> tsc -p tsconfig.build.json

Error: No Output Directory named "public" found after the Build completed.
```

Later frontend deployments returned Vercel's platform-level `404: NOT_FOUND` at `/`, indicating that no matching frontend output was assigned to that deployment URL.

## Decision

The Vinext/Vite adapter was removed and the web application was migrated to standard Next.js. The frontend and API remain separate Vercel projects.

## Successful evidence

The replacement deployment ran `next build`, compiled successfully, generated the application routes, and completed deployment:

```text
> @loopclose/web@0.1.0 build
> next build

Compiled successfully
Generating static pages (7/7)

Route (app)
├ /
├ /approvals
├ /login
├ /meetings/new
└ /qa

Build Completed
Deployment completed
```

Subsequent iterations added `/organization`, `/action-items/[id]`, and the API proxy. The clean verification command remains `npm run build` from the repository root.
