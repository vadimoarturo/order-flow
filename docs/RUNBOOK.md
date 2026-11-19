# On-call runbook — local demo

## Failure → diagnosis → recovery

1. Start `docker compose up -d --build --wait`. Check `docker compose ps`: HTTP **worker**, background **hidden**, integrations, storage and monitoring should be healthy; migration exits 0.
2. Open <http://localhost:3000/operations> with the configured on-call token (default `oncall-demo-local`). Enter a descriptive reason and choose **Simulate outage** for Delivery. This changes the sandbox availability control, not the broker.
3. Place a new order in the marketplace using fictional delivery details. Actual inventory reserves. Carrier calls return HTTP 503; the order stays saved.
4. Select its **Book delivery** task. Inspect last error, attempts, next due time, job ID and trace ID. After the retry budget it remains `dlq`, with customer-safe timeline detail.
5. Open <http://localhost:3001/d/orderflow> (default `admin` / `admin-demo-local`). View job states, retries and outbox backlog. At <http://localhost:9090/alerts>, `OrderFlowDeadLetterQueue` fires after the scrape/evaluation and 10-second hold. No external notification is sent.
6. Follow **Find related logs** in the task drawer:

   ```sh
   docker compose logs --no-color worker hidden integrations | rg 'PASTE-TRACE-UUID'
   ```

7. Restore Delivery. Enter a recovery reason and choose **Retry task**. Confirm `succeeded`, unchanged operation key, an audit entry and order business status `ready`. The alert clears when no DLQ jobs remain and Prometheus reevaluates.
8. Use the operator token (`operator-demo-local` by default) to dispatch and complete a ready order. On-call cannot perform these business transitions.

## Skip semantics

Only an on-call user can skip a DLQ task with a reason. Skip produces order status `attention`, keeps audit context and never reports delivery success. There is no cancellation/refund/compensation workflow: existing stock reservations are not automatically released. A skipped task cannot be retried through the recovery endpoint.

## Operational checks

- HTTP readiness / OpenAPI: <http://localhost:4000/health>, <http://localhost:4000/docs>.
- Hidden readiness: <http://localhost:4001/health>; business routes are not mounted on this role.
- Scrape targets: <http://localhost:9090/targets>.
- SQL: `docker compose exec db psql -U orderflow -d orderflow`; inspect `jobs`, `outbox`, `inbox`, `integration_receipts`, `integration_controls`, `audit`, `kafka_quarantine`.
- Growing outbox age: inspect hidden logs, broker health and database locks. Do not delete outbox rows to silence an alert.
- Restart hidden with `docker compose restart hidden`. Due tasks stay in PostgreSQL; running work becomes reclaimable when its lease expires. Fencing prevents an old owner from committing a stale result.
- Transport quarantine has no UI replay. Diagnose the envelope/producer compatibility before any database repair.

`docker compose down` preserves named volumes. Avoid removing volumes unless you deliberately intend to erase local demo data. SQL tests use their own temporary database. Browser journeys add fictional orders and consume live demo stock.
