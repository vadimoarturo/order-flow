'use client';
import Link from 'next/link';
import { ArrowRight, Package } from 'lucide-react';
import { useOrderFlow } from '../orderflow/orderflow-provider';
import { Empty, short } from '../orderflow/shared';

export default function SavedOrdersView() {
  const { saved } = useOrderFlow();
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">A LITTLE ANTICIPATION</div>
        <h1>Your orders.</h1>
        <p>Every step, from a good idea to your doorstep.</p>
      </div>
      <div className="saved-orders">
        {Object.keys(saved)
          .reverse()
          .map((id) => (
            <Link className="panel saved-order" href={`/orders/${id}`} key={id}>
              <Package size={24} />
              <div>
                <span className="eyebrow">DEMO ORDER</span>
                <h3>OF-{short(id)}</h3>
              </div>
              <span className="text-link">
                Track order <ArrowRight size={16} />
              </span>
            </Link>
          ))}
      </div>
      {Object.keys(saved).length === 0 && (
        <Empty title="The beginning of a good story" body="Your orders will appear here after checkout.">
          <Link href="/" className="btn dark">
            Find your favourites <ArrowRight size={16} />
          </Link>
        </Empty>
      )}
    </>
  );
}
