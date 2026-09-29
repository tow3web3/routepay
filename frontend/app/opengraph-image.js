import { ImageResponse } from 'next/og';
import { CARD, COLORS, loadFonts, siteUrl, Wordmark, logoUrl } from '../lib/og';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const size = { width: CARD.width, height: CARD.height };
export const contentType = 'image/png';

export default async function Image() {
  const site = siteUrl();
  const fonts = await loadFonts();
  const font = fonts.length ? 'Manrope' : undefined;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: COLORS.ground, color: COLORS.ink, fontFamily: font, padding: 64, position: 'relative' }}>
        <div style={{ position: 'absolute', right: 64, top: 187, width: 256, height: 256, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={logoUrl(site)} width={256} height={256} alt="" />
        </div>
        <Wordmark siteUrl={site} size={32} />
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 800 }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 60, fontWeight: 800, lineHeight: 1.05, letterSpacing: -3 }}><span>Route your coin's fees</span><span style={{ color: COLORS.green }}>to any page on the internet.</span></div>
          <span style={{ fontSize: 26, color: COLORS.mut, marginTop: 22 }}>A YouTube channel, a GitHub account, a domain: each page gets its own vault, and its owner signs in to claim. Holders, wallets, buybacks and a treasury still work.</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, color: COLORS.mut }}>
          <span>Robinhood Chain · paid in stocks, ETH or any token · Telegram or web dashboard</span>
          <span>{site.replace(/^https?:\/\//, '')}</span>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
