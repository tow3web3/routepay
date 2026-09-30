// Everything that names the product lives here: the brand, its links and its
// token. Change a handle or the domain in the environment, not in components.
export const BRAND = 'ROUTEPAY';
export const TAGLINE = 'Route your fees anywhere';
export const DESCRIPTION =
  'ROUTEPAY routes the creator fees of any coin on Robinhood Chain: to holders, wallets, buybacks, a treasury, and now to any page on the internet. A YouTube channel, a GitHub account, a domain, an Instagram or a Facebook page gets its own vault; its owner signs in and claims.';

// The domain moves with NEXT_PUBLIC_SITE_URL. The fallback is the domain the
// product runs on.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://routepay.dev').replace(/\/$/, '');
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

// The accounts of the brand. Each one is set in the environment; a link that is
// not set is simply not shown, so the site never points at an account that is
// not ours.
export const BOT_USERNAME = (process.env.NEXT_PUBLIC_BOT_USERNAME || '').replace(/^@/, '');
export const BOT_URL = BOT_USERNAME ? `https://t.me/${BOT_USERNAME}` : '';
export const X_URL = process.env.NEXT_PUBLIC_X_URL || '';
export const X_HANDLE = X_URL ? X_URL.replace(/\/+$/, '').split('/').pop().replace(/^@/, '') : '';
// How a shared post names us: the X account when there is one, else the name.
export const CREDIT = X_HANDLE ? `@${X_HANDLE}` : BRAND;
export const COMMUNITY_URL = process.env.NEXT_PUBLIC_COMMUNITY_URL || '';
export const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com/tow3web3/routepay';
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@routepay.dev';

// The project token. Empty until it is live: every token feature (lottery,
// missions, the live link) stays off while the address is missing.
export const TOKEN_SYMBOL = (process.env.NEXT_PUBLIC_TOKEN_SYMBOL || 'ROUTE').replace(/^\$/, '');
export const TOKEN_CA = process.env.NEXT_PUBLIC_TOKEN_CA || '';
export const TOKEN = `$${TOKEN_SYMBOL}`;
