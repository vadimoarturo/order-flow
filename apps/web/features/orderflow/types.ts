export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  color: string;
  art: string;
};
export type Order = {
  id: string;
  status: string;
  total: number;
  version: number;
  trace_id: string;
  created_at: string;
  customer?: string;
  address?: string;
  items?: { name: string; quantity: number; price: number }[];
  timeline?: { status: string; detail: string; created_at: string }[];
  integration?: {
    kind: string;
    state: string;
    attempts: number;
    next_run_at: string;
  }[];
};
export type Job = {
  id: string;
  order_id: string;
  kind: string;
  state: string;
  attempts: number;
  recovery_count: number;
  trace_id: string;
  last_error: string;
  next_run_at: string;
  created_at: string;
};
export type Ops = {
  jobs: Job[];
  services: { service: string; available: boolean }[];
  audit: {
    id: number;
    action: string;
    target: string;
    actor: string;
    reason: string;
    created_at: string;
  }[];
  summary: { outbox_pending: number; inbox_received: number; dlq: number };
};
