import { Link } from 'react-router-dom';
import { useAppPreferences } from '../context/AppPreferences';
import PublicLayout from '../components/public/PublicLayout';

const messages = [
  ['Resistance develops in microorganisms, not because your body becomes immune to antibiotics.', 'অ্যান্টিবায়োটিক প্রতিরোধ জীবাণুর মধ্যে তৈরি হয়; আপনার শরীর অ্যান্টিবায়োটিকের প্রতি “ইমিউন” হয়ে যায় না।'],
  ['Misuse and overuse of antibiotics contribute to antimicrobial resistance.', 'অ্যান্টিবায়োটিকের ভুল বা অতিরিক্ত ব্যবহার জীবাণুর প্রতিরোধ ক্ষমতা বাড়াতে পারে।'],
  ['Use antibiotics only when prescribed for your condition. Do not share them or use leftovers.', 'আপনার অবস্থার জন্য চিকিৎসক নির্দেশ দিলে তবেই অ্যান্টিবায়োটিক ব্যবহার করুন। অন্যকে দেবেন না, অবশিষ্ট ওষুধ নিজে থেকে ব্যবহার করবেন না।'],
  ['Follow the current prescriber instructions. Ask your pharmacist or prescriber about missed doses, access problems, side effects, or worsening symptoms.', 'বর্তমান চিকিৎসকের নির্দেশনা অনুসরণ করুন। ডোজ বাদ পড়া, ওষুধ সংগ্রহের সমস্যা, পার্শ্বপ্রতিক্রিয়া বা অবস্থার অবনতি হলে ফার্মাসিস্ট বা চিকিৎসকের সাহায্য নিন।'],
  ['A missed dose or symptom change alone cannot establish laboratory resistance.', 'একটি ডোজ বাদ পড়া বা উপসর্গ বদলানো থেকেই পরীক্ষাগারে প্রমাণিত প্রতিরোধ নির্ণয় করা যায় না।'],
];

export default function AmrAwareness() {
  const { isBangla } = useAppPreferences();
  return <PublicLayout><div className="px-5 py-12 text-slate-900"><div className="mx-auto max-w-3xl space-y-7">
    <Link to="/" className="text-teal-800 underline">MedMinders home</Link>
    <h1 className="text-3xl font-bold">{isBangla ? 'অ্যান্টিমাইক্রোবিয়াল রেজিস্ট্যান্স সম্পর্কে জানুন' : 'Antimicrobial resistance awareness'}</h1>
    <p className="text-sm text-slate-600">{isBangla ? 'সাধারণ শিক্ষা; ব্যক্তিগত চিকিৎসা নির্দেশনা নয়।' : 'General education, not individual treatment advice.'}</p>
    <div className="space-y-4">{messages.map(([en, bn]) => <p className="rounded-xl border bg-white p-4" key={en}>{isBangla ? bn : en}</p>)}</div>
    <section className="rounded-xl bg-teal-50 p-5"><h2 className="text-xl font-bold">Sources</h2><ul className="list-disc pl-5 mt-2 space-y-2">
      <li><a className="underline" href="https://www.who.int/news-room/fact-sheets/detail/antimicrobial-resistance" target="_blank" rel="noreferrer">WHO antimicrobial resistance fact sheet</a></li>
      <li><a className="underline" href="https://www.who.int/teams/integrated-health-services/clinical-services-and-systems/essential-medicines/aware" target="_blank" rel="noreferrer">WHO AWaRe classification overview</a></li>
    </ul><p className="mt-3 text-sm">Editorial review status: pending · Content prepared 4 November 2026. Medicine-specific missed-dose instructions must come from the supplied leaflet or care team.</p></section>
  </div></div></PublicLayout>;
}
