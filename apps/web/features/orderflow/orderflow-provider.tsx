'use client';
import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Product, Order, Job, Ops } from './types';
import { api, short } from './shared';
function storedRecord<T>(raw: string | null, valid: (value: unknown) => value is T): Record<string, T> {
  try {
    const value: unknown = JSON.parse(raw || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => valid(entry)));
  } catch {
    return {};
  }
}
function useOrderFlowState() {
  const path = usePathname(),
    router = useRouter();
  const [products, setProducts] = useState<Product[]>([]),
    [cart, setCart] = useState<Record<string, number>>({}),
    [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [category, setCategory] = useState('All pieces'),
    [search, setSearch] = useState('');
  const [token, setToken] = useState(''),
    [staffRole, setStaffRole] = useState(''),
    [login, setLogin] = useState(''),
    [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]),
    [order, setOrder] = useState<Order | null>(null),
    [ops, setOps] = useState<Ops | null>(null);
  const [reason, setReason] = useState('Portfolio demo: planned recovery exercise.'),
    [selectedJob, setSelectedJob] = useState('');
  const [customer, setCustomer] = useState(''),
    [address, setAddress] = useState('');
  const [saved, setSaved] = useState<Record<string, string>>({});
  const count = Object.values(cart).reduce((s, n) => s + n, 0),
    subtotal = products.reduce((s, p) => s + p.price * (cart[p.id] || 0), 0);
  const view = path.startsWith('/operations')
    ? 'operations'
    : path.startsWith('/operator')
      ? 'operator'
      : path.startsWith('/orders/')
        ? 'tracking'
        : path === '/orders'
          ? 'orders'
          : path === '/cart'
            ? 'cart'
            : 'shop';
  const isStaff = view === 'operator' || view === 'operations';
  const requiredRole = view === 'operations' ? 'oncall' : 'operator';
  useEffect(() => {
    try {
      setCart(
        storedRecord(
          localStorage.getItem('orderflow.cart'),
          (value): value is number =>
            typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 10,
        ),
      );
      setSaved(
        storedRecord(
          localStorage.getItem('orderflow.orders'),
          (value): value is string => typeof value === 'string' && value.length > 0,
        ),
      );
      setToken(sessionStorage.getItem('orderflow.token') || '');
      setStaffRole(sessionStorage.getItem('orderflow.role') || '');
    } catch {
      /* corrupted local demo state is safely ignored */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    let active = true;
    api<Product[]>('products')
      .then((items) => {
        if (active) setProducts(items);
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [path]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem('orderflow.cart', JSON.stringify(cart));
    } catch {
      // The current cart remains usable when browser storage is unavailable.
    }
  }, [cart, loaded]);
  useEffect(() => {
    setError('');
    setNotice('');
    setOrder(null);
  }, [path]);
  const refresh = useCallback(async () => {
    if (view === 'tracking') {
      const id = path.split('/')[2],
        tracking = saved[id];
      if (tracking || token)
        setOrder(
          await api<Order>(`orders/${id}`, { headers: tracking ? { 'x-order-token': tracking } : {} }, token),
        );
    }
    if (isStaff && token && staffRole === requiredRole) {
      if (view === 'operations') setOps(await api<Ops>('staff/operations', {}, token));
      else setOrders(await api<Order[]>('staff/orders', {}, token));
    }
  }, [view, path, saved, token, staffRole, requiredRole, isStaff]);
  useEffect(() => {
    if (!loaded) return;
    refresh().catch((e) => setError(e.message));
    const timer = setInterval(() => refresh().catch((e) => setError(e.message)), 2000);
    return () => clearInterval(timer);
  }, [refresh, loaded]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);
  function quantity(id: string, delta: number) {
    setCart((c) => {
      const next = { ...c },
        stock = products.find((p) => p.id === id)?.stock || 0;
      next[id] = Math.max(0, Math.min(10, stock, (next[id] || 0) + delta));
      if (!next[id]) delete next[id];
      return next;
    });
  }
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    await action(async () => {
      const body = {
        customer,
        address,
        items: Object.entries(cart)
          .filter(([, n]) => n > 0)
          .map(([productId, quantity]) => ({ productId, quantity }))
          .sort((a, b) => a.productId.localeCompare(b.productId)),
      };
      const signature = JSON.stringify(body);
      const pending = storedRecord(
        sessionStorage.getItem('orderflow.checkout'),
        (value): value is string => typeof value === 'string',
      );
      const key = pending.signature === signature && pending.key ? pending.key : crypto.randomUUID();
      sessionStorage.setItem('orderflow.checkout', JSON.stringify({ signature, key }));
      const result = await api<{ id: string; trackingToken: string }>('orders', {
        method: 'POST',
        body: JSON.stringify({ ...body, idempotencyKey: key }),
      });
      const next = { ...saved, [result.id]: result.trackingToken };
      setSaved(next);
      localStorage.setItem('orderflow.orders', JSON.stringify(next));
      setCart({});
      sessionStorage.removeItem('orderflow.checkout');
      router.push(`/orders/${result.id}`);
    });
  }
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    await action(async () => {
      const r = await api<{ role: string }>('session', { method: 'POST' }, login);
      if (r.role !== requiredRole) throw new Error(`Use the ${requiredRole} token for this workspace.`);
      setToken(login);
      setStaffRole(r.role);
      sessionStorage.setItem('orderflow.token', login);
      sessionStorage.setItem('orderflow.role', r.role);
      setLogin('');
    });
  }
  async function control(service: string, available: boolean) {
    await action(async () => {
      await api(
        `staff/services/${service}`,
        { method: 'POST', body: JSON.stringify({ available, reason }) },
        token,
      );
      await refresh();
      setNotice(`${service} ${available ? 'restored' : 'outage simulated'}`);
    });
  }
  async function recover(job: Job, mode: string) {
    await action(async () => {
      await api(`staff/jobs/${job.id}/${mode}`, { method: 'POST', body: JSON.stringify({ reason }) }, token);
      await refresh();
      setNotice(
        mode === 'retry'
          ? 'Recovery scheduled. The original operation key is preserved.'
          : 'Task skipped. Order requires manual business resolution.',
      );
    });
  }
  async function status(o: Order, to: string) {
    await action(async () => {
      await api(
        `staff/orders/${o.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: to, version: o.version, reason }),
        },
        token,
      );
      await refresh();
      setNotice(`Order ${short(o.id)} marked ${to}`);
    });
  }
  const selected =
    ops?.jobs.find((j) => j.id === selectedJob) || ops?.jobs.find((j) => j.state === 'dlq') || ops?.jobs[0];
  return {
    path,
    router,
    products,
    setProducts,
    cart,
    setCart,
    loaded,
    setLoaded,
    error,
    setError,
    notice,
    setNotice,
    category,
    setCategory,
    search,
    setSearch,
    token,
    setToken,
    staffRole,
    setStaffRole,
    login,
    setLogin,
    busy,
    setBusy,
    orders,
    setOrders,
    order,
    setOrder,
    ops,
    setOps,
    reason,
    setReason,
    selectedJob,
    setSelectedJob,
    customer,
    setCustomer,
    address,
    setAddress,
    saved,
    setSaved,
    count,
    subtotal,
    view,
    isStaff,
    requiredRole,
    refresh,
    quantity,
    action,
    checkout,
    signIn,
    control,
    recover,
    status,
    selected,
  };
}
const OrderFlowContext = createContext<ReturnType<typeof useOrderFlowState> | null>(null);
export function OrderFlowProvider({ children }: { children: React.ReactNode }) {
  const state = useOrderFlowState();
  return <OrderFlowContext.Provider value={state}>{children}</OrderFlowContext.Provider>;
}
export function useOrderFlow() {
  const state = useContext(OrderFlowContext);
  if (!state) throw new Error('OrderFlowProvider is required');
  return state;
}
