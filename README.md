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

Further contributor and administrator roles are managed from `/administration`. Fixture identities use `.invalid` addresses and intentionally cannot sign in.

## Verification

```bash
npm run typecheck
npm run lint
npm run test:backend
npm run test:e2e
npm run build
```
