import PublicLayout from '../components/public/PublicLayout';
import PageHeader from '../components/public/PageHeader';

const team = [
  { name: 'Tama Dutta', discipline: 'Biotechnologist', title: 'CEO', tone: 'from-cyan-500 to-blue-700' },
  { name: 'Argho Mukherjee', discipline: 'Pharmacist', title: 'CFO & CIO', tone: 'from-teal-500 to-emerald-700' },
  { name: 'Mahadi Hassan', discipline: 'Software Engineer', title: 'CMO & CTO', tone: 'from-indigo-500 to-violet-700' },
  { name: 'Md Sinha Ibne Azad', discipline: 'Pharmacist', title: 'CIO & CFO', tone: 'from-sky-500 to-cyan-700' },
  { name: 'Nazmul Arefin Labib', discipline: 'Animal Nutritionist', title: 'CTO & CIO', tone: 'from-amber-500 to-orange-700' },
];

export default function TeamPage() {
  return <PublicLayout>
    <PageHeader eyebrow="Our team" title="Meet the team" description="The people listed here are transcribed from the team information supplied for MedMinders. Professional credentials and biographies should be independently verified before formal publication." />
    <section className="relative overflow-hidden px-5 py-16"><div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(0,168,150,.16),transparent_28%),radial-gradient(circle_at_85%_0%,rgba(37,99,235,.14),transparent_28%)]" /><div className="relative mx-auto max-w-6xl"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{team.map(member => <article key={member.name} className="mm-surface group overflow-hidden p-6 transition hover:-translate-y-1 hover:shadow-[var(--mm-shadow-lg)]"><div className={`grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br ${member.tone} text-3xl font-black text-white shadow-lg ring-4 ring-white/70`}>{member.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</div><h2 className="mt-5 text-xl font-black">{member.name}</h2><p className="mm-muted mt-1">{member.discipline}</p><p className="mt-3 inline-flex rounded-full border border-[var(--mm-border)] px-3 py-1 text-sm font-bold text-[var(--mm-primary-strong)]">{member.title}</p></article>)}</div><p className="mm-muted mt-8 text-sm">Source note: names, disciplines, and titles are reproduced from the supplied MedMinders team graphic. Photos and detailed qualification records were not supplied as separate reusable assets.</p></div></section>
  </PublicLayout>;
}
