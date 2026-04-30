# Quality Gates

## Global gate

Before any batch is accepted:

- `git diff --stat` reviewed;
- changed files match assigned scope;
- no secret values added;
- no unrelated refactor;
- no silently swallowed critical error;
- verification command run by Tech Lead in main workspace.

## Backend gate

Required:

- `pytest -q` from `apps/api`;
- new endpoint has explicit response shape;
- auth dependency used on user-specific routes;
- DB reads filter by owner where relevant;
- webhooks verify signatures outside dev mode;
- errors return useful 4xx for user/action failures.

Review questions:

- Does this route work when `DATABASE_URL` is missing?
- Does this route work when DB is configured but unavailable?
- Can one Clerk user see another user's data?
- Does plan/billing state come from DB, not frontend trust?

## Frontend gate

Required:

- `pnpm lint` from `apps/web`;
- `pnpm build` from `apps/web`;
- loading, empty, error and success states;
- accessible contrast on light/dark areas;
- no hardcoded fake business data where real API exists.

Review questions:

- Does the component still work without Clerk configured?
- Does it send Clerk token for protected backend calls?
- Does it show API failure clearly?
- Does text fit on mobile?

## Shared contract gate

Required:

- backend payload example reviewed;
- TypeScript type matches payload;
- producer and consumer both validated;
- optional fields are optional only when backend can omit them.

Review questions:

- Is the frontend hiding contract bugs with optional chaining?
- Are old consumers still compatible?
- Is an OpenAPI/test assertion needed?

## Database gate

Required:

- migration has upgrade and downgrade;
- migration tested locally;
- indexes added for lookup-heavy owner filters;
- no destructive change without explicit approval.

Review questions:

- What happens to existing rows?
- Can rollback recover?
- Are enum changes safe?

## Billing gate

Required:

- checkout includes Clerk/user reference;
- webhook maps Stripe customer/subscription to DB user;
- cancellation/downgrade path tested;
- portal only opens for a real customer id;
- client never decides paid plan by itself.

## Security gate

Required:

- protected routes use auth dependency;
- user data filtered by owner;
- production dev bypass disabled;
- env examples use placeholders only;
- no secret logged.

## Release gate

Required:

- `pytest -q`;
- `pnpm lint`;
- `pnpm build`;
- local API health check;
- DB migration applied;
- smoke test: login -> dashboard -> nesting -> history -> gcode;
- webhook smoke tests for Clerk and Stripe when billing/auth is in scope.
