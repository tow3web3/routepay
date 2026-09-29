import Navigation from '../../components/Navigation';
import TickerTape from '../../components/TickerTape';
import Footer from '../../components/Footer';
import StockUniverse from '../../components/StockUniverse';
import CTA from '../../components/CTA';
import { BRAND } from '../../lib/brand';

export const metadata = {
  title: `Stocks · ${BRAND}`,
  description: `The 195 Robinhood Stock Tokens on Robinhood Chain that ${BRAND} can pay out from a coin's fees.`,
};

export default function StocksPage() {
  return (
    <>
      <TickerTape />
      <Navigation />
      <main className="mx-auto max-w-6xl space-y-16 px-5 py-10">
        <StockUniverse />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
