// Coins launched on PONS trade on a bonding curve until they graduate to a
// Uniswap pool. While they do, the curve is the market: the Uniswap pool that
// the screener may list for them holds a few dollars and quotes nonsense. This
// finds a coin's curve, quotes it, and buys on it.
//
// The factory keeps a launch record per token, which names its curve
// (getLaunchedToken). The curve itself answers token(), graduated(), feeBps() and
// buy(amountIn, minOut, recipient) payable, which returns the tokens bought.
import { parseAbi } from 'viem';
import { publicClient, walletFor, confirm, erc20Abi, explorerTx } from '../chain/config.js';

export const PONS_FACTORY = (process.env.PONS_FACTORY || '0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e').toLowerCase();
const CURVE_ABI = parseAbi([
  'function token() view returns (address)',
  'function graduated() view returns (bool)',
  'function feeBps() view returns (uint256)',
  'function buy(uint256 amountIn, uint256 minOut, address recipient) payable returns (uint256 amountOut)',
]);
// The factory keeps every launch: getLaunchedToken(token) returns the launch record,
// whose first two fields are the token and its curve (zero for a token it did not launch).
const FACTORY_ABI = parseAbi(['function getLaunchedToken(address token) view returns (address launchedToken, address curve)']);
const PROBE = 10n ** 14n; // 0.0001 ETH: small enough to read the spot price

const cache = new Map(); // token -> { curve|null, ts }
const TTL = 30 * 60 * 1000;

/** The PONS curve of a token, or null when it was not launched there (or already graduated). Cached half an hour. */
export async function curveFor(token) {
  const key = token.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) return hit.curve;
  let curve = null;
  try {
    const client = publicClient();
    const [launched, found] = await client.readContract({ address: PONS_FACTORY, abi: FACTORY_ABI, functionName: 'getLaunchedToken', args: [token] });
    if (launched.toLowerCase() === key && !/^0x0{40}$/i.test(found)) curve = found;
    if (curve) {
      const [t, graduated] = await Promise.all([
        client.readContract({ address: curve, abi: CURVE_ABI, functionName: 'token' }),
        client.readContract({ address: curve, abi: CURVE_ABI, functionName: 'graduated' }),
      ]);
      if (t.toLowerCase() !== key || graduated) curve = null;
    }
  } catch (e) {
    console.log(`   PONS lookup failed: ${(e.shortMessage || e.message).slice(0, 120)}`);
    return null; // not cached: try again next cycle
  }
  cache.set(key, { curve, ts: Date.now() });
  return curve;
}

/** Tokens the curve gives for `amountWei` of ETH right now, by simulating the buy. */
export async function quoteCurve(curve, amountWei, recipient) {
  const { result } = await publicClient().simulateContract({
    address: curve, abi: CURVE_ABI, functionName: 'buy', args: [amountWei, 0n, recipient], value: amountWei, account: recipient,
  });
  return result;
}

/**
 * Quote with the guard: the fill against the curve's own spot price (a tiny
 * probe buy). Returns { out, ratio } or null when the fill is below minRatio,
 * which on a curve means price impact alone.
 */
export async function quoteCurveGuarded({ curve, amountWei, recipient, minRatio }) {
  const [probe, out] = await Promise.all([quoteCurve(curve, PROBE, recipient), quoteCurve(curve, amountWei, recipient)]);
  if (probe <= 0n || out <= 0n) return null;
  const atSpot = (probe * amountWei) / PROBE;
  const ratio = Number((out * 10_000n) / atSpot) / 10_000;
  return ratio >= minRatio ? { out, ratio } : { out, ratio, rejected: true };
}

/** Buy on the curve from the dev wallet. Returns { hash, outputAmount }. */
export async function buyOnCurve({ privateKey, token, curve, amountWei, expectedOut, slippageBps = 300 }) {
  const { account, wallet } = walletFor(privateKey);
  const client = publicClient();
  const before = await client.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
  const minOut = (expectedOut * BigInt(10_000 - slippageBps)) / 10_000n;
  const hash = await wallet.writeContract({ address: curve, abi: CURVE_ABI, functionName: 'buy', args: [amountWei, minOut, account.address], value: amountWei });
  await confirm(hash, 'PONS curve buy');
  const after = await client.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
  const outputAmount = after - before;
  if (outputAmount <= 0n) throw new Error('Curve buy confirmed but no tokens received');
  console.log(`   Bought on the PONS curve: ${explorerTx(hash)} (received ${outputAmount.toString()} raw)`);
  return { hash, outputAmount };
}
