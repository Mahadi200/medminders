import PublicLayout from '../components/public/PublicLayout';
import PageHeader from '../components/public/PageHeader';
import tama from '../assets/team/tama-dutta.jpg';
import argho from '../assets/team/argho-mukherjee.jpg';
import mahadi from '../assets/team/mahadi-hassan.jpg';
import sinha from '../assets/team/md-sinha-ibne-azad.jpg';
import labib from '../assets/team/nazmul-arefin-labib.jpg';

const team = [
  { name: 'Tama Dutta', photo: tama, discipline: 'Biotechnologist', title: 'CEO', tone: 'from-cyan-500 to-blue-700' },
  { name: 'Argho Mukherjee', photo: argho, discipline: 'Pharmacist', title: 'CFO & CIO', tone: 'from-teal-500 to-emerald-700' },
  { name: 'Mahadi Hassan', photo: mahadi, discipline: 'Software Engineer', title: 'CMO & CTO', tone: 'from-indigo-500 to-violet-700' },
  { name: 'Md Sinha Ibne Azad', photo: sinha, discipline: 'Pharmacist', title: 'CIO & CFO', tone: 'from-sky-500 to-cyan-700' },
  { name: 'Nazmul Arefin Labib', photo: labib, discipline: 'Animal Nutritionist', title: 'CTO & CIO', tone: 'from-amber-500 to-orange-700' },
];

export default function TeamPage() {
  return <PublicLayout>
    <PageHeader eyebrow="Our team" title="Meet the team" description="Biotechnology, pharmacy and software, working together on safer antibiotic use in Bangladesh." />
    <section className="relative overflow-hidden px-5 py-16"><div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(0,168,150,.16),transparent_28%),radial-gradient(circle_at_85%_0%,rgba(37,99,235,.14),transparent_28%)]" /><div className="relative mx-auto max-w-6xl"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{team.map(member => <article key={member.name} className="mm-surface group overflow-hidden p-6 transition hover:-translate-y-1 hover:shadow-[var(--mm-shadow-lg)]"><img src={member.photo} alt={member.name} loading="lazy" className="h-28 w-28 rounded-full object-cover shadow-[0_0_28px_rgba(45,212,191,.45)] ring-4 ring-teal-300/70" /><h2 className="mt-5 text-xl font-black">{member.name}</h2><p className="mm-muted mt-1">{member.discipline}</p><p className="mt-3 inline-flex rounded-full border border-[var(--mm-border)] px-3 py-1 text-sm font-bold text-[var(--mm-primary-strong)]">{member.title}</p></article>)}</div></div></section>
  </PublicLayout>;
}
