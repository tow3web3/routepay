// The ROUTEPAY mark: the R with the route running through it. The artwork is
// the owner's (design/routepay-logo-source.png); the files under public/brand
// are cut from it. It sits on its own black tile, so a hairline keeps the tile
// readable on the dark page.
export function Mark({ className = 'h-8 w-8' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/routepay-256.png" alt="" aria-hidden="true" width={256} height={256} className={`shrink-0 rounded-[22%] border border-line object-cover ${className}`} />
  );
}

export function Wordmark({ className = 'text-lg' }) {
  return (
    <span className={`whitespace-nowrap font-display font-semibold tracking-tight text-ink ${className}`}>
      ROUTE<span className="text-hood-500">PAY</span>
    </span>
  );
}

export default function Logo({ mark = 'h-8 w-8', text = 'text-lg' }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark className={mark} />
      <Wordmark className={text} />
    </span>
  );
}
