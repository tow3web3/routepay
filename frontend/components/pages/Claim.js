'use client';

// Claim a page by connecting it: one click on a platform opens its sign-in,
// the pages of that account come back with what waits for them, and one
// signature from the wallet that should be paid sends it. A domain has no
// sign-in, so it connects with a DNS record. Nothing here costs gas.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Arrow, Check, Copy, PlatformIcon } from '../Icons';
import { PageAvatar, ClaimBadge, fmtUsd, fmtAmount, shortAddr } from './PageParts';
import { useWallet } from '../../lib/useWallet';
import { PLATFORMS, PLATFORM_KEYS, normalizeHandle, pageName, pagePath } from '../../lib/pages';
import { claimMessage } from '../../lib/claimMessage';
import { BRAND } from '../../lib/brand';

function Step({ n, title, done, children }) {
  return (
    <section className="frame p-5">
      <div className="flex items-center gap-3">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${done ? 'bg-hood-500 text-coal' : 'bg-tile text-ink'}`}>{done ? <Check className="h-3.5 w-3.5" /> : n}</span>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CopyLine({ label, value }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-ground px-3 py-2">
      <span className="w-12 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-mut">{label}</span>
      <code className="min-w-0 flex-1 break-all font-mono text-xs text-ink">{value}</code>
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1200); } catch { /* clipboard unavailable */ } }} className="shrink-0 text-mut transition hover:text-ink" aria-label={`Copy ${label}`}>
        {ok ? <Check className="h-4 w-4 text-hood-600" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function Claim({ initialPlatform = null, initialHandle = '', initialError = null, signed = false }) {
  const wallet = useWallet();
  const [platform, setPlatform] = useState(PLATFORMS[initialPlatform] ? initialPlatform : null);
  const [state, setState] = useState(null); // { platforms, proved }
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState(null);
  const [domain, setDomain] = useState(initialPlatform === 'domain' ? initialHandle : '');
  const [record, setRecord] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/claim', { cache: 'no-store' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not load');
      setState(d);
    } catch (e) {
      setState({ platforms: {}, proved: [] });
      setError((prev) => prev || e.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const proved = (state?.proved || []).filter((p) => p.platform === platform);
  const enabled = platform ? state?.platforms?.[platform] : false;
  const wanted = platform && platform !== 'domain' && initialHandle ? normalizeHandle(platform, initialHandle) : null;
  // Signed in, but as someone who does not run the page this visitor came for.
  const mismatch = wanted && proved.length > 0 && !proved.some((p) => p.handle === wanted);
  const cleanDomain = normalizeHandle('domain', domain);
  const connectUrl = (k) => `/api/oauth/${k}/start?return=${encodeURIComponent(`/claim?platform=${k}${wanted && k === platform ? `&handle=${encodeURIComponent(wanted)}` : ''}`)}`;
  const connected = (k) => (state?.proved || []).some((p) => p.platform === k);
  // One click: a platform that can connect goes straight to its sign-in.
  const pick = (k) => {
    setError(null); setRecord(null);
    if (k !== 'domain' && state?.platforms?.[k] && !connected(k)) { setBusy(`connect:${k}`); window.location.assign(connectUrl(k)); return; }
    setPlatform(k);
  };

  async function sign(target) {
    setError(null);
    setBusy(`${target.platform}:${target.handle}`);
    try {
      const addr = wallet.address || (await wallet.connect());
      if (!addr) throw new Error(wallet.available ? 'Connect a wallet first' : 'No wallet found. Install MetaMask or Rabby.');
      const n = await fetch('/api/app/auth/nonce', { cache: 'no-store' }).then((r) => r.json());
      if (!n?.nonce) throw new Error(n?.error || 'Could not get a nonce. Reload and try again.');
      const signature = await wallet.signMessage(claimMessage({ platform: target.platform, handle: target.handle, wallet: addr, nonce: n.nonce, issuedAt: n.issuedAt }), addr);
      const res = await fetch('/api/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform: target.platform, handle: target.handle, wallet: addr, nonce: n.nonce, issuedAt: n.issuedAt, signature }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Claim failed');
      setDone({ ...target, wallet: d.wallet, path: d.page, sweepStarted: d.sweepStarted });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function domainRecord() {
    setError(null);
    setBusy('record');
    try {
      const addr = wallet.address || (await wallet.connect());
      if (!addr) throw new Error(wallet.available ? 'Connect a wallet first' : 'No wallet found. Install MetaMask or Rabby.');
      const res = await fetch('/api/claim/domain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, wallet: addr }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not prepare the record');
      setRecord({ ...d, wallet: addr });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }
  // The record is made for one wallet: switching account makes it stale.
  useEffect(() => { if (record && wallet.address && record.wallet.toLowerCase() !== wallet.address.toLowerCase()) setRecord(null); }, [wallet.address, record]);

  if (done) {
    return (
      <div className="panel-glow mx-auto max-w-xl p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-hood-500 text-coal"><Check className="h-6 w-6" /></span>
        <h2 className="mt-4 font-display text-xl font-semibold text-ink">{pageName(done.platform, done.handle)} is yours</h2>
        <p className="mt-2 text-sm text-mut">
          Every payment to this page now goes to <span className="font-mono text-ink">{shortAddr(done.wallet)}</span>.{' '}
          {done.sweepStarted ? 'What waited in the vault is on its way: it arrives within a few minutes.' : 'What waited in the vault is sent within a few minutes.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={done.path} className="btn-primary">Open the profile <Arrow className="h-4 w-4" /></Link>
          <button type="button" onClick={() => setDone(null)} className="btn-ghost">Claim another page</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Step n={1} title="Connect your page" done={Boolean(platform) && (platform === 'domain' ? Boolean(record?.found) : connected(platform))}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PLATFORM_KEYS.map((k) => {
            const on = k === 'domain' || Boolean(state?.platforms?.[k]);
            return (
              <button key={k} type="button" onClick={() => pick(k)} disabled={busy === `connect:${k}`}
                className={`group flex flex-col items-start gap-2 rounded-xl border px-3 py-3 text-left transition ${platform === k ? 'border-hood-500 bg-hood-50' : 'border-line bg-ground hover:border-mut'}`}>
                <span className="flex w-full items-center justify-between">
                  <PlatformIcon platform={k} className="h-5 w-5 shrink-0" />
                  {connected(k) ? <Check className="h-3.5 w-3.5 text-hood-500" /> : <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-hood-500' : 'bg-line'}`} />}
                </span>
                <span className="text-sm font-semibold text-ink">{PLATFORMS[k].label}</span>
                <span className="label !text-[9.5px]">{busy === `connect:${k}` ? 'opening…' : connected(k) ? 'connected' : k === 'domain' ? 'DNS record' : on ? 'connect' : 'soon'}</span>
              </button>
            );
          })}
        </div>
      </Step>

      {platform && platform !== 'domain' && (
        <Step n={2} title={proved.length > 0 ? 'Choose the wallet that gets paid' : `Connect your ${PLATFORMS[platform].label} ${PLATFORMS[platform].noun}`} done={false}>
          {!state ? <div className="h-10 animate-pulse rounded-xl bg-tile" /> : proved.length > 0 ? (
            <>
              {mismatch && <p className="mb-3 rounded-xl border border-gold-300 bg-gold-50 px-3 py-2 text-sm text-gold-700">You signed in, but not as the owner of {pageName(platform, wanted)}. Sign in with the account that runs it.</p>}
              <ul className="space-y-2">
                {proved.map((p) => (
                  <li key={p.handle} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-ground p-3">
                    <PageAvatar page={p} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="truncate text-sm font-semibold text-ink">{p.name}</span>{p.exists && <ClaimBadge claimed={p.claimed} />}</div>
                      <div className="text-xs text-mut">
                        {p.claimed ? `Paid to ${shortAddr(p.claimedWallet)}. Sign again to change the wallet.`
                          : p.vaultUsd > 0 ? <><span className="figure font-semibold text-hood-600">{fmtUsd(p.vaultUsd)}</span> waiting in the vault{p.vaultAssets.length ? ` (${p.vaultAssets.slice(0, 3).map((a) => `${fmtAmount(a.amount)} ${a.symbol}`).join(', ')})` : ''}</>
                            : p.exists ? `${p.coins} coin${p.coins === 1 ? '' : 's'} routing, nothing in the vault yet`
                              : 'No coin routes here yet. Claim ahead and payments will reach you directly.'}
                      </div>
                    </div>
                    <button type="button" onClick={() => sign(p)} disabled={Boolean(busy)} className="btn-primary !py-2 text-xs">
                      {busy === `${p.platform}:${p.handle}` ? 'Check your wallet…' : wallet.connected ? `Pay ${shortAddr(wallet.address)}` : 'Connect wallet and claim'}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-mut">
                <span>{wallet.connected ? <>Paid to <span className="font-mono text-ink">{shortAddr(wallet.address)}</span>. <button type="button" onClick={wallet.switchAccount} className="font-semibold text-hood-600 hover:underline">Use another wallet</button></> : 'The wallet you connect is the one that gets paid.'}</span>
                <a href={connectUrl(platform)} className="font-semibold text-mut hover:text-ink">Connect another account</a>
              </div>
            </>
          ) : enabled ? (
            <>
              <a href={connectUrl(platform)} className="btn-ink">
                <PlatformIcon platform={platform} className="h-4 w-4" />Connect {PLATFORMS[platform].label}
              </a>
              <p className="mt-3 text-xs text-mut">{BRAND} reads which {PLATFORMS[platform].noun}s your account runs and nothing else: it cannot post, and it keeps no access afterwards.</p>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-ground px-4 py-3">
              <p className="text-sm text-mut">The {PLATFORMS[platform].label} connector opens soon. Until then your fees keep adding up in the vault of your {PLATFORMS[platform].noun}: nothing is lost.</p>
              <Link href="/pages" className="text-sm font-semibold text-ink hover:text-hood-600">Find your page</Link>
            </div>
          )}
        </Step>
      )}

      {platform === 'domain' && (
        <Step n={2} title="Connect your domain" done={Boolean(record?.found)}>
          <p className="text-sm text-mut">A domain has no sign-in: it connects with a DNS record. Connect the wallet that should be paid, then add the record where you manage the domain.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={domain} onChange={(e) => { setDomain(e.target.value); setRecord(null); }} placeholder="example.com" className="min-w-0 flex-1 rounded-xl border border-line bg-ground px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-mut/60 focus:border-hood-400" />
            <button type="button" onClick={domainRecord} disabled={!cleanDomain || busy === 'record'} className="btn-ink disabled:cursor-not-allowed disabled:opacity-50">{busy === 'record' ? 'Checking…' : record ? 'Check again' : wallet.connected ? 'Get my record' : 'Connect wallet'}</button>
          </div>
          {domain && !cleanDomain && <p className="mt-1.5 text-xs text-red-600">That is not a valid domain name.</p>}
          {record && (
            <div className="mt-4 space-y-2">
              <CopyLine label="Type" value="TXT" />
              <CopyLine label="Host" value={record.record.host} />
              <CopyLine label="Value" value={record.record.value} />
              <p className="text-xs text-mut">Some DNS panels want only <span className="font-mono text-ink">{record.record.name}</span> as the host. The value is tied to <span className="font-mono text-ink">{shortAddr(record.wallet)}</span>: it pays that wallet and no other.</p>
              {record.found ? (
                <button type="button" onClick={() => sign({ platform: 'domain', handle: record.domain })} disabled={Boolean(busy)} className="btn-primary mt-1">{busy === `domain:${record.domain}` ? 'Check your wallet…' : `Record found. Claim ${record.domain}`}</button>
              ) : (
                <p className="rounded-xl border border-gold-300 bg-gold-50 px-3 py-2 text-sm text-gold-700">Record not visible yet. DNS changes can take a few minutes: add it, then check again.</p>
              )}
            </div>
          )}
        </Step>
      )}

      <p className="px-1 text-xs leading-relaxed text-mut">
        Looking for a page? <Link href="/pages" className="font-semibold text-ink hover:text-hood-600">Browse the directory</Link>
        {platform && initialHandle && normalizeHandle(platform, initialHandle) ? <> or open <Link href={pagePath(platform, normalizeHandle(platform, initialHandle))} className="font-semibold text-ink hover:text-hood-600">{pageName(platform, normalizeHandle(platform, initialHandle))}</Link></> : null}.
        {signed && proved.length === 0 && state ? ' Your sign-in expired: sign in again.' : ''}
      </p>
    </div>
  );
}
