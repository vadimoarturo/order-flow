# OrderFlow backend

NestJS / TypeScript application with explicit domain boundaries and Prisma/PostgreSQL persistence.

```
src/
  main.ts                     # Bootstrap only
  runtime.module.ts           # Explicit process-role composition
  modules/
    orders/
      domain/                 # Aggregate, events, repository/unit-of-work contracts
      application/            # Commands, queries, handlers and use cases
      infrastructure/         # Prisma mappings and persistence adapters
      controllers/            # Nest HTTP controllers and validated request DTOs
    catalog/
    inventory/
    fulfillment/
    operations/
    delivery/
    identity/
  libs/prisma/                # Prisma lifecycle and transaction configuration
  libs/observability/         # Prometheus adapters
  common/                     # Small shared kernel and HTTP error/correlation adapters
prisma/
  schema.prisma
  migrations/0001_initial/
  seed.ts
```

`APP_ROLE=worker` serves HTTP and never starts consumers. `hidden` runs outbox publication, Kafka acceptance and leased integration work, with operational endpoints. `integrations` runs persistent inventory reservation and a deliberately sandboxed carrier. All three roles use `node dist/main.js`.

The ordering aggregate owns business transitions, versions, totals and pending events. Application services depend on domain ports; Nest modules wire adapters through DI. CQRS handlers adapt Nest command/query buses to these use cases. Framework-free application services use explicit factory providers so they can be tested without HTTP or a database.

Prisma repositories use normal client CRUD. Raw, parameterized PostgreSQL is limited to advisory/row locks, `SKIP LOCKED`, database-clock reads and migration fixtures. Orders and outbox commit together; inbox and jobs commit together. Reservation receipts and stock changes commit together. No runtime catalog/order/inventory storage is held in memory.

Unit tests are co-located with source. Separate integration tests use an ephemeral real PostgreSQL database; browser tests exercise the complete Kafka/HTTP path. Carrier responses are sandboxed and do not represent physical shipments.

From the repository root:

```sh
npm ci
npm run check:architecture
npm test
bash scripts/test-integration.sh
```

The integration script expects the local Compose PostgreSQL service to be available and never truncates the existing demo database.
