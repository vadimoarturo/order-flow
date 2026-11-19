'use client';
import { Package } from 'lucide-react';
export const money = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n / 100);
export const time = (s: string) =>
  new Date(s).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
export const short = (s: string) => s.slice(0, 8).toUpperCase();
export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const r = await fetch(`/api/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || `Request failed (${r.status})`);
  return data;
}
export function Badge({ value }: { value: string }) {
  return <span className={`badge badge-${value}`}>{value.replaceAll('_', ' ')}</span>;
}
export function Empty({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Package size={36} strokeWidth={1.2} />
      <h2>{title}</h2>
      <p>{body}</p>
      {children}
    </div>
  );
}
export function ProductArt({ id, className = '' }: { id: string; className?: string }) {
  return <img className={`product-art ${className}`} src={`/products/${id}.svg`} alt="" />;
}
