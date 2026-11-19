'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  Grid2X2,
  Search,
  Package,
  ShoppingCart,
  ArrowUpRight,
  Box,
  X,
  MapPin,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useOrderFlow } from './orderflow-provider';
export default function MarketplaceShell({ children }: { children: React.ReactNode }) {
  const { count, search, setSearch, setCategory, view, router, notice, error, setError, isStaff } =
    useOrderFlow();
  const [menu, setMenu] = useState(false);
  function browse(category: string) {
    setCategory(category);
    setMenu(false);
    router.push('/');
  }
  return (
    <>
      <div className="market-demo">
        <span>INDEPENDENT PORTFOLIO DEMO</span>
        <span>Fictional products · No real payments or shipments</span>
        <Link href="/operations">
          Explore the failure lab <ArrowUpRight size={11} />
        </Link>
      </div>
      <header className="market-header">
        <div className="market-header-main shell">
          <Link href="/" className="market-brand">
            <span>
              <Box size={25} />
            </span>
            order<span className="brand-flow">flow</span>
            <small>market</small>
          </Link>
          <div className="catalog-menu-wrap">
            <button className="catalog-button" onClick={() => setMenu(!menu)} aria-expanded={menu}>
              <Grid2X2 size={18} /> Catalog
            </button>
            {menu && (
              <div className="catalog-dropdown">
                {['All pieces', 'Lighting', 'Furniture', 'Objects'].map((c) => (
                  <button key={c} onClick={() => browse(c)}>
                    {c === 'All pieces' ? 'All departments' : c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <form
            className="market-search"
            onSubmit={(e) => {
              e.preventDefault();
              router.push('/');
            }}
          >
            <label className="sr-only" htmlFor="market-search">
              Search products
            </label>
            <input
              id="market-search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (view !== 'shop') router.push('/');
              }}
              placeholder="Search the marketplace"
            />
            {search && (
              <button type="button" aria-label="Clear search" onClick={() => setSearch('')}>
                <X size={15} />
              </button>
            )}
            <button className="search-submit" aria-label="Search marketplace">
              <Search size={21} />
            </button>
          </form>
          <nav className="market-account" aria-label="Account navigation">
            <Link href="/orders" className={view === 'orders' || view === 'tracking' ? 'active' : ''}>
              <Package size={21} />
              <span>My orders</span>
            </Link>
            <Link
              href="/cart"
              className={view === 'cart' ? 'active' : ''}
              aria-label={`Shopping cart, ${count} items`}
            >
              <span className="cart-icon">
                <ShoppingCart size={22} />
                {count > 0 && <b>{count}</b>}
              </span>
              <span>Cart</span>
            </Link>
          </nav>
        </div>
        <div className="market-header-bottom shell">
          <span className="market-location">
            <MapPin size={13} /> Demo City
          </span>
          <nav aria-label="Departments">
            {['Lighting', 'Furniture', 'Objects'].map((c) => (
              <button key={c} aria-label={`Shop ${c.toLowerCase()}`} onClick={() => browse(c)}>
                {c}
              </button>
            ))}
          </nav>
          <span className="market-assurance">A small catalog. Every order tracked.</span>
          <Link href="/operator" className="workspace-link">
            Staff workspace <ArrowUpRight size={13} />
          </Link>
        </div>
      </header>
      {notice && (
        <div role="status" className="toast">
          <Check size={16} />
          {notice}
        </div>
      )}
      <main className={`shell ${isStaff ? 'workspace' : ''}`}>
        {error && (
          <div role="alert" className="error">
            <AlertTriangle size={17} />
            <span>{error}</span>
            <button aria-label="Dismiss error" onClick={() => setError('')}>
              <X size={16} />
            </button>
          </div>
        )}
        {children}
      </main>
      <footer className="market-footer shell">
        <div>
          <Link href="/" className="market-brand">
            order<span className="brand-flow">flow</span>
          </Link>
          <p>Your everyday, in one place.</p>
        </div>
        <p>
          A fictional marketplace with a working order flow.
          <br />
          No real purchases, sellers or delivery.
        </p>
        <div>
          <Link href="/orders">Track an order</Link>
          <Link href="/operations">
            On-call workspace <ArrowUpRight size={12} />
          </Link>
        </div>
        <span>ENGINEERING DEMO · 2026</span>
      </footer>
    </>
  );
}
