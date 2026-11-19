'use client';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Package,
  ShieldCheck,
  Activity,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Copy,
  SlidersHorizontal,
  Box,
  LogOut,
} from 'lucide-react';
import { useOrderFlow } from '../orderflow/orderflow-provider';
import { Badge, Empty, money, time, short } from '../orderflow/shared';

export default function StaffWorkspace() {
  const {
    setError,
    setNotice,
    token,
    setToken,
    staffRole,
    setStaffRole,
    login,
    setLogin,
    busy,
    orders,
    ops,
    reason,
    setReason,
    setSelectedJob,
    view,
    requiredRole,
    signIn,
    control,
    recover,
    status,
    selected,
  } = useOrderFlow();
  return (
    <>
      <div className="workspace-top">
        <div>
          <div className="eyebrow">ORDERFLOW · DEMO WORKSPACE</div>
          <h1>{view === 'operator' ? 'Order operations' : 'Keep things flowing.'}</h1>
          <p>
            {view === 'operator'
              ? 'The business side of every delivery.'
              : 'Diagnose the unexpected. Recover with confidence.'}
          </p>
        </div>
        <div className="workspace-nav">
          <Link className={view === 'operator' ? 'selected' : ''} href="/operator">
            <Package size={15} /> Operator
          </Link>
          <Link className={view === 'operations' ? 'selected' : ''} href="/operations">
            <Activity size={15} /> On-call
          </Link>
        </div>
      </div>
      {!token || staffRole !== requiredRole ? (
        <form className="panel login-panel" onSubmit={signIn}>
          <span className="brand-mark">
            <ShieldCheck size={25} />
          </span>
          <div className="eyebrow">ROLE-RESTRICTED WORKSPACE</div>
          <h2>{view === 'operator' ? 'Operator' : 'On-call'} access</h2>
          <p>
            Enter the local {requiredRole} demo token from your environment configuration. These shared demo
            roles are not production authentication.
          </p>
          <label>
            Staff token
            <input
              type="password"
              required
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="off"
              placeholder={`${requiredRole} token`}
            />
          </label>
          <button className="btn dark full" disabled={busy}>
            Open workspace <ArrowRight size={16} />
          </button>
        </form>
      ) : (
        <>
          <div className="session-bar">
            <span>
              <span className="live-dot" /> Signed in as demo-{staffRole} <span className="divider">/</span>{' '}
              Refreshes every 2 seconds
            </span>
            <button
              className="text-link"
              onClick={() => {
                setToken('');
                setStaffRole('');
                sessionStorage.removeItem('orderflow.token');
                sessionStorage.removeItem('orderflow.role');
              }}
            >
              <LogOut size={13} /> Sign out
            </button>
          </div>
          <label className="reason-field">
            Action reason{' '}
            <span className="caption">Required for all changes · recorded in the audit trail</span>
            <input value={reason} minLength={8} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          </label>
          {view === 'operator' && (
            <section className="panel operator-panel">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">BUSINESS OPERATIONS</div>
                  <h2>Orders at a glance</h2>
                </div>
                <span className="caption">Up to 100 latest orders</span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Created</th>
                      <th>Total</th>
                      <th>Business status</th>
                      <th>Next step</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/orders/${o.id}`} className="order-link">
                            OF-{short(o.id)} <ArrowUpRight size={12} />
                          </Link>
                        </td>
                        <td>{time(o.created_at)}</td>
                        <td>{money(o.total)}</td>
                        <td>
                          <Badge value={o.status} />
                        </td>
                        <td>
                          {o.status === 'ready' || o.status === 'dispatched' ? (
                            <button
                              disabled={busy || reason.trim().length < 8}
                              className="btn small"
                              onClick={() => status(o, o.status === 'ready' ? 'dispatched' : 'completed')}
                            >
                              {o.status === 'ready' ? 'Mark dispatched' : 'Mark completed'}
                              <ArrowRight size={13} />
                            </button>
                          ) : (
                            <span className="caption">
                              {o.status === 'completed'
                                ? 'All done'
                                : o.status === 'attention'
                                  ? 'Manual resolution required'
                                  : 'Waiting for integrations'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!orders.length && (
                <Empty title="A clear desk" body="Create a demo order in the store to get started." />
              )}
            </section>
          )}
          {view === 'operations' && ops && (
            <>
              <div className="stat-grid">
                <div className={`stat-card ${ops.summary.dlq ? 'stat-alert' : ''}`}>
                  <div>
                    <span className="eyebrow">NEEDS RECOVERY</span>
                    <AlertTriangle size={17} />
                  </div>
                  <strong>{ops.summary.dlq.toString().padStart(2, '0')}</strong>
                  <p>Jobs in the dead-letter queue</p>
                </div>
                <div className="stat-card">
                  <div>
                    <span className="eyebrow">OUTBOX</span>
                    <Box size={17} />
                  </div>
                  <strong>{ops.summary.outbox_pending.toString().padStart(2, '0')}</strong>
                  <p>Events waiting to be published</p>
                </div>
                <div className="stat-card">
                  <div>
                    <span className="eyebrow">DURABLE INBOX</span>
                    <ShieldCheck size={17} />
                  </div>
                  <strong>{ops.summary.inbox_received.toString().padStart(2, '0')}</strong>
                  <p>Distinct events received</p>
                </div>
                <div className="stat-card monitor-card">
                  <span className="eyebrow">THE BIGGER PICTURE</span>
                  <h3>Signals, in context.</h3>
                  <a href="http://localhost:3001/d/orderflow" target="_blank" rel="noreferrer">
                    Open Grafana <ArrowUpRight size={14} />
                  </a>
                  <a href="http://localhost:9090/alerts" target="_blank" rel="noreferrer">
                    View alerts <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>
              <section className="panel service-panel">
                <div>
                  <div className="eyebrow">CONTROLLED FAILURE LAB</div>
                  <h2>Make the unexpected happen.</h2>
                  <p>Pause an integration, place an order, then restore and recover.</p>
                </div>
                <div className="service-controls">
                  {ops.services.map((s) => (
                    <div key={s.service} className="service">
                      <span>
                        <span className={`live-dot ${s.available ? '' : 'red'}`} />
                        <strong>{s.service === 'inventory' ? 'Inventory' : 'Delivery'}</strong>
                        <small>{s.available ? 'Available' : 'Simulated outage'}</small>
                      </span>
                      <button
                        disabled={busy || reason.trim().length < 8}
                        className={`btn small ${s.available ? 'outline' : 'dark'}`}
                        onClick={() => control(s.service, !s.available)}
                      >
                        {s.available ? 'Simulate outage' : 'Restore service'}
                        {s.available ? <SlidersHorizontal size={13} /> : <RefreshCw size={13} />}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
              <div className="operations-grid">
                <section className="panel jobs-panel">
                  <div className="panel-heading">
                    <div>
                      <div className="eyebrow">INTEGRATION WORK</div>
                      <h2>A place for every task.</h2>
                    </div>
                    <span className="caption">Latest 100</span>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Order / operation</th>
                          <th>State</th>
                          <th>Attempts</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {ops.jobs.map((j) => (
                          <tr
                            className={selected?.id === j.id ? 'selected-row' : ''}
                            key={j.id}
                            onClick={() => setSelectedJob(j.id)}
                          >
                            <td>
                              <button className="job-select" onClick={() => setSelectedJob(j.id)}>
                                OF-{short(j.order_id)}
                                <small>{j.kind === 'reserve' ? 'Reserve inventory' : 'Book delivery'}</small>
                              </button>
                            </td>
                            <td>
                              <Badge value={j.state} />
                            </td>
                            <td>
                              {j.attempts} / 5
                              {j.recovery_count > 0 && (
                                <small className="recovery-count">Recovery #{j.recovery_count}</small>
                              )}
                            </td>
                            <td>
                              <ChevronRight size={15} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!ops.jobs.length && (
                    <Empty
                      title="Nothing waiting in the wings"
                      body="Place a demo order to see its integration tasks."
                    />
                  )}
                </section>
                <aside className="panel job-detail">
                  {selected ? (
                    <>
                      <div className="eyebrow">TASK DIAGNOSTICS</div>
                      <div className="panel-heading">
                        <h2>{selected.kind === 'reserve' ? 'Inventory reservation' : 'Delivery booking'}</h2>
                        <Badge value={selected.state} />
                      </div>
                      <Link className="text-link" href={`/orders/${selected.order_id}`}>
                        OF-{short(selected.order_id)} <ArrowUpRight size={14} />
                      </Link>
                      <dl>
                        <dt>Job ID</dt>
                        <dd>
                          <code>{selected.id}</code>
                        </dd>
                        <dt>Correlation / trace ID</dt>
                        <dd>
                          <code>{selected.trace_id}</code>
                          <button
                            className="copy"
                            aria-label="Copy trace ID"
                            onClick={() =>
                              navigator.clipboard
                                .writeText(selected.trace_id)
                                .then(() => setNotice('Trace ID copied'))
                                .catch(() => setError('Clipboard unavailable; select and copy the trace ID.'))
                            }
                          >
                            <Copy size={13} />
                          </button>
                        </dd>
                        <dt>Last integration error</dt>
                        <dd className={selected.last_error ? 'integration-error' : ''}>
                          {selected.last_error || 'No outstanding error'}
                        </dd>
                        <dt>Next scheduled attempt</dt>
                        <dd>
                          {selected.state === 'pending'
                            ? new Date(selected.next_run_at).toLocaleString()
                            : '—'}
                        </dd>
                      </dl>
                      <div className="recovery-actions">
                        <button
                          className="btn dark full"
                          disabled={busy || selected.state !== 'dlq' || reason.trim().length < 8}
                          onClick={() => recover(selected, 'retry')}
                        >
                          <RefreshCw size={15} /> Retry task
                        </button>
                        <button
                          className="btn outline full"
                          disabled={busy || selected.state !== 'dlq' || reason.trim().length < 8}
                          onClick={() => recover(selected, 'skip')}
                        >
                          Skip · needs business attention
                        </button>
                        <p>
                          Manual actions apply only to DLQ tasks. Retry keeps the external idempotency key.
                          Skip never advances fulfilment.
                        </p>
                      </div>
                      <details>
                        <summary>Find related logs</summary>
                        <pre>
                          docker compose logs --no-color worker hidden integrations | rg '{selected.trace_id}'
                        </pre>
                      </details>
                    </>
                  ) : (
                    <Empty title="Select a task" body="Its error, trace and recovery controls appear here." />
                  )}
                </aside>
              </div>
              <section className="panel audit-panel">
                <div className="panel-heading">
                  <div>
                    <div className="eyebrow">ACCOUNTABILITY, BUILT IN</div>
                    <h2>The audit trail.</h2>
                  </div>
                  <span className="caption">Latest 50 actions</span>
                </div>
                {ops.audit.map((a) => (
                  <div className="audit-row" key={a.id}>
                    <span className="audit-icon">
                      <Activity size={14} />
                    </span>
                    <div>
                      <strong>{a.action.replaceAll('.', ' / ')}</strong>
                      <p>{a.reason}</p>
                      <code>{a.target}</code>
                    </div>
                    <span className="audit-meta">
                      {a.actor}
                      <br />
                      {time(a.created_at)}
                    </span>
                  </div>
                ))}
                {!ops.audit.length && <p className="muted">Actions and their reasons will appear here.</p>}
              </section>
            </>
          )}
        </>
      )}
    </>
  );
}
