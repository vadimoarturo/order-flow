# Prisma migration lifecycle

Fresh databases use `npm run migrate -w apps/api`, which runs `prisma migrate deploy` followed by non-destructive seed upserts. Compose runs it as a one-shot service before application readiness.

`0001_initial` is the checked-in PostgreSQL schema, including custom constraints and partial indexes. Prisma schema relations specify the corresponding `NoAction` policies. Future structural changes require another migration; do not rewrite an already applied migration or use `db push` to bypass history.

## Previous local draft

The original local draft had SQL-created tables without Prisma migration history. Its data was backed up outside the repository. Application containers were stopped, operational tables/receipt hashes were bridged without changing stock or order state, and the initial migration was marked as applied. Normal deploy/seed then completed. No database reset or volume deletion was used.

The guarded helper `apps/api/prisma/baseline-existing-demo.ts` accepts only an explicitly configured localhost `orderflow` database. It is not part of normal fresh startup and must not be run against an unrelated database.

If intentionally upgrading another copy of that earlier draft, first back up its database and stop business writers. With its local `DATABASE_URL` explicitly exported:

```sh
npx tsx apps/api/prisma/baseline-existing-demo.ts
npm run migrate:resolve -w apps/api -- --applied 0001_initial
npm run migrate -w apps/api
```

Review the existing schema before baselining. The workflow follows Prisma's documented [baselining approach](https://www.prisma.io/docs/orm/v6/prisma-migrate/getting-started); it does not prove arbitrary database drift is safe. Existing volumes in this workspace are already baselined.
