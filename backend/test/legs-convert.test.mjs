// runLeg: when the second half of a conversion (ETH -> target) fails after the
// first half (asset -> ETH) went through, the leg must not pay out the asset it
// no longer holds.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

const X = '0x1111111111111111111111111111111111111111';
const TARGET = '0x2222222222222222222222222222222222222222';
const DEST = '0x3333333333333333333333333333333333333333';
const ZERO = '0x0000000000000000000000000000000000000000';
const calls = [];

mock.module('../src/chain/config.js', { namedExports: {
  isNative: (a) => !a || a.toLowerCase() === ZERO, isAddress: (s) => /^0x[0-9a-fA-F]{40}$/.test(String(s || '')),
  short: (a) => a, formatEth: String, formatUnits: String, explorerTx: (h) => h, NATIVE_ETH: ZERO,
} });
mock.module('libphonenumber-js/min', { namedExports: { parsePhoneNumberFromString: () => null } });
mock.module('../src/services/swap.js', { namedExports: {
  // first half succeeds: the asset is sold for ETH
  swapTokenForEth: async ({ token, amountRaw }) => { calls.push(['sell', token, amountRaw]); return { hash: '0xsell', ethOut: 5n }; },
  // second half fails: e.g. the fair-price guard rejects every route
  swapEthForToken: async () => { throw new Error('No route delivers 90% of fair value'); },
} });
mock.module('../src/services/airdrop.js', { namedExports: { burnTokens: async () => '0xburn' } });
mock.module('../src/services/rewards.js', { namedExports: { describeReward: async (a) => ({ address: a, symbol: 'T', decimals: 18, isStock: false }) } });
mock.module('../src/services/oracle.js', { namedExports: { stockOracle: async () => null, tokenOracle: async () => null } });
mock.module('../src/services/treasury.js', { namedExports: {
  effectiveSplit: () => ({}), DEFAULT_TREASURY_ASSET: TARGET,
  sendAsset: async ({ asset, amount, to }) => { calls.push(['send', asset.address, amount, to]); return '0xsend'; },
} });
mock.module('../src/db/queries.js', { namedExports: { getPolicyLegs: async () => [], insertPagePayout: async () => {}, insertTreasuryLedger: async () => {} } });

const { runLeg } = await import('../src/services/legs.js');

test('a wallet leg whose conversion half-failed does not also send the sold asset', async () => {
  const asset = { address: X, symbol: 'GLD', decimals: 18, isNative: false, amount: 100n, valueWei: 10n };
  const leg = { id: 'l1', kind: 'wallet', shareBps: 3000, address: DEST, asset: TARGET, label: 'Partner' };
  const r = await runLeg({ config: { slippage_bps: 150 }, privateKey: '0x', asset, amount: 30n, leg });
  const sold = calls.filter((c) => c[0] === 'sell' && c[1] === X).reduce((s, c) => s + c[2], 0n);
  const sentX = calls.filter((c) => c[0] === 'send' && c[1] === X).reduce((s, c) => s + c[2], 0n);
  assert.ok(sold + sentX <= 30n, `the leg moved ${sold} GLD into a swap and sent ${sentX} GLD more: ${sold + sentX} of a 30 GLD share`);
});

test('a burn leg whose conversion half-failed reports the share as spent', async () => {
  calls.length = 0;
  const asset = { address: X, symbol: 'GLD', decimals: 18, isNative: false, amount: 100n, valueWei: 10n };
  const leg = { id: 'b1', kind: 'burn', shareBps: 1500, address: null, asset: null, label: 'Buyback & burn' };
  const r = await runLeg({ config: { slippage_bps: 150, source_token_address: TARGET }, privateKey: '0x', asset, amount: 15n, leg });
  assert.ok(r.failed);
  assert.equal(r.spent, true, 'the executor would fold 15 GLD that were already sold into the holders share');
});
