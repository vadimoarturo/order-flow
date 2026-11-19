'use client';
import Link from 'next/link';
import { ArrowLeft, Check, ShieldCheck, Activity } from 'lucide-react';
import { useOrderFlow } from '../orderflow/orderflow-provider';
import { Badge, Empty, money, time, short } from '../orderflow/shared';

export default function TrackingView() {
  const { path, token, order, saved } = useOrderFlow();
  return (
    <>
      <div className="page-heading">
        <Link href="/orders" className="text-link">
          <ArrowLeft size={15} /> My orders
        </Link>
        <div className="eyebrow">ORDERFLOW MARKET · ORDER TRACKING</div>
        <h1>Track your order.</h1>
        <p>Saved safely. Follow what happens next.</p>
      </div>
      {order ? (
        <div className="tracking-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">ORDER REFERENCE</div>
                <h2>OF-{short(order.id)}</h2>
              </div>
              <Badge value={order.status} />
            </div>
            <div className="timeline">
              {(order.timeline || []).map((e, i) => (
                <div
                  className={`timeline-item ${i === (order.timeline?.length || 0) - 1 ? 'latest' : ''}`}
                  key={`${i}-${e.status}`}
                >
                  <span className="timeline-dot">
                    <Check size={12} />
                  </span>
                  <div>
                    <span className="timeline-time">{time(e.created_at)}</span>
                    <h3>
                      {e.status === 'placed'
                        ? 'Order received'
                        : e.status === 'reserved'
                          ? 'Your pieces are reserved'
                          : e.status === 'ready'
                            ? 'Delivery arranged'
                            : e.status === 'dispatched'
                              ? 'On its way'
                              : e.status === 'completed'
                                ? 'At home, at last'
                                : 'Needs a little attention'}
                    </h3>
                    <p>{e.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="saved-note">
              <ShieldCheck size={18} /> Your order is saved, even if an external service is unavailable.
            </div>
          </section>
          <aside>
            <section className="panel">
              <div className="eyebrow">THE DETAILS</div>
              <h2>Order summary</h2>
              {order.items?.map((i, n) => (
                <div className="summary-line" key={n}>
                  <span>
                    {i.name} <small>× {i.quantity}</small>
                  </span>
                  <strong>{money(i.price * i.quantity)}</strong>
                </div>
              ))}
              <div className="bag-total">
                <span>Total</span>
                <strong>{money(order.total)}</strong>
              </div>
              <div className="address">
                <span className="eyebrow">DEMO DELIVERY TO</span>
                <p>
                  {order.customer}
                  <br />
                  {order.address}
                </p>
              </div>
            </section>
            <div className="trace-note">
              <Activity size={14} />
              <div>
                Correlation / trace ID<code>{order.trace_id}</code>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <Empty
          title={saved[path.split('/')[2]] || token ? 'Loading your order…' : 'Order access required'}
          body="Orders are private to this browser or an authenticated staff session."
        />
      )}
    </>
  );
}
