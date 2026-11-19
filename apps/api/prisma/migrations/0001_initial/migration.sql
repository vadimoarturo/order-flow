CREATE TABLE IF NOT EXISTS products (
 id text PRIMARY KEY, name text NOT NULL, category text NOT NULL, description text NOT NULL,
 price integer NOT NULL CHECK(price>0), stock integer NOT NULL CHECK(stock>=0), color text NOT NULL, art text NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
 id uuid PRIMARY KEY, tracking_token uuid NOT NULL UNIQUE, idempotency_key uuid NOT NULL UNIQUE,
 request_hash text NOT NULL, customer text NOT NULL, address text NOT NULL,
 status text NOT NULL CHECK(status IN ('placed','reserved','ready','dispatched','completed','attention')),
 total integer NOT NULL CHECK(total>0), trace_id uuid NOT NULL, version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_items (
 order_id uuid REFERENCES orders(id), product_id text REFERENCES products(id), name text NOT NULL,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 10), price integer NOT NULL CHECK(price>0),
 PRIMARY KEY(order_id,product_id)
);
CREATE TABLE IF NOT EXISTS order_history (
 id bigserial PRIMARY KEY, order_id uuid NOT NULL REFERENCES orders(id), status text NOT NULL,
 detail text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS outbox (
 id uuid PRIMARY KEY, order_id uuid NOT NULL REFERENCES orders(id), kind text NOT NULL,
 trace_id uuid NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz
);
CREATE INDEX IF NOT EXISTS outbox_pending ON outbox(created_at) WHERE published_at IS NULL;
CREATE TABLE IF NOT EXISTS inbox (
 event_id uuid PRIMARY KEY, received_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS jobs (
 id uuid PRIMARY KEY, event_id uuid NOT NULL REFERENCES inbox(event_id), order_id uuid NOT NULL REFERENCES orders(id),
 kind text NOT NULL CHECK(kind IN ('reserve','ship')), trace_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','running','succeeded','dlq','skipped')),
 attempts integer NOT NULL DEFAULT 0, recovery_count integer NOT NULL DEFAULT 0,
 next_run_at timestamptz NOT NULL DEFAULT now(), locked_until timestamptz, lease_token uuid,
 last_error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(order_id,kind)
);
CREATE INDEX IF NOT EXISTS jobs_due ON jobs(next_run_at) WHERE state IN ('pending','running');
CREATE INDEX IF NOT EXISTS jobs_order ON jobs(order_id);
CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS history_order ON order_history(order_id,id);
CREATE TABLE IF NOT EXISTS audit (
 id bigserial PRIMARY KEY, actor text NOT NULL, role text NOT NULL, action text NOT NULL,
 target text NOT NULL, reason text NOT NULL CHECK(length(reason)>=8), trace_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS integration_controls (service text PRIMARY KEY CHECK(service IN ('inventory','delivery')), available boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS integration_receipts (
 operation_key text PRIMARY KEY, request_hash text NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS kafka_quarantine (
 id bigserial PRIMARY KEY, topic text NOT NULL, partition integer NOT NULL, offset_value text NOT NULL,
 reason text NOT NULL, payload text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(topic,partition,offset_value)
);
