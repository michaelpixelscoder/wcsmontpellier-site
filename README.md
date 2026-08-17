# WCS Montpellier

Community reference for West Coast Swing classes and events around Montpellier.

## Local development

```bash
npm install
npm run dev
```

The combined development command starts the local Convex backend and Vite frontend. The first Convex run creates `.env.local`.

Load or refresh the deterministic, visibly fictional development fixtures with:

```bash
npm run seed
```

Create the first administrator by signing up normally, then granting that exact account from the trusted CLI:

```bash
npx convex run administration:grantAdministratorByEmail '{"email":"you@example.com"}'
```

Further contributor and administrator roles are managed from `/administration`. Seeded fixture identities use reserved `.invalid` addresses so they cannot receive real email.

The local seed creates these sign-in accounts with password `WcsDemo-2026!`:

| Account | Role |
| --- | --- |
| `fixture-admin@wcsmontpellier.invalid` | Administrator |
| `fixture-contributor-a@wcsmontpellier.invalid` | Contributor A |
| `fixture-contributor-b@wcsmontpellier.invalid` | Contributor B |
| `fixture-user@wcsmontpellier.invalid` | Member |

These predictable credentials are development fixtures and must never be seeded into production.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:backend
npm run test:e2e
npm run build
```
