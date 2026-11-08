import { FaFileMedical, FaHospital, FaPills, FaPrescriptionBottle, FaShieldAlt, FaUserMd } from 'react-icons/fa';
import PublicLayout from '../components/public/PublicLayout';
import PageHeader from '../components/public/PageHeader';

const services = [
  ['Doctor workflows', FaUserMd, 'Patient records, appointments, prescription drafts, issue, amendment, and clinician cancellation.'],
  ['Patient records and consent', FaShieldAlt, 'Patients approve specific organizations, resources, actions, and time windows.'],
  ['Pharmacy dispensing', FaPills, 'Approved pharmacies can record partial supply after consent and onboarding review. Supply does not confirm consumption.'],
  ['Diagnostics and billing', FaHospital, 'Ordered tests, service billing, offline payment ledger, private reports, and release workflow.'],
  ['Prescription access', FaPrescriptionBottle, 'Authorized staff can view only the prescription resources granted to them.'],
  ['Antibiotic support', FaFileMedical, 'Patient-reported dose logging, reminders, support alerts, and educational AMR information.'],
];

export default function ServicesPage() {
  return <PublicLayout><PageHeader eyebrow="Services" title="Connected workflows for safer care coordination." description="MedMinders supports coordination between patients and authorized care teams. Clinical decisions remain with qualified professionals." /><section className="mx-auto grid max-w-6xl gap-5 px-5 py-16 sm:grid-cols-2 lg:grid-cols-3">{services.map(([title, Icon, text]) => <article className="mm-surface p-6" key={title}><Icon className="text-3xl text-[var(--mm-primary)]" /><h2 className="mt-5 text-xl font-bold">{title}</h2><p className="mm-muted mt-3 leading-relaxed">{text}</p></article>)}</section></PublicLayout>;
}
