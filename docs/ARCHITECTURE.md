# Architecture — OrderFlow Market demo

An independent fictional marketplace-style project. No private packages, employer code, business data or production claims are included.

## Contexts and inward dependencies

`modules/<context>` groups domain, application, infrastructure and controllers. Domain imports neither NestJS nor Prisma. Ports reside in domain interfaces; application services use these contracts. Infrastructure implements them with Prisma, Kafka or HTTP. Controllers adapt HTTP with Nest guards and class-validator DTOs. Ordering commands and queries have separate Nest CQRS handlers. Explicit module providers connect pure use cases to adapters through DI.

The ordering aggregate owns immutable line snapshots, authoritative integer-cent totals, legal transitions, optimistic version and pending domain events. State copies do not provide a public status setter. Inventory's stock entity prevents invalid/insufficient reservations. Operational workflow state is separated from order business status: a DLQ task does not imply a completed or cancelled order.

Read-side ports return typed records. An application response mapper explicitly selects public order fields; tracking capabilities, idempotency keys and request hashes are never returned by order queries. The token needed to track a new order is returned only by checkout/replay to its caller. There is no persistent customer-account system in this limited flow.

`common` contains the small error/correlation kernel. `libs/prisma` handles database lifecycle and transaction configuration; observability adapters implement operational ports. Controllers do not import Prisma. The architecture check enforces domain/application/controller dependency directions.

## Bootstrap and runtime roles

One `main.ts` uses a validated runtime configuration and dynamic root module:

- **worker**: HTTP API, catalog, CQRS order handlers, staff operations. No Kafka runner or consumer is instantiated. This is verified against the compiled Nest provider graph.
- **hidden**: Kafka consumer, outbox publisher and leased scheduler. Only operational HTTP endpoints are mounted. Business/catalog/Swagger routes return 404, checked in browser/API E2E.
- **integrations**: a persistent inventory API and a sandbox delivery adapter behind private-network authorization.

All roles execute the same backend build. Hidden initialization connects its broker clients before readiness. The worker's database-backed API can save orders without depending on a synchronous carrier call. There is no implicit production mode that starts background consumers in every HTTP replica.

## Real storage and service boundaries

Catalog, orders/items/history, outbox, inbox, jobs, inventory balances, external receipts, failure controls and audit entries use PostgreSQL through Prisma. There is no runtime in-memory repository. Seed arrays only initialize the catalog through non-destructive upserts.

The inventory HTTP request commits its operation receipt with the stock change. It is a separate transaction from order processing. The sandbox carrier commits a stable booking receipt and returns an explicitly sandboxed reference; no actual courier is contacted. Both use the same local PostgreSQL server for convenience, but never participate in the order transaction. Separate databases and independently operated provider infrastructure are not simulated.

## Transactions, isolation and integrity

Prisma interactive transactions use **READ COMMITTED**, with 10-second acquisition and 30-second transaction limits. READ COMMITTED alone is insufficient for the required races:

1. Checkout takes a transaction-scoped advisory lock derived from the checkout UUID, looks up the normalized request hash, reads catalog prices and creates the aggregate. Order, item snapshots, history and outbox events commit together. Replayed input returns the same order; changed input with the same key returns 409.
2. Operator updates lock the order row and invoke aggregate transitions using the client's expected version. One of two simultaneous same-version commands succeeds; the other gets 409.
3. Inventory reservations take a lock for the stable operation key, lock product rows in deterministic ID order, validate the stock entities and update balances. A receipt commits in the same transaction. Duplicate calls return that receipt. Competing requests for the last unit cannot both reserve it.
4. Job ownership is checked under a row lock with a unique fencing token before outcome writes. Order status/history/events and successful job outcome commit together.

SQL migrations retain positive-price/total, non-negative-stock, quantity/state checks and foreign keys. Unique constraints protect checkout keys, tracking tokens, inbox IDs, `(order_id, kind)` tasks and integration operation keys. Partial indexes cover unpublished outbox and due jobs; indexes cover order history, newest orders and order-job lookup. Relations use explicit `NoAction` update/delete behavior; historical order snapshots do not depend on current catalog prices.

Normal CRUD uses Prisma client operations. Parameterized raw SQL is reserved for PostgreSQL advisory locks, `FOR UPDATE SKIP LOCKED` and database-clock reads. Custom SQL constraints/partial indexes are intentionally maintained in migration files. Cross-table total consistency is protected by aggregate ownership and the atomic insert, not a SQL aggregate constraint.

The SQL integration suite forces an outbox insert to fail after order creation and proves that the order rolls back. It also tests actual Prisma stock contention and a direct negative-stock update rejected by PostgreSQL.

## At-least-once delivery and scheduling

The hidden publisher locks an unpublished outbox row, sends to Kafka with `acks=-1`, then marks it published in the same database transaction. A crash after Kafka acknowledgement but before commit can publish again. Producer idempotence reduces transport duplicates within a session; it is not an exactly-once DB/Kafka bridge. Holding a DB connection during the bounded send is a demo trade-off; higher throughput should use publisher leases or CDC.

The Kafka handler validates an envelope and atomically inserts inbox and the next durable job. Duplicate event IDs become no-ops. It returns after persistence so offsets can advance without waiting for integrations. Database failures leave the offset uncommitted. Malformed JSON/schema envelopes are retained in `kafka_quarantine` with topic, partition, offset and reason. There is no UI replay for that transport quarantine.

The scheduler wakes every 250ms, claims due tasks with `SKIP LOCKED`, assigns a 15-second lease and commits before the remote HTTP call. HTTP timeout is 3 seconds. Expired leases are reclaimable; token checks prevent the old owner from writing a stale outcome. Retry/lease scheduling is based on database-clock snapshots.

Retryable failures persist a next due time: approximately **1s, 2s, 8s, 15s**, with up to 20% jitter, followed by DLQ after five failed attempts. These short windows are for a visible local demonstration, not a production SLO. Permanent 4xx failures except 429 go directly to DLQ. There is no sleeping Kafka handler or in-memory delayed-retry queue.

HTTP side effects use `${orderId}:reserve` / `${orderId}:ship` through retries and manual recovery. Persisted receipts protect ambiguous failures, such as a successful stock commit followed by a lost HTTP response. Job recovery tests prove lease fencing; the suite is not an exhaustive process/network crash matrix.

## Roles and recovery

The backend authenticates separate shared operator/on-call tokens with constant-time comparison. Operator can dispatch/complete; on-call can control failure-lab availability and retry/skip DLQ tasks. The reason, actor, role, action, target, trace ID and time are recorded transactionally with every manual mutation.

Retry resets the current attempt budget and increments the recovery cycle without changing the operation key. Skip marks the task skipped and the order `attention`, with history and an outbox event. It does not complete fulfilment or implement cancellation/compensation. Reserved inventory remains reserved after skipping delivery; business resolution is deliberately outside this limited flow.

This is backend-enforced demo authorization, not identity-backed production RBAC, JWT sessions or MFA. Public tracking uses a browser-held random capability distinct from the order ID. All exposed ports bind to loopback.

## Observability and evidence

JSON application logs carry correlation UUIDs through HTTP, order events, task outcomes and integration calls. The task drawer provides a trace-filtered `docker compose logs --no-color worker hidden integrations | rg ...` command. This is correlation, not implemented OpenTelemetry spans. No Loki or other central log service is installed.

Prometheus scrapes HTTP worker and hidden every 5 seconds. Database-backed gauges expose durable job states and outbox age/count; process counters record job outcomes, retries, publish acknowledgements and infrastructure errors. Dashboard queries select the HTTP scrape for durable gauges to avoid double counting; trace IDs are not metric labels. Counters reset when a process restarts.

Grafana and alert rules are built into monitoring images. The DLQ rule has a 10-second hold after scrape/evaluation. Browser tests check the real firing alert API, then recovery. No Alertmanager, email or paging integration is configured. Reports and sample trace logs are local demo evidence, not production measurements.

## Sharding proposal — not implemented

Co-locate order aggregate, items, history and outbox on an `order_id` hash shard to retain local atomic writes. Generate the order ID before routing and use it as the Kafka key. Checkout idempotency needs a routing key/global directory so the same checkout cannot create orders on different shards.

Inventory has a different ownership key: SKU. Keep one authoritative owner per SKU and use asynchronous reservations with receipts. Cross-shard cancellation needs explicit compensation. Trade-offs include hot products, fan-out staff searches, global uniqueness, shard movement, operational recovery and backlog locality. A routing directory/consistent hashing reduces movement but adds dependencies. This project contains no sharding code or evidence that partitioning is currently needed.

## Limits

Single local PostgreSQL server and single Kafka broker (replication factor 1, PLAINTEXT on the private network); no HA, backups service, production ingress, real payments, real courier, customer identity provider, seller management, split orders, refund/cancellation saga, inventory replenishment UI, retention jobs, schema registry or production benchmark. Prisma migrations are versioned; a guarded one-time bridge preserves the earlier local demo data. API lists show at most 100 newest records and audit 50. Deployment, multi-node failover and broad chaos/load testing are not claimed.
