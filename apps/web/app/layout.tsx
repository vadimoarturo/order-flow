import type { Metadata } from 'next';
import { OrderFlowProvider } from '../features/orderflow/orderflow-provider';
import MarketplaceShell from '../features/orderflow/marketplace-shell';
import './globals.css';
import './marketplace.css';
export const metadata: Metadata = {
  title: 'OrderFlow Market — Your everyday, in one place.',
  description:
    'An independent marketplace demo with real order persistence, inventory reservation and integration recovery. No real payments or shipments.',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <OrderFlowProvider>
          <MarketplaceShell>{children}</MarketplaceShell>
        </OrderFlowProvider>
      </body>
    </html>
  );
}
