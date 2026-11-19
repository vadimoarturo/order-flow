# OrderFlow engineering rules

OrderFlow is an independent fictional marketplace demo. Do not copy private repository code, internal packages, organization names, operational data or proprietary integrations into this project.

## Backend boundaries

- Organize bounded contexts under `apps/api/src/modules/<context>`.
- `domain`: rich entities, business errors and port contracts; no NestJS, Prisma, HTTP or application-layer imports.
- `application`: use cases, commands, queries and handlers. Depend on domain contracts, never concrete persistence or transport adapters.
- `infrastructure`: Prisma repositories, HTTP/Kafka adapters and entity persistence mapping.
- `controllers`: NestJS HTTP adapters, DTO validation and authorization guards. No database queries or infrastructure imports.
- Register implementations in Nest modules. Keep `main.ts` limited to role selection and application bootstrap.
- `APP_ROLE=worker` serves HTTP without consumers. `APP_ROLE=hidden` runs Kafka/outbox/job processing and operational health endpoints. `integrations` exposes persistent inventory and a clearly labeled sandbox carrier.
- PostgreSQL/Prisma and Kafka are real runtime dependencies. Test doubles belong only in isolated unit tests.

## Quality and delivery

- Co-locate unit tests as `*.spec.ts` beside the entity/service/use case. Keep real database integration tests and browser journeys separate.
- Run `npm run check:architecture`, TypeScript checks and relevant tests before committing.
- Use Prisma migrations and non-destructive seeds. Never reset existing user/demo data to make a test pass.
- Preserve atomic order/outbox and inbox/job transactions, lease fencing and stable external operation keys.
- Keep code and UI labels in English; maintain a short Russian handoff.
- Record changes in separate local commits. Do not push a repository or upload portfolio material without an explicit later instruction.
