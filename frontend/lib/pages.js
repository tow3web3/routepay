// Pages: the places on the internet a coin can route fees to. A page is a
// (platform, handle) pair, e.g. github:your-project or domain:example.com. This
// file is the registry of platforms and the parser that turns whatever a
// creator pastes (a URL, an @handle, a domain) into that pair. No I/O here, so
// the browser and the server share it.

export const PLATFORMS = {
  youtube: { label: 'YouTube', noun: 'channel', color: '#FF0033', placeholder: 'youtube.com/@channel', proof: 'oauth', hosts: ['youtube.com', 'youtu.be'] },
  github: { label: 'GitHub', noun: 'account', color: '#F0F6FC', placeholder: 'github.com/username', proof: 'oauth', hosts: ['github.com'] },
  x: { label: 'X', noun: 'account', color: '#FFFFFF', placeholder: 'x.com/handle', proof: 'oauth', hosts: ['x.com', 'twitter.com'] },
  instagram: { label: 'Instagram', noun: 'account', color: '#E1306C', placeholder: 'instagram.com/handle', proof: 'oauth', hosts: ['instagram.com'] },
  facebook: { label: 'Facebook', noun: 'page', color: '#1877F2', placeholder: 'facebook.com/page', proof: 'oauth', hosts: ['facebook.com', 'fb.com'] },
  tiktok: { label: 'TikTok', noun: 'account', color: '#25F4EE', placeholder: 'tiktok.com/@handle', proof: 'oauth', hosts: ['tiktok.com'] },
  twitch: { label: 'Twitch', noun: 'channel', color: '#9146FF', placeholder: 'twitch.tv/channel', proof: 'oauth', hosts: ['twitch.tv'] },
  domain: { label: 'Domain', noun: 'website', color: '#19D13B', placeholder: 'example.com', proof: 'dns', hosts: [] },
};
export const PLATFORM_KEYS = Object.keys(PLATFORMS);

const HANDLE_RULES = {
  youtube: /^(@[a-z0-9._-]{3,30}|UC[A-Za-z0-9_-]{22})$/,
  github: /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/,
  x: /^[a-z0-9_]{1,15}$/,
  instagram: /^[a-z0-9._]{1,30}$/,
  facebook: /^[a-z0-9.]{3,80}$/,
  tiktok: /^[a-z0-9._]{2,24}$/,
  twitch: /^[a-z0-9_]{3,25}$/,
  domain: /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/,
};
// First path segments that are part of the platform, not somebody's page.
const RESERVED = {
  youtube: ['watch', 'shorts', 'playlist', 'feed', 'results', 'live', 'embed', 'premium', 'gaming'],
  github: ['orgs', 'settings', 'marketplace', 'explore', 'topics', 'features', 'pricing', 'login', 'join', 'sponsors', 'about', 'notifications', 'pulls', 'issues', 'search'],
  x: ['home', 'explore', 'i', 'search', 'settings', 'messages', 'notifications', 'intent', 'share', 'hashtag', 'compose'],
  instagram: ['p', 'reel', 'reels', 'explore', 'stories', 'accounts', 'direct', 'tv'],
  facebook: ['watch', 'groups', 'events', 'marketplace', 'gaming', 'login', 'sharer', 'share', 'photo', 'photos', 'story.php', 'permalink.php', 'profile.php', 'people', 'pages'],
  tiktok: ['foryou', 'following', 'explore', 'live', 'discover', 'tag', 'music', 'upload'],
  twitch: ['directory', 'videos', 'settings', 'downloads', 'subscriptions', 'wallet', 'p', 'search'],
};

/**
 * Canonical handle for a platform, or null when it cannot be one. Lowercase, no
 * leading @. YouTube is the exception twice: handles keep their @ because they
 * share a namespace with channel ids, and channel ids keep their case.
 */
export function normalizeHandle(platform, raw) {
  if (!PLATFORMS[platform]) return null;
  const exact = String(raw || '').trim();
  if (platform === 'youtube' && /^UC[A-Za-z0-9_-]{22}$/.test(exact)) return exact;
  let h = exact.toLowerCase();
  if (!h) return null;
  if (platform === 'domain') {
    h = h.replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[/?#:]/)[0].replace(/\.$/, '');
  } else if (platform === 'youtube') {
    h = `@${h.replace(/^@+/, '')}`;
  } else {
    h = h.replace(/^@+/, '');
  }
  if (!HANDLE_RULES[platform].test(h)) return null;
  if (RESERVED[platform]?.includes(h.replace(/^@/, ''))) return null;
  return h;
}

/**
 * Turn what a creator typed into { platform, handle }. Accepts a full URL, a
 * bare domain, or "platform:handle". With `hint`, a bare handle is read as a
 * handle on that platform. Returns { error } when nothing fits.
 */
export function parsePage(input, hint = null) {
  const raw = String(input || '').trim();
  if (!raw) return { error: 'Paste a link or a handle' };
  if (raw.length > 300) return { error: 'That link is too long' };

  const tagged = raw.match(/^([a-z]+):(?!\/\/)(.+)$/i);
  if (tagged && PLATFORMS[tagged[1].toLowerCase()]) return finish(tagged[1].toLowerCase(), tagged[2]);

  const looksLikeUrl = /^[a-z]+:\/\//i.test(raw) || /^[^\s/@]+\.[a-z]{2,24}(\/|$)/i.test(raw);
  if (looksLikeUrl) {
    let url;
    try { url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return { error: 'That does not look like a link' }; }
    if (!/^https?:$/.test(url.protocol)) return { error: 'Only web links are supported' };
    const host = url.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
    const platform = PLATFORM_KEYS.find((k) => PLATFORMS[k].hosts.some((h) => host === h || host.endsWith(`.${h}`)));
    if (!platform) return finish('domain', host);
    const segs = url.pathname.split('/').filter(Boolean).map((s) => decodeURIComponent(s));
    if (!segs.length) return { error: `That is ${PLATFORMS[platform].label} itself. Paste the link of one ${PLATFORMS[platform].noun}.` };
    if (platform === 'youtube') {
      if (segs[0].startsWith('@')) return finish(platform, segs[0]);
      if (segs[0] === 'channel' && segs[1]) return finish(platform, segs[1]);
      if ((segs[0] === 'c' || segs[0] === 'user') && segs[1]) return { error: 'Use the channel\'s @handle link (youtube.com/@name) or its /channel/UC… link' };
      return { error: 'Paste a channel link (youtube.com/@name), not a video' };
    }
    if (platform === 'facebook' && segs[0] === 'profile.php') return { error: 'Personal profiles cannot receive fees. Paste a Facebook page link.' };
    return finish(platform, segs[0]);
  }

  if (hint && PLATFORMS[hint]) return finish(hint, raw);
  if (raw.startsWith('@')) return { error: 'Which platform is that handle on? Paste the full link.' };
  return { error: 'Paste the full link to the page (for example github.com/username)' };

  function finish(platform, handle) {
    const h = normalizeHandle(platform, handle);
    if (!h) return { error: `That is not a valid ${PLATFORMS[platform].label} ${platform === 'domain' ? 'name' : 'handle'}` };
    return { platform, handle: h };
  }
}

/** The public URL of a page on its own platform. */
export function pageUrl(platform, handle) {
  const h = String(handle || '');
  switch (platform) {
    case 'youtube': return h.startsWith('@') ? `https://www.youtube.com/${h}` : `https://www.youtube.com/channel/${h}`;
    case 'github': return `https://github.com/${h}`;
    case 'x': return `https://x.com/${h}`;
    case 'instagram': return `https://www.instagram.com/${h}`;
    case 'facebook': return `https://www.facebook.com/${h}`;
    case 'tiktok': return `https://www.tiktok.com/@${h}`;
    case 'twitch': return `https://www.twitch.tv/${h}`;
    case 'domain': return `https://${h}`;
    default: return null;
  }
}

/** How a page is written in text: "@yourchannel", "your-project", "example.com". */
export function pageName(platform, handle) {
  const h = String(handle || '');
  if (platform === 'domain' || platform === 'github' || platform === 'twitch' || platform === 'facebook') return h;
  if (platform === 'youtube' && !h.startsWith('@')) return `channel ${h.slice(0, 8)}…`;
  return h.startsWith('@') ? h : `@${h}`;
}

/** The picture of a page, served by the site: its avatar or favicon, else the logo of its platform. Never empty. */
export const pageAvatar = (platform, handle) => `/api/pages/avatar/${platform}/${encodeURIComponent(handle)}`;

/** The ROUTEPAY path of a page: /p/github/your-project. */
export const pagePath = (platform, handle) => `/p/${platform}/${encodeURIComponent(handle)}`;
export const pageKey = (platform, handle) => `${platform}:${handle}`;
