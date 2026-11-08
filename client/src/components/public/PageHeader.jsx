export default function PageHeader({ eyebrow, title, description }) {
  return <section className="border-b border-[var(--mm-border)] bg-[var(--mm-surface-elevated)] px-5 py-16 md:py-20"><div className="mx-auto max-w-6xl"><p className="mm-eyebrow">{eyebrow}</p><h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight md:text-5xl">{title}</h1>{description && <p className="mm-muted mt-5 max-w-2xl text-lg leading-relaxed">{description}</p>}</div></section>;
}
