# Verification record — 19 November 2026

Results below come from the local fictional demo. Machine-readable evidence: [verification.json](verification.json). Remote checks run in [GitHub Actions](https://github.com/vadimoarturo/order-flow/actions/workflows/ci.yml); consult the workflow for its current result.

## Passed locally

| Check | Observed result |
| --- | --- |
| Architecture | Domain, application and controller dependency boundaries pass |
| TypeScript | API, web, application tests and Playwright configuration compile |
| Formatting | Source passes Prettier; generated Next.js declarations are excluded |
| Production build | NestJS and Next.js production builds complete |
| Docker build | Application and monitoring images build; complete Compose stack starts |
| Health checks | All eight long-running services healthy; schema migration exits 0 |
| Unit cases | 15 passed, 0 failed |
| PostgreSQL integration scenarios | 6 passed, 0 failed in a dedicated temporary database |
| Chromium browser journeys | 7 passed, 0 failed, 0 skipped, 0 flaky |
| Prometheus rules | `promtool check rules` validates all 3 rules |
| DLQ alert | Actual `OrderFlowDeadLetterQueue` firing state observed during E2E |
| Allure | Report generated from the current 7 browser journeys |
| Dependencies | `npm audit` reports 0 known advisories for the checked lockfile |

Host: macOS arm64, Node.js 20.20.0. Containers use Node.js 22.23.5, Docker Engine 25.0.2; Java 25 generates Allure. Node.js 22 is recommended for development. This is a dated verification record; the Actions workflow and lockfile make the checks repeatable.

## What the tests establish

**Unit:** runtime role/port validation, integer-cent totals, aggregate-owned order lines, operator transitions, integration sequencing, inventory validation, private tracking, checkout idempotency and bounded retry windows with jitter.

**Real PostgreSQL:** six concurrent same-key checkouts create one order and one outbox row; a forced outbox failure rolls back order creation; inbox duplicates create one job; an expired lease can be reclaimed and its old owner is fenced; retry exhaustion retains DLQ diagnostics; concurrent same-version operator changes yield one success; persistent inventory deduplicates reservations and prevents overselling. The compiled Nest HTTP role resolves CQRS without starting hidden consumers.

**Live stack through Chromium:** storefront search, categories, price sorting, mobile controls, checkout through Kafka/inbox/scheduler/inventory/carrier, operator dispatch/completion, delivery outage through five attempts and DLQ, live Prometheus firing alert, audited restore/retry, forbidden recovery, skip to `attention`, validation and private tracking. Additional journeys verify recovery from null/array/malformed browser state, cart persistence across reload, and retry after the server creates an order but its response is lost: both requests use the same checkout key and return the original order.

Tests preserve the existing demo database. Integration tests create and remove only their own temporary database. Browser tests add fictional orders and consume demo stock. Current checks were rerun after patching the build dependency and browser-state handling.

## Delivery fixes

Next.js regenerates `next-env.d.ts` during type generation, so Prettier excludes that generated file. Docker build context excludes environment files and generated reports. Generated presentation HTML remains local; the PDF and screenshots are versioned.

The Nest CLI's transitive Glob dependency is pinned to 14.0.2 through an npm override, addressing the [Glob cancellation advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) and resolving a patched Minimatch dependency. Production builds and the Compose stack were rebuilt with the updated lockfile; the Nest CLI remains on the existing major version.

## Recorded evidence

[Recovered task and audit](evidence/recovery.json) record the current test's demo job/order/trace IDs, successful state and manual recovery reason. [Trace-filtered JSON logs](evidence/recovery-logs.jsonl) show publication, acceptance, retry exhaustion and recovery for that same task. Screenshots are captured from the running application. The eight-page [portfolio PDF](OrderFlow-Portfolio.pdf) is regenerated from these screens and the current verification counts. All eight pages were rendered with Poppler and visually inspected.

Playwright writes JSON/HTML reports, Allure results and retained failure traces under ignored output directories. GitHub Actions retains reports and service logs as downloadable artifacts.

## Scope

No production deployment, traffic benchmark, load/soak test, exhaustive crash matrix, multi-node failover, real carrier integration, Firefox/WebKit run, identity-backed authentication or implemented sharding is claimed. Kafka is a single local broker. Correlation IDs connect logs; OpenTelemetry spans are not implemented. The repository contains a complete demo within the documented scope.
