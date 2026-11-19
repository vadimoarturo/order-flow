# HTTP API — fictional demo

Browser requests use `/api/*` through Next.js. Direct NestJS HTTP worker calls use `http://localhost:4000/*` without the `/api` prefix. Bodies are JSON. Error responses include `message`, HTTP `statusCode` and `traceId`. Responses carry `x-correlation-id`.

| Endpoint | Access | Behavior |
| --- | --- | --- |
| `GET /products` | Public | Seeded catalog and persisted inventory balances |
| `POST /orders` | Public | Create/replay checkout using a UUID idempotency key |
| `GET /orders/:id` | Matching `x-order-token` or staff bearer | Details, item snapshots, timeline and safe integration state |
| `POST /session` | Valid staff bearer | Return demo role, without issuing another credential |
| `GET /staff/orders` | Operator or on-call | Latest 100 order summaries |
| `PATCH /staff/orders/:id/status` | Operator | Version-checked dispatch/completion with reason |
| `GET /staff/operations` | On-call | Latest 100 jobs, service controls, audit and backlog summary |
| `POST /staff/services/:service` | On-call | Simulate or restore `inventory` / `delivery` |
| `POST /staff/jobs/:id/retry` | On-call | Retry only a DLQ job, preserving operation key |
| `POST /staff/jobs/:id/skip` | On-call | Acknowledge a DLQ job; mark order `attention` |
| `GET /health` | Local | Database readiness |
| `GET /metrics` | Local | Prometheus metrics |

## Checkout example

```sh
curl -sS http://localhost:4000/orders \
  -H 'Content-Type: application/json' \
  -H 'x-correlation-id: 1a05bfc7-cd21-40ba-b450-31891f6372de' \
  -d '{"idempotencyKey":"89b5ec66-f21d-4b08-b47a-338392bd6e6b","customer":"Alex Demo","address":"24 Fictional Lane, Demo City","items":[{"productId":"lamp","quantity":1}]}'
```

The response contains `id`, `trackingToken` and `traceId`. Retain the token separately; the ID alone is not enough to read an order. Replay identical normalized input with the same key to receive the same order; changed input returns 409. Use a fresh UUID for a new checkout.

```sh
curl -sS http://localhost:4000/orders/ORDER_UUID \
  -H 'x-order-token: TRACKING_TOKEN_UUID'
```

A status mutation body is `{"status":"dispatched","version":3,"reason":"Demo parcel handed to courier"}`. A simulation body is `{"available":false,"reason":"Demo planned integration outage"}`. Recovery requires `{"reason":"Dependency restored; retry approved"}`. All staff endpoints require `Authorization: Bearer <configured-role-token>`; do not substitute the other role's token.

Missing credentials return 401, wrong role 403, invalid input 400, inaccessible/missing orders 404, and stale version/invalid business transitions/conflicting idempotency input 409. Lists are intentionally bounded rather than paginated. API versioning and internet-facing rate limiting are not implemented.

The HTTP worker also serves generated OpenAPI at `/docs` and `/docs-json`. The hidden role serves health/metrics only; it does not expose this business API. Request DTOs use Nest ValidationPipe, class-validator and class-transformer.
