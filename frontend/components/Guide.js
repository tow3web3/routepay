// The guide: an index that stays in view, and sections made of paragraphs,
// numbered steps on a rail, small tables, callouts and links.
import Link from 'next/link';
import { Arrow } from './Icons';

const anchor = (s) => s.id || s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (i) => String(i + 1).padStart(2, '0');

function Steps({ steps }) {
  return (
    <ol className="relative ml-3 border-l border-line">
      {steps.map((s, i) => (
        <li key={s.title} className="relative pb-6 pl-7 last:pb-0">
          <span className="figure absolute -left-[13px] top-0 flex h-[25px] w-[25px] items-center justify-center rounded-full border border-hood-300 bg-ground font-mono text-[10px] font-semibold text-hood-500">{i + 1}</span>
          <div className="text-[15px] font-semibold leading-[25px] text-ink">{s.title}</div>
          <p className="mt-1 text-[15px] leading-relaxed text-mut">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

function Block({ b }) {
  if (typeof b === 'string') return <p>{b}</p>;
  if (b.steps) return <Steps steps={b.steps} />;
  if (b.rows) {
    return (
      <dl className="overflow-hidden rounded-xl border border-line">
        {b.rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 border-b border-line bg-paper px-4 py-3 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-4">
            <dt className="text-sm font-semibold text-ink">{k}</dt>
            <dd className="text-sm text-mut">{v}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (b.note) {
    return (
      <p className="relative rounded-xl border border-line bg-paper py-3 pl-5 pr-4 text-sm leading-relaxed text-ink">
        <span aria-hidden="true" className="absolute inset-y-3 left-0 w-[2px] rounded-full bg-hood-500" />
        {b.note}
      </p>
    );
  }
  if (b.link) {
    const out = /^https?:/.test(b.link);
    const cls = 'inline-flex items-center gap-1.5 text-sm font-semibold text-hood-500 transition hover:text-hood-400';
    return out
      ? <p><a href={b.link} target="_blank" rel="noopener noreferrer" className={cls}>{b.label}<Arrow className="h-3.5 w-3.5" /></a></p>
      : <p><Link href={b.link} className={cls}>{b.label}<Arrow className="h-3.5 w-3.5" /></Link></p>;
  }
  return null;
}

export default function Guide({ eyebrow, title, intro, sections }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
      <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        <div className="label">Contents</div>
        <ol className="mt-3 space-y-1.5 border-l border-line">
          {sections.map((s, i) => (
            <li key={s.title}>
              <a href={`#${anchor(s)}`} className="-ml-px flex gap-2.5 border-l border-transparent py-0.5 pl-3 text-sm text-mut transition hover:border-hood-500 hover:text-ink">
                <span className="figure font-mono text-[11px] leading-5 text-mut/60">{num(i)}</span>{s.title}
              </a>
            </li>
          ))}
        </ol>
      </aside>

      <article className="min-w-0 max-w-2xl">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-3 font-display text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl">{title}</h1>
        <p className="mt-4 text-base leading-relaxed text-mut">{intro}</p>

        {/* On a phone, the contents as chips under the title */}
        <div className="mt-6 flex flex-wrap gap-1.5 lg:hidden">
          {sections.map((s, i) => <a key={s.title} href={`#${anchor(s)}`} className="rounded-full border border-line px-2.5 py-1 font-mono text-[10.5px] text-mut transition hover:border-hood-500 hover:text-ink">{num(i)} {s.title}</a>)}
        </div>

        <div className="mt-10 space-y-14">
          {sections.map((s, i) => (
            <section key={s.title} id={anchor(s)} className="scroll-mt-24">
              <div className="flex items-baseline gap-3 border-b border-line pb-3">
                <span className="figure font-mono text-xs text-hood-500">{num(i)}</span>
                <h2 className="font-display text-2xl font-medium tracking-tight text-ink">{s.title}</h2>
              </div>
              <div className="mt-5 space-y-5 text-[15px] leading-relaxed text-mut">
                {s.body.map((b, j) => <Block key={j} b={b} />)}
              </div>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
