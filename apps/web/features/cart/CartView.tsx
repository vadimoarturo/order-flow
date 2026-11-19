'use client';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Plus, Minus, ShieldCheck } from 'lucide-react';
import { useOrderFlow } from '../orderflow/orderflow-provider';
import { Empty, ProductArt, money } from '../orderflow/shared';

export default function CartView() {
  const {
    products,
    cart,
    busy,
    customer,
    setCustomer,
    address,
    setAddress,
    count,
    subtotal,
    quantity,
    checkout,
  } = useOrderFlow();
  return (
    <>
      <div className="page-heading">
        <Link href="/" className="text-link">
          <ArrowLeft size={15} /> Back to marketplace
        </Link>
        <div className="eyebrow">ORDERFLOW MARKET</div>
        <h1>Your cart.</h1>
        <p>Review your finds and place a demo order.</p>
      </div>
      {count === 0 ? (
        <Empty title="Your cart is empty" body="Browse the catalog and add your first item.">
          <Link href="/" className="btn dark">
            Browse catalog <ArrowRight size={16} />
          </Link>
        </Empty>
      ) : (
        <div className="checkout-grid">
          <section className="panel cart-panel">
            <h2>
              Items in your cart <span className="muted">({count})</span>
            </h2>
            {products
              .filter((p) => cart[p.id])
              .map((p) => (
                <div className="cart-item" key={p.id}>
                  <div className={`cart-art ${p.color}`}>
                    <ProductArt id={p.id} />
                  </div>
                  <div className="cart-item-copy">
                    <span className="eyebrow">{p.category}</span>
                    <h3>{p.name}</h3>
                    <p>{money(p.price)}</p>
                    <div className="stepper">
                      <button aria-label={`Remove one ${p.name}`} onClick={() => quantity(p.id, -1)}>
                        <Minus size={12} />
                      </button>
                      <span>{cart[p.id]}</span>
                      <button aria-label={`Add one ${p.name}`} onClick={() => quantity(p.id, 1)}>
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  <strong>{money(p.price * cart[p.id])}</strong>
                </div>
              ))}
            <div className="bag-total">
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <p className="caption">Demo delivery is included. Prices are fictional.</p>
          </section>
          <form className="panel checkout-form" onSubmit={checkout}>
            <div className="eyebrow">ONE LAST THING</div>
            <h2>Delivery details</h2>
            <p>Use fictional details for this demonstration.</p>
            <label>
              Full name
              <input
                required
                minLength={2}
                maxLength={100}
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Alex Morgan"
                autoComplete="off"
              />
            </label>
            <label>
              Delivery address
              <textarea
                required
                minLength={8}
                maxLength={300}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="24 Willow Lane, Demo City"
                autoComplete="off"
              />
            </label>
            <div className="checkout-note">
              <ShieldCheck size={20} />
              <span>
                No payment details needed.
                <br />
                This order stays inside the demo.
              </span>
            </div>
            <div className="bag-total">
              <span>Total</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <button className="btn dark full" disabled={busy}>
              {busy ? 'Saving your order…' : 'Place demo order'}
              <ArrowRight size={17} />
            </button>
            <span className="caption">Your order is saved before integrations begin.</span>
          </form>
        </div>
      )}
    </>
  );
}
