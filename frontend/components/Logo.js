// The ROUTEPAY mark: the R with the road running through it. The artwork is
// the owner's (design/routepay-logo-source.png). Here it is drawn without a
// tile: routepay-mark.png is the same artwork with its black background turned
// into transparency, so the R and its glow sit straight on the page. The
// square icons (routepay-64, -256, -512) keep the background and serve the
// browser tab and the share cards.
export function Mark({ className = 'h-10 w-10' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/routepay-mark.png" alt="" aria-hidden="true" width={256} height={256} className={`shrink-0 object-contain ${className}`} />
  );
}

export function Wordmark({ className = 'text-lg' }) {
  return (
    <span className={`whitespace-nowrap font-display font-semibold tracking-tight text-ink ${className}`}>
      ROUTE<span className="text-hood-500">PAY</span>
    </span>
  );
}

export default function Logo({ mark = 'h-10 w-10', text = 'text-xl' }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Mark className={mark} />
      <Wordmark className={text} />
    </span>
  );
}
