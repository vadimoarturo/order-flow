'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Package,
  Truck,
  ShieldCheck,
  Plus,
  Check,
  SlidersHorizontal,
  Lightbulb,
  Armchair,
  Shapes,
  X,
} from 'lucide-react';
import { useOrderFlow } from '../orderflow/orderflow-provider';
import { ProductArt, Empty, money } from '../orderflow/shared';
export default function MarketplaceView() {
  const { products, cart, quantity, setNotice, category, setCategory, search, setSearch, loaded } =
    useOrderFlow();
  const [sort, setSort] = useState('featured'),
    [inStock, setInStock] = useState(false);
  const filtered = products.filter(
    (p) =>
      (category === 'All pieces' || p.category === category) &&
      (!inStock || p.stock > 0) &&
      `${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  if (sort === 'low') filtered.sort((a, b) => a.price - b.price);
  if (sort === 'high') filtered.sort((a, b) => b.price - a.price);
  if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <section className="market-campaigns">
        <div className="market-campaign-main">
          <span className="campaign-label">THE HOME EDIT</span>
          <h1>
            Good finds.
            <br />
            For your everyday.
          </h1>
          <p>
            A little light. A comfortable corner.
            <br />
            Discover pieces that feel right at home.
          </p>
          <a href="#collection" className="market-cta">
            Shop the collection <ArrowRight size={16} />
          </a>
          <div className="campaign-art">
            <ProductArt id="chair" />
            <ProductArt id="lamp" />
          </div>
          <span className="campaign-footnote">ORIGINAL DEMO COLLECTION · 06 PIECES</span>
        </div>
        <div className="market-campaign-side">
          <div className="campaign-side-copy">
            <span className="campaign-label">FROM CART TO DOORSTEP</span>
            <h2>
              Know where
              <br />
              your order stands.
            </h2>
            <p>Follow every step in one place.</p>
            <Link href="/orders">
              My orders <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="parcel-illustration">
            <Package size={76} strokeWidth={1} />
            <span>
              <Check size={17} />
            </span>
          </div>
        </div>
      </section>
      <div className="market-benefits">
        <span>
          <Truck size={18} />
          <strong>Demo delivery included</strong>
          <small>No checkout surprises</small>
        </span>
        <span>
          <ShieldCheck size={18} />
          <strong>Your order stays saved</strong>
          <small>Even during an integration outage</small>
        </span>
        <span>
          <Package size={18} />
          <strong>Clear order tracking</strong>
          <small>From checkout to completion</small>
        </span>
      </div>
      <section id="collection" className="market-collection">
        <div className="market-section-heading">
          <div>
            <span className="eyebrow">PICK YOUR NEXT FAVOURITE</span>
            <h2>
              Everyday essentials <span>{products.length}</span>
            </h2>
          </div>
          <span className="collection-note">Fictional products. Real order processing.</span>
        </div>
        <div className="market-category-tiles">
          {[
            { name: 'All pieces', label: 'All departments', Icon: Shapes },
            { name: 'Lighting', label: 'Lighting', Icon: Lightbulb },
            { name: 'Furniture', label: 'Furniture', Icon: Armchair },
            { name: 'Objects', label: 'Objects', Icon: Package },
          ].map(({ name, label, Icon }) => (
            <button
              key={name}
              className={category === name ? 'selected' : ''}
              aria-label={name}
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
            >
              <span>
                <Icon size={22} strokeWidth={1.6} />
              </span>
              {label}
            </button>
          ))}
        </div>
        <div className="market-catalog-layout">
          <aside className="market-filters">
            <h3>
              <SlidersHorizontal size={16} /> Refine your finds
            </h3>
            <span className="filter-title">DEPARTMENT</span>
            {['All pieces', 'Lighting', 'Furniture', 'Objects'].map((c) => (
              <label key={c} className="filter-radio">
                <input
                  type="radio"
                  name="department"
                  checked={category === c}
                  onChange={() => setCategory(c)}
                />
                <span>{c === 'All pieces' ? 'All departments' : c}</span>
                <small>{products.filter((p) => c === 'All pieces' || p.category === c).length}</small>
              </label>
            ))}
            <div className="filter-divider" />
            <span className="filter-title">AVAILABILITY</span>
            <label className="stock-filter">
              <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} /> In
              stock only
            </label>
            <div className="filter-help">
              <ShieldCheck size={21} />
              <strong>Just exploring?</strong>
              <p>Use fictional details at checkout. No payment information is needed.</p>
            </div>
            <Link href="/operations" className="filter-lab-link">
              Explore the failure lab <ArrowUpRight size={13} />
            </Link>
          </aside>
          <div className="market-results">
            <div className="market-results-toolbar">
              <p>
                <strong>{filtered.length}</strong> {filtered.length === 1 ? 'item' : 'items'}
                {search && (
                  <>
                    {' '}
                    for <b>“{search}”</b>
                  </>
                )}
              </p>
              <label>
                Sort by{' '}
                <select aria-label="Sort products" value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="featured">Featured</option>
                  <option value="low">Price: low to high</option>
                  <option value="high">Price: high to low</option>
                  <option value="name">Name</option>
                </select>
              </label>
            </div>
            {(search || category !== 'All pieces' || inStock) && (
              <div className="active-filters">
                {category !== 'All pieces' && (
                  <button onClick={() => setCategory('All pieces')}>
                    {category}
                    <X size={12} />
                  </button>
                )}
                {search && (
                  <button onClick={() => setSearch('')}>
                    {search}
                    <X size={12} />
                  </button>
                )}
                {inStock && (
                  <button onClick={() => setInStock(false)}>
                    In stock
                    <X size={12} />
                  </button>
                )}
              </div>
            )}
            <div className="market-products">
              {filtered.map((p) => (
                <article className="market-product" key={p.id}>
                  <div className={`market-product-image ${p.color}`}>
                    <span className="market-product-tag">{p.category}</span>
                    <ProductArt id={p.art} />
                  </div>
                  <div className="market-product-info">
                    <div className="market-product-price">
                      {money(p.price)}
                      <span>Demo price</span>
                    </div>
                    <h3>{p.name}</h3>
                    <p className="market-product-description">{p.description}</p>
                    <span className={`market-stock ${p.stock > 0 ? '' : 'sold-out'}`}>
                      <span />
                      {p.stock > 0 ? 'In stock' : 'Sold out'}
                    </span>
                    <span className="market-product-delivery">
                      <Truck size={13} /> Demo delivery included
                    </span>
                    <button
                      className={`market-add-button ${cart[p.id] ? 'has-items' : ''}`}
                      disabled={p.stock === 0 || cart[p.id] >= Math.min(10, p.stock)}
                      aria-label={`Add ${p.name} to cart`}
                      onClick={() => {
                        quantity(p.id, 1);
                        setNotice(`${p.name} added to your cart`);
                      }}
                    >
                      {cart[p.id] ? (
                        <>
                          <Check size={15} />
                          {cart[p.id]} in cart · add one
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Add to cart
                        </>
                      )}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!loaded && <p className="catalog-loading">Loading the marketplace…</p>}
            {loaded && !filtered.length && (
              <Empty title="No matches this time" body="Try another search or clear a filter.">
                <button
                  className="btn dark"
                  onClick={() => {
                    setSearch('');
                    setCategory('All pieces');
                    setInStock(false);
                  }}
                >
                  Clear filters
                </button>
              </Empty>
            )}
          </div>
        </div>
      </section>
      <section className="market-demo-banner">
        <div>
          <span className="eyebrow">THERE’S MORE BEHIND THE CHECKOUT</span>
          <h2>An order worth following.</h2>
          <p>Explore the operator and on-call workspaces to see how this demo handles the unexpected.</p>
        </div>
        <Link className="btn dark" href="/operations">
          Explore the demo <ArrowUpRight size={16} />
        </Link>
      </section>
    </>
  );
}
