import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { careApi } from '../services/careApi';
import { useAppPreferences } from '../context/AppPreferences';
import PrescriptionEditor from '../components/PrescriptionEditor';
import DoctorProfilePanel from '../components/DoctorProfilePanel';
import Navbar from '../components/home/Navbar';
import Footer from '../components/home/Footer';
import BackButton from '../components/navigation/BackButton';
import DoseAlarm from '../components/portal/DoseAlarm';
import { useApi, fmt } from '../components/portal/ui';
import { BookAppointment, MyAppointments, CourseTracker, PrescriptionsAndSharing, RecordsArchive, ProblemReport } from '../components/portal/PatientPanels';
import { AccessPanel, DoctorQueue, FindPatient } from '../components/portal/JourneyPanels';
import { DoctorAffiliations, DoctorAppointments, DoctorPatients, DoctorProblems, PharmacyQueue, HospitalAffiliations, HospitalAppointments, HospitalDiagnostics } from '../components/portal/StaffPanels';

export default function ConnectedPortal() {
  const { isBangla } = useAppPreferences();
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState(() => sessionStorage.getItem('medminders_token') || '');
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(() => Boolean(sessionStorage.getItem('medminders_token')));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [auth, setAuth] = useState({ name: '', phone: '', email: '', password: '', password_confirmation: '', bmdc_number: '', hospital_clinic: '', code: '', pharmacy_legal_name: '', pharmacy_trading_name: '', address: '', contact_phone: '', contact_email: '', responsible_owner_name: '', license_number: '', license_issuing_authority: '', license_issued_on: '', license_expires_on: '', pharmacist_full_name: '', pharmacist_registration_number: '', pharmacist_registration_category: '', pharmacist_issuing_authority: '', pharmacist_issued_on: '', pharmacist_expires_on: '' });
  const [licenseDocument, setLicenseDocument] = useState(null);
  const [pharmacistDocument, setPharmacistDocument] = useState(null);
  const routeMode = path => {
    const value = path.toLowerCase();
    if (value.includes('patient-register')) return 'patient-register';
    if (value.includes('patient-claim')) return 'patient-claim';
    if (value.includes('patient-otp')) return 'patient-otp';
    if (value.includes('patient')) return 'patient-login';
    if (value.includes('doctor-register')) return 'doctor-register';
    if (value.includes('doctor')) return 'doctor-login';
    if (value.includes('pharmacy-register')) return 'pharmacy-register';
    if (value.includes('pharmacy')) return 'pharmacy-login';
    return 'hospital-login';
  };
  const [mode, setMode] = useState(() => routeMode(location.pathname));
  const [challenge, setChallenge] = useState('');
  const [mfaChallenge, setMfaChallenge] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [records, setRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sharing, setSharing] = useState({ requests: [], grants: [] });
  const [orders, setOrders] = useState([]);
  const [reports, setReports] = useState([]);
  const [pharmacyStatus, setPharmacyStatus] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', allergy_status: 'UNKNOWN' });
  const [shareForm, setShareForm] = useState({ patient_record_id: '', resource_type: 'ENCOUNTER', resource_id: '', action: 'REVIEW', purpose: 'Consultation', duration_minutes: 1440 });
  const [dispense, setDispense] = useState({ item_id: '', organization_id: '', quantity: 1, product: '' });
  const [lab, setLab] = useState({ order_id: '', organization_id: '', price_bdt: 0, observations: '', report_id: '' });
  const [editorDirty, setEditorDirty] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [consult, setConsult] = useState(null);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    if (!user) {
      setMode(routeMode(location.pathname));
      setChallenge('');
      setMfaChallenge('');
      setMessage('');
    }
  }, [location.pathname, user]);

  const call = (path, options) => careApi(path, { ...options, token });
  const role = user?.roles?.includes('DOCTOR') ? 'doctor' : user?.roles?.includes('PATIENT') ? 'patient'
    : user?.memberships?.some(m => ['PHARMACY_ADMIN', 'DISPENSER'].includes(m.role)) ? 'pharmacy'
    : user?.memberships?.some(m => ['HOSPITAL_ADMIN', 'HOSPITAL_RECEPTION', 'BILLING', 'LAB_STAFF', 'REPORT_REVIEWER'].includes(m.role)) ? 'hospital'
    : 'staff';
  const organizationId = user?.memberships?.[0]?.organization_id || '';
  const hospitalOrgId = user?.memberships?.find(m => ['HOSPITAL_ADMIN', 'HOSPITAL_RECEPTION', 'LAB_STAFF', 'REPORT_REVIEWER', 'BILLING'].includes(m.role))?.organization_id || '';
  const appointments = useApi(user && ['patient', 'doctor', 'hospital'].includes(role) ? '/appointments' : null, token);
  const doctorPatients = useApi(role === 'doctor' ? '/doctor/patients' : null, token);
  // Keep the URL on the signed-in role's portal so refresh, Back/Forward and role switching stay consistent.
  const rolePath = { patient: '/patient-login', doctor: '/doctor-login', pharmacy: '/pharmacy-login', hospital: '/hospital-login' }[role];
  useEffect(() => { if (user && rolePath && location.pathname !== rolePath) navigate(rolePath + location.hash, { replace: true }); }, [user, rolePath, location.pathname]);

  async function load(currentToken = token) {
    if (!currentToken) return;
    try {
      const me = await careApi('/auth/me', { token: currentToken });
      setUser(me);
      const requests = ['/clinical-prescriptions', '/patients/records', '/courses', '/sharing', '/test-orders', '/reports'];
      const results = await Promise.allSettled(requests.map(path => careApi(path, { token: currentToken })));
      if (results[0].status === 'fulfilled') setPrescriptions(results[0].value.data || []);
      if (results[1].status === 'fulfilled') setRecords(results[1].value);
      if (results[2].status === 'fulfilled') setCourses(results[2].value);
      if (results[3].status === 'fulfilled') setSharing(results[3].value);
      if (results[4].status === 'fulfilled') setOrders(results[4].value);
      if (results[5].status === 'fulfilled') setReports(results[5].value);
      if (me.roles?.includes('PHARMACIST') || me.memberships?.some(m => m.role === 'PHARMACY_ADMIN')) {
        const status = await careApi('/pharmacy/status', { token: currentToken }).catch(() => null);
        setPharmacyStatus(status);
      }
      if (me.roles?.includes('DOCTOR')) setProfile(await careApi('/doctor/profile', { token: currentToken }));
      if (me.roles?.includes('PATIENT')) setInvoices(await careApi('/my-invoices', { token: currentToken }).catch(() => []));
    } catch (error) {
      // Only an expired/invalid session signs the user out; network interruptions (e.g. navigation mid-request) keep the session.
      if (error.status === 401) { sessionStorage.removeItem('medminders_token'); setToken(''); setUser(null); }
      setMessage(error.message);
    } finally { setRestoring(false); }
  }
  useEffect(() => { load(); }, []);

  async function act(action) {
    setBusy(true); setMessage('');
    try { const result = await action(); setMessage(result?.message || 'Saved.'); await load(); }
    catch (error) { setMessage(error.message === 'Authenticator enrollment is required.' ? 'Set up your authenticator before using restricted doctor workflows.' : error.message); }
    finally { setBusy(false); }
  }
  function signedIn(result) {
    sessionStorage.setItem('medminders_token', result.token);
    setToken(result.token); setUser(result.user); setChallenge(''); setMfaChallenge('');
    load(result.token);
  }
  async function submitAuth(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      if (mode === 'patient-register') {
        const result = await careApi('/auth/patients/register-password', { method: 'POST', body: {
          name: auth.name, phone: auth.phone, email: auth.email || undefined, date_of_birth: auth.date_of_birth || undefined,
          password: auth.password, password_confirmation: auth.password_confirmation,
        } });
        signedIn(result);
      } else if (mode === 'patient-login') {
        const result = await careApi('/auth/patients/login-password', { method: 'POST', body: { identifier: auth.identifier, password: auth.password } });
        signedIn(result);
      } else if (mode === 'patient-otp' || mode === 'patient-claim') {
        const result = await careApi('/patients/challenge', { method: 'POST', body: {
          phone: auth.phone,
          ...(mode === 'patient-claim' ? { patient_record_id: auth.patient_record_id, claim_code: auth.claim_code } : {}),
        } });
        setChallenge(result.challenge_id || ''); setMessage(result.dev_code ? `DEVELOPMENT ONLY — no SMS was sent. Code: ${result.dev_code}` : result.message);
      } else if (mode === 'doctor-register') {
        await careApi('/auth/doctors/register', { method: 'POST', body: auth });
        navigate('/doctor-login'); setMessage('Doctor account created. BMDC verification is pending.');
      } else if (mode === 'pharmacy-register') {
        const body = new FormData();
        const fields = ['pharmacy_legal_name','pharmacy_trading_name','address','contact_phone','contact_email','responsible_owner_name','license_number','license_issuing_authority','license_issued_on','license_expires_on','pharmacist_full_name','pharmacist_registration_number','pharmacist_registration_category','pharmacist_issuing_authority','pharmacist_issued_on','pharmacist_expires_on','email','password','password_confirmation'];
        fields.forEach(key => body.append(key, auth[key] ?? ''));
        if (licenseDocument) body.append('license_document', licenseDocument);
        if (pharmacistDocument) body.append('pharmacist_document', pharmacistDocument);
        await careApi('/auth/pharmacies/register', { method: 'POST', body });
        navigate('/pharmacy-login'); setMessage('Pharmacy application submitted for review. Dispensing remains locked until approval.');
      } else {
        const result = await careApi('/auth/login', { method: 'POST', body: { email: auth.email, password: auth.password } });
        if (result.mfa_required) { setMfaChallenge(result.challenge); setMessage('Enter your authenticator code.'); }
        else signedIn(result);
      }
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  const input = (label, value, onChange, type = 'text', props = {}) => <label className="block text-sm font-medium text-slate-700">{label}<input className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900" type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} {...props} /></label>;
  const box = 'mm-surface p-5 space-y-4';
  const button = 'rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:opacity-50';

  return <div className="min-h-screen bg-[var(--mm-bg)] text-[var(--mm-text)]">
    {!user && <Navbar />}{user && <header className="bg-slate-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
      <div><Link to="/" className="font-bold text-xl">MedMinders</Link><p className="text-sm text-slate-300">{isBangla ? 'সংযুক্ত স্বাস্থ্যসেবা' : 'Connected care'} · <Link to="/amr-awareness" className="underline">AMR awareness</Link></p></div>
      <div className="flex items-center gap-3 text-sm"><span>{user?.name || ''}</span>{token && <button onClick={async () => { try { await call('/auth/logout', { method: 'POST' }); } finally { sessionStorage.removeItem('medminders_token'); setToken(''); setUser(null); setMessage('Signed out.'); } }} className="underline">Sign out</button>}</div>
    </header>}
    <main className="mx-auto max-w-6xl p-4 md:p-8 space-y-6">
      <BackButton dirty={editorDirty} fallback={user ? (role === 'patient' ? '/patient-login' : role === 'doctor' ? '/doctor-login' : role === 'pharmacy' ? '/pharmacy-login' : '/hospital-login') : (mode.startsWith('patient') ? '/patient-login' : mode.startsWith('doctor') ? '/doctor-login' : mode.startsWith('pharmacy') ? '/pharmacy-login' : '/hospital-login')} />
      {message && <div role="status" className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm">{message}</div>}
      {!user && restoring && <section className={`${box} max-w-lg mx-auto text-center`} aria-live="polite"><p className="font-semibold">{isBangla ? 'আপনার সেশন পুনরুদ্ধার করা হচ্ছে…' : 'Restoring your session…'}</p></section>}
      {!user && !restoring && <section className={`${box} max-w-lg mx-auto`}><h1 className="text-2xl font-bold">{mode.startsWith('patient') ? 'Patient portal' : mode.startsWith('doctor') ? 'Doctor portal' : mode.startsWith('pharmacy') ? 'Pharmacy portal' : 'Hospital portal'}</h1>
        <p className="text-sm text-slate-600">{mode.startsWith('patient') ? 'Sign in with your password, create a new profile, or securely claim an existing record.' : mode.startsWith('doctor') ? 'Use your individual account. Professional approval remains required for clinical access.' : mode.startsWith('pharmacy') ? 'Sign in with your individual staff account or submit a separate pharmacy application.' : 'Use your individual hospital staff account for authorized diagnostic workflows.'}</p>
        <div className="flex flex-wrap gap-2 text-sm">{(
          mode.startsWith('patient') ? [['patient-login','Sign in with password'],['patient-register','Create account'],['patient-otp','Use phone verification'],['patient-claim','Claim existing record']] :
          mode.startsWith('doctor') ? [['doctor-login','Doctor login'],['doctor-register','Doctor registration']] :
          mode.startsWith('pharmacy') ? [['pharmacy-login','Pharmacy login'],['pharmacy-register','Pharmacy registration']] : [['hospital-login','Hospital login']]
        ).map(([key,label]) => <button key={key} type="button" onClick={() => { const path = key === 'doctor-login' ? '/doctor-login' : `/${key}`; navigate(path); setChallenge(''); setMessage(''); }} className={`px-3 py-2 rounded-lg ${mode === key ? 'bg-teal-700 text-white' : 'bg-slate-100'}`}>{label}</button>)}</div>
        <form className="space-y-4" onSubmit={submitAuth}>
          {mode === 'patient-login' ? <>
            {input('Phone or linked email', auth.identifier, value => setAuth({ ...auth, identifier: value }), 'text', { required: true, autoComplete: 'username' })}
            {input('Password', auth.password, value => setAuth({ ...auth, password: value }), 'password', { required: true, autoComplete: 'current-password' })}
          </> : mode === 'patient-register' ? <>
            {input('Full name', auth.name, value => setAuth({ ...auth, name: value }), 'text', { required: true, autoComplete: 'name' })}
            {input('Phone number', auth.phone, value => setAuth({ ...auth, phone: value }), 'tel', { required: true, autoComplete: 'tel' })}
            {input('Email (optional)', auth.email, value => setAuth({ ...auth, email: value }), 'email', { autoComplete: 'email' })}
            {input('Date of birth (optional)', auth.date_of_birth, value => setAuth({ ...auth, date_of_birth: value }), 'date', { autoComplete: 'bday' })}
            {input('Password', auth.password, value => setAuth({ ...auth, password: value }), 'password', { required: true, autoComplete: 'new-password' })}
            {input('Confirm password', auth.password_confirmation, value => setAuth({ ...auth, password_confirmation: value }), 'password', { required: true, autoComplete: 'new-password' })}
            <p className="text-xs text-slate-500">Your phone and email remain unverified until the corresponding verification flow succeeds. This account only sees the profile created here.</p>
          </> : mode === 'patient-otp' || mode === 'patient-claim' ? <>
            {mode === 'patient-claim' && <>{input('Record ID from your care team', auth.patient_record_id, value => setAuth({ ...auth, patient_record_id: value }), 'text', { required: true })}{input('One-time invitation code', auth.claim_code, value => setAuth({ ...auth, claim_code: value }), 'text', { required: true })}</>}
            {input('Phone number', auth.phone, value => setAuth({ ...auth, phone: value }), 'tel', { required: true, autoComplete: 'tel' })}
          </> : mode === 'pharmacy-register' ? <>
            {input('Pharmacy legal name', auth.pharmacy_legal_name, value => setAuth({ ...auth, pharmacy_legal_name: value }), 'text', { required: true })}
            {input('Trading name', auth.pharmacy_trading_name, value => setAuth({ ...auth, pharmacy_trading_name: value }))}
            {input('Address', auth.address, value => setAuth({ ...auth, address: value }), 'text', { required: true })}
            {input('Contact phone', auth.contact_phone, value => setAuth({ ...auth, contact_phone: value }), 'tel', { required: true })}
            {input('Contact email', auth.contact_email, value => setAuth({ ...auth, contact_email: value }), 'email', { required: true })}
            {input('Owner/applicant name', auth.responsible_owner_name, value => setAuth({ ...auth, responsible_owner_name: value }), 'text', { required: true })}
            {input('DGDA drug/pharmacy licence number', auth.license_number, value => setAuth({ ...auth, license_number: value }), 'text', { required: true })}
            {input('Licence issuing authority', auth.license_issuing_authority, value => setAuth({ ...auth, license_issuing_authority: value }))}
            {input('Licence issue date', auth.license_issued_on, value => setAuth({ ...auth, license_issued_on: value }), 'date')}
            {input('Licence expiry date', auth.license_expires_on, value => setAuth({ ...auth, license_expires_on: value }), 'date')}
            <label className="block text-sm font-medium text-slate-700">Private establishment licence document<input className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5" type="file" accept="application/pdf,image/jpeg,image/png" required onChange={e => setLicenseDocument(e.target.files?.[0] || null)} /></label>
            {input('Responsible pharmacist full name', auth.pharmacist_full_name, value => setAuth({ ...auth, pharmacist_full_name: value }), 'text', { required: true })}
            {input('Pharmacy Council registration number', auth.pharmacist_registration_number, value => setAuth({ ...auth, pharmacist_registration_number: value }), 'text', { required: true })}
            {input('Registration category (A, B or C)', auth.pharmacist_registration_category, value => setAuth({ ...auth, pharmacist_registration_category: value }))}
            {input('Registration issuing authority', auth.pharmacist_issuing_authority, value => setAuth({ ...auth, pharmacist_issuing_authority: value }))}
            {input('Registration issue date', auth.pharmacist_issued_on, value => setAuth({ ...auth, pharmacist_issued_on: value }), 'date')}
            {input('Registration expiry date', auth.pharmacist_expires_on, value => setAuth({ ...auth, pharmacist_expires_on: value }), 'date')}
            <label className="block text-sm font-medium text-slate-700">Private pharmacist registration document<input className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5" type="file" accept="application/pdf,image/jpeg,image/png" required onChange={e => setPharmacistDocument(e.target.files?.[0] || null)} /></label>
            {input('Applicant email', auth.email, value => setAuth({ ...auth, email: value }), 'email', { required: true })}
            {input('Password', auth.password, value => setAuth({ ...auth, password: value }), 'password', { required: true })}
            {input('Confirm password', auth.password_confirmation, value => setAuth({ ...auth, password_confirmation: value }), 'password', { required: true })}
          </> : <>
            {mode === 'doctor-register' && <>{input('Full name', auth.name, value => setAuth({ ...auth, name: value }), 'text', { required: true })}{input('BMDC number (A- or P- followed by six digits)', auth.bmdc_number, value => setAuth({ ...auth, bmdc_number: value }), 'text', { required: true })}{input('Hospital or clinic', auth.hospital_clinic, value => setAuth({ ...auth, hospital_clinic: value }), 'text', { required: true })}</>}
            {input('Email', auth.email, value => setAuth({ ...auth, email: value }), 'email', { required: true })}
            {input('Password', auth.password, value => setAuth({ ...auth, password: value }), 'password', { required: true })}
            {(mode === 'doctor-register') && input('Confirm password', auth.password_confirmation, value => setAuth({ ...auth, password_confirmation: value }), 'password', { required: true })}
          </>}
          <button disabled={busy} className={button}>{mode === 'patient-login' ? 'Sign in with password' : mode === 'patient-register' ? 'Create patient account' : mode === 'patient-otp' || mode === 'patient-claim' ? 'Send verification code' : mode === 'doctor-register' ? 'Register doctor' : mode === 'pharmacy-register' ? 'Submit pharmacy application' : 'Sign in'}</button>
        </form>
        {challenge && <form onSubmit={event => { event.preventDefault(); act(async () => { const result = await careApi('/patients/verify', { method: 'POST', body: { challenge_id: challenge, code: auth.code } }); signedIn(result); return { message: 'Phone verified.' }; }); }} className="space-y-3 border-t pt-4">{input('SMS code', auth.code, value => setAuth({ ...auth, code: value }), 'text', { required: true, inputMode: 'numeric' })}<button className={button}>Verify phone</button></form>}
        {mfaChallenge && <form onSubmit={event => { event.preventDefault(); act(async () => { const result = await careApi('/auth/mfa/verify', { method: 'POST', body: { challenge: mfaChallenge, code: auth.code } }); signedIn(result); return { message: 'Signed in.' }; }); }} className="space-y-3 border-t pt-4">{input('Authenticator code', auth.code, value => setAuth({ ...auth, code: value }), 'text', { required: true, inputMode: 'numeric' })}<button className={button}>Verify</button></form>}
      </section>}
      {user && <><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mm-eyebrow">{isBangla ? 'অনুমোদিত কর্মক্ষেত্র' : 'Authorized workspace'}</p><h1 className="text-3xl font-bold capitalize">{role} portal</h1><p className="mm-muted mt-1">{isBangla ? 'শুধু এই অ্যাকাউন্টের জন্য অনুমোদিত তথ্য দেখানো হয়।' : 'Only data authorized for this account is shown.'}</p></div><DashboardNav role={role} /></div>
        <section className="mm-surface grid gap-3 p-4 sm:grid-cols-3"><div><p className="mm-muted text-xs uppercase tracking-wide">Signed in as</p><p className="font-semibold">{user.name}</p></div><div><p className="mm-muted text-xs uppercase tracking-wide">Contact status</p><p className="font-semibold">{user.phone_number ? 'Phone verified' : 'Phone unverified'}{user.email ? ` · ${user.email} (unverified)` : ''}</p></div><div><p className="mm-muted text-xs uppercase tracking-wide">Access scope</p><p className="font-semibold">{role === 'patient' ? 'Own linked profile' : role === 'pharmacy' ? 'Patient-shared prescriptions only' : role === 'hospital' ? 'This hospital’s requests and shared orders' : role === 'doctor' ? (profile?.verification_status === 'VERIFIED' ? 'BMDC reviewed · patient-consented records' : 'BMDC review pending — clinical actions locked') : 'Assigned organization only'}</p></div></section>
        {role === 'patient' && <>
          <DoseAlarm token={token} isBangla={isBangla} onLogged={() => { setReloadKey(k => k + 1); load(); }} />
          <CourseTracker token={token} courses={courses} reloadKey={reloadKey} onChange={() => load()} />
          <BookAppointment token={token} recordId={records[0]?.id} onBooked={appointments.reload} />
          <MyAppointments token={token} list={appointments} />
          <PrescriptionsAndSharing token={token} prescriptions={prescriptions} sharing={sharing} onChange={load} />
          <AccessPanel token={token} />
          <RecordsArchive token={token} prescriptions={prescriptions} reports={reports} orders={orders} invoices={invoices} />
          <ProblemReport token={token} courses={courses} />
          <MessagingPanel token={token} user={user} contacts={[...new Map(appointments.data.filter(a => !['REJECTED', 'CANCELLED'].includes(a.status)).map(a => [a.doctor_id, { label: a.doctor_name, patient_record_id: a.patient_record_id, doctor_id: a.doctor_id }])).values()]} />
        </>}
        {role === 'doctor' && <>
          {profile?.verification_status !== 'VERIFIED' && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Your BMDC registration is awaiting manual review by MedMinders. You can complete your profile now; publishing, prescribing and bookings unlock only after review. MedMinders does not query the BMDC registry automatically.</p>}
          <DoctorQueue token={token} onStart={a => { setConsult({ patient_record_id: a.patient_record_id, appointment_id: a.id, name: a.name }); setTimeout(() => document.getElementById("dashboard-prescribe")?.scrollIntoView({ behavior: "smooth" }), 50); }} />
          <DoctorPatients token={token} patients={doctorPatients} />
          <PrescriptionEditor call={call} patients={doctorPatients.data} preset={consult} onDirty={setEditorDirty} onSaved={() => { setEditorDirty(false); setConsult(null); load(); doctorPatients.reload(); }} />
          <DoctorProblems token={token} />
          <DoctorAffiliations token={token} />
          <div className="grid gap-5 lg:grid-cols-2"><DoctorProfilePanel profile={profile} setProfile={setProfile} save={data => act(() => call('/doctor/profile', { method: 'PATCH', body: data }))} /><DoctorPhotoPanel token={token} /></div>
          <section id="dashboard-prescriptions" className={box}><h2 className="text-lg font-bold">Issued prescriptions</h2>{prescriptions.length ? prescriptions.map(p => <div className="border-b border-[var(--mm-border)] py-2 text-sm" key={p.id}><strong>{p.patient_snapshot?.name || 'Patient'}</strong> · {p.cancelled_at ? 'Cancelled' : p.superseded_at ? 'Superseded by amendment' : 'Issued'} · {p.diagnosis || 'No diagnosis'}{p.items?.map(i => <p key={i.id}>{i.generic_name} {i.strength}, {i.dose} {i.route} · {i.duration_days} days</p>)}{!p.cancelled_at && !p.superseded_at && <button className="text-red-700 underline" onClick={() => { const reason = window.prompt('Reason for cancelling this prescription (future doses will be cancelled):'); if (reason) act(() => call(`/clinical-prescriptions/${p.id}/cancel`, { method: 'POST', body: { reason } })); }}>Cancel prescription</button>}</div>) : <p className="mm-muted text-sm">No prescriptions issued yet.</p>}</section>
          <section id="dashboard-reports" className={box}><h2 className="text-lg font-bold">Reports for tests you ordered</h2>{reports.length ? reports.map(r => <p key={r.id} className="border-b border-[var(--mm-border)] py-2 text-sm"><strong>{r.test_name}</strong> · {r.patient_name} · {r.organization_name} · released {r.released_at}<br /><span className="whitespace-pre-wrap">{r.observations}</span></p>) : <p className="mm-muted text-sm">No released reports.</p>}</section>
          <MessagingPanel token={token} user={user} contacts={doctorPatients.data.map(p => ({ label: p.name, patient_record_id: p.id, doctor_id: user.id }))} />
          <InteractionCheckerPanel token={token} />
          <RequestAccessPanel shareForm={shareForm} setShareForm={setShareForm} input={input} box={box} button={button} submit={() => act(() => call('/sharing/requests', { method: 'POST', body: { ...shareForm, resource_id: shareForm.resource_type === 'ENCOUNTER' ? shareForm.patient_record_id : shareForm.resource_id, organization_id: organizationId || null } }))} />
        </>}
        {role === 'pharmacy' && <>
          <PharmacyStatusPanel status={pharmacyStatus} />
          <FindPatient token={token} organizationId={organizationId} kind="pharmacy" />
          <PharmacyQueue token={token} />
          <InteractionCheckerPanel token={token} />
        </>}
        {role === 'hospital' && <>
          <HospitalAppointments token={token} list={appointments} />
          <FindPatient token={token} organizationId={hospitalOrgId} kind="hospital" />
          <HospitalAffiliations token={token} />
          <HospitalDiagnostics token={token} organizationId={hospitalOrgId} />
        </>}
        <NotificationCenter token={token} />
      </>}
    </main>{!user && <Footer />}
  </div>;
}

function DashboardNav({ role }) {
  const items = role === 'patient'
    ? [['Alarm', 'alarm'], ['Doses', 'courses'], ['Book', 'book'], ['Appointments', 'appointments'], ['Prescriptions', 'prescriptions'], ['Sharing', 'sharing'], ['Records', 'reports'], ['Support', 'problems']]
    : role === 'doctor'
      ? [['Today', 'appointments'], ['Patients', 'patients'], ['Prescribe', 'prescribe'], ['Problems', 'problems'], ['Schedule', 'profile'], ['Reports', 'reports']]
      : role === 'pharmacy'
        ? [['Find patient', 'find'], ['Status', 'status'], ['Dispensing', 'dispensing']]
        : [['Appointments', 'appointments'], ['Find patient', 'find'], ['Doctors', 'status'], ['Diagnostics', 'orders']];
  return <nav aria-label="Dashboard sections" className="flex max-w-full flex-wrap gap-2 text-sm">{items.map(([label, id]) => <a key={id} href={`#dashboard-${id}`} className="mm-button mm-button-secondary">{label}</a>)}</nav>;
}

function PharmacyStatusPanel({ status }) {
  if (!status) return <section id="dashboard-status" className="mm-surface p-5"><h2 className="text-lg font-bold">Pharmacy onboarding status</h2><p className="mm-muted mt-2">Onboarding status is not available for this account yet.</p></section>;
  const org = status.organization || {};
  const license = status.establishment_license || {};
  const pharmacist = status.responsible_pharmacist || {};
  return <section id="dashboard-status" className="mm-surface p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="mm-eyebrow">Organization review</p><h2 className="text-lg font-bold">{org.legal_name || org.name || 'Pharmacy organization'}</h2></div><span className="rounded-full border border-[var(--mm-border)] px-3 py-1 text-sm font-semibold">{org.status || 'SUBMITTED'}</span></div><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-xl bg-[var(--mm-surface-elevated)] p-3"><strong>Establishment licence</strong><p>{license.license_number || 'Submitted number unavailable'}</p><p className="mm-muted">{license.verification_status || 'PENDING_REVIEW'}</p></div><div className="rounded-xl bg-[var(--mm-surface-elevated)] p-3"><strong>Responsible pharmacist</strong><p>{pharmacist.full_name || 'Registration unavailable'}</p><p className="mm-muted">{pharmacist.verification_status || 'PENDING_REVIEW'}</p></div></div>{org.review_reason && <p className="mt-3 rounded-lg border border-[var(--mm-border)] p-3 text-sm">Reviewer note: {org.review_reason}</p>}{org.status !== 'APPROVED' && <p className="mt-3 text-sm text-amber-800">Patient prescriptions and dispensing remain unavailable until the organization and both credentials are approved.</p>}</section>;
}


function NotificationCenter({ token }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const refresh = () => careApi('/notifications', { token }).then(list => { setItems(list); setError(''); }).catch(error => setError(error.message));
  useEffect(() => { refresh(); const id = window.setInterval(refresh, 60000); return () => window.clearInterval(id); }, [token]);
  const text = item => { try { return (typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload)?.message; } catch { return ''; } };
  const unread = items.filter(i => !i.read_at).length;
  return <section id="dashboard-notifications" className="mm-surface p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mm-eyebrow">Notification centre</p><h2 className="text-lg font-bold">Updates and reminders {unread > 0 && <span className="ml-1 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{unread} new</span>}</h2></div><div className="flex gap-2"><button className="mm-button mm-button-secondary" onClick={refresh}>Refresh</button>{unread > 0 && <button className="mm-button mm-button-secondary" onClick={() => careApi('/notifications/read-all', { token, method: 'POST' }).then(refresh)}>Mark all read</button>}</div></div>
    <p className="mm-muted mt-1 text-xs">In-app only. SMS, email and phone push delivery are not connected.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{!error && !items.length && <p className="mm-muted mt-3 text-sm">No notifications yet.</p>}
    <div className="mt-3 max-h-96 space-y-2 overflow-auto">{items.map(item => <div key={item.id} className={`rounded-xl border p-3 text-sm ${item.read_at ? 'border-[var(--mm-border)]' : 'border-teal-400 bg-teal-50/40'}`}><div className="flex flex-wrap items-center justify-between gap-2"><strong>{(item.event_type || item.kind).replaceAll('_', ' ').toLowerCase()}</strong><span className="mm-muted">{fmt(item.available_at)}</span></div><p className="mt-1">{text(item)}</p>{item.lifecycle_state === 'CANCELLED' && <p className="mm-muted text-xs">Cancelled — treatment changed.</p>}<div className="mt-2 flex gap-3">{!item.read_at && <button className="underline" onClick={() => careApi(`/notifications/${item.id}/read`, { token, method: 'POST' }).then(refresh)}>Mark read</button>}{['SUPPORT_ALERT', 'ACTION_REQUIRED'].includes(item.category) && !item.acknowledged_at && <button className="underline" onClick={() => careApi(`/notifications/${item.id}/acknowledge`, { token, method: 'POST' }).then(refresh)}>Acknowledge</button>}</div></div>)}</div></section>;
}

function MessagingPanel({ token, user, contacts = [] }) {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [form, setForm] = useState({ patient_record_id: '', doctor_id: '', body: '' });
  const [error, setError] = useState('');
  const refresh = () => careApi('/conversations', { token }).then(setConversations).catch(error => setError(error.message));
  useEffect(() => { refresh(); }, [token]);
  const open = id => { setSelected(id); careApi(`/conversations/${id}/messages`, { token }).then(result => setMessages(result.data || [])).catch(error => setError(error.message)); };
  const create = async event => { event.preventDefault(); setError(''); try { const result = await careApi('/conversations', { token, method: 'POST', body: { patient_record_id: form.patient_record_id, doctor_id: form.doctor_id || user.id } }); setForm({ ...form, body: '' }); await refresh(); open(result.id); } catch (e) { setError(e.message); } };
  const send = async event => { event.preventDefault(); if (!selected || !form.body.trim()) return; try { await careApi(`/conversations/${selected}/messages`, { token, method: 'POST', body: { body: form.body, client_key: crypto.randomUUID() } }); setForm({ ...form, body: '' }); open(selected); } catch (e) { setError(e.message); } };
  return <section id="dashboard-messages" className="mm-surface p-5"><p className="mm-eyebrow">Care messaging</p><h2 className="text-lg font-bold">Patient–doctor messages</h2><p className="mm-muted mt-1 text-sm">Messages stay within an authorized patient–doctor relationship and do not change prescriptions. Replies are not guaranteed to be immediate — for emergencies call 999.</p>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<form onSubmit={create} className="mt-4 flex flex-wrap gap-3"><select className="min-w-0 flex-1 rounded-lg border border-[var(--mm-border)] bg-[var(--mm-surface)] p-2" value={form.patient_record_id + '|' + form.doctor_id} onChange={e => { const [patient_record_id, doctor_id] = e.target.value.split('|'); setForm({ ...form, patient_record_id, doctor_id }); }} required><option value="|">{contacts.length ? 'Choose who to message…' : 'No care relationship available yet'}</option>{contacts.map(c => <option key={c.patient_record_id + c.doctor_id} value={c.patient_record_id + '|' + c.doctor_id}>{c.label}</option>)}</select><button className="mm-button mm-button-primary" disabled={!form.patient_record_id}>Open conversation</button></form><div className="mt-4 grid gap-4 lg:grid-cols-[.8fr_1.2fr]"><div className="space-y-2">{!conversations.length && <p className="mm-muted text-sm">No conversations yet.</p>}{conversations.map(c => <button key={c.id} className={`block w-full rounded-lg border p-3 text-left text-sm ${selected === c.id ? 'border-[var(--mm-primary)]' : 'border-[var(--mm-border)]'}`} onClick={() => open(c.id)}>{c.patient_name || 'Patient'} · {c.doctor_name || 'Doctor'}<span className="mm-muted block text-xs">{new Date(c.updated_at).toLocaleString()}</span></button>)}</div><div className="rounded-xl border border-[var(--mm-border)] p-3">{!selected ? <p className="mm-muted text-sm">Select a conversation to view messages.</p> : <><div className="max-h-56 space-y-2 overflow-auto">{messages.map(message => <p key={message.id} className="rounded-lg bg-[var(--mm-surface-elevated)] p-2 text-sm"><strong>{message.sender_id === user.id ? 'You' : 'Care team'}</strong> · {new Date(message.sent_at).toLocaleString()}<br />{message.body}</p>)}</div><form onSubmit={send} className="mt-3 flex gap-2"><input className="min-w-0 flex-1 rounded-lg border border-[var(--mm-border)] bg-[var(--mm-surface)] p-2" placeholder="Write a message" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /><button className="mm-button mm-button-primary">Send</button></form></>}</div></div></section>;
}


function InteractionCheckerPanel({ token }) {
  const [ingredients, setIngredients] = useState('');
  const [result, setResult] = useState(null);
  const check = async () => { try { setResult(await careApi('/interactions/check', { token, method: 'POST', body: { ingredients: ingredients.split(',').map(value => value.trim()).filter(Boolean) } })); } catch (error) { setResult({ status: 'PROVIDER_UNAVAILABLE', message: error.message }); } };
  return <section className="mm-surface p-5"><p className="mm-eyebrow">Clinical safety tool</p><h2 className="text-lg font-bold">Drug interaction checker</h2><p className="mm-muted mt-1 text-sm">Checks are only displayed when a licensed, versioned source is configured. No result here changes a prescription.</p><div className="mt-4 flex flex-wrap gap-2"><input className="min-w-[16rem] flex-1 rounded-lg border border-[var(--mm-border)] bg-[var(--mm-surface)] p-2" placeholder="Generic ingredients, comma separated" value={ingredients} onChange={e => setIngredients(e.target.value)} /><button className="mm-button mm-button-secondary" onClick={check} disabled={!ingredients.trim()}>Check source</button></div>{result && <p role="status" className="mt-3 rounded-lg border border-[var(--mm-border)] p-3 text-sm">{result.status}: {result.message || 'Provider response received.'}</p>}</section>;
}







function DoctorPhotoPanel({ token }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  async function upload(event) {
    event.preventDefault();
    if (!file) return;
    const body = new FormData(); body.append('photo', file);
    try { await careApi('/doctor/profile/photo', { token, method: 'POST', body }); setMessage('Profile photo saved. It appears publicly only after verification and publication.'); }
    catch (error) { setMessage(error.message); }
  }
  return <form className="rounded-2xl border bg-white p-5 space-y-3" onSubmit={upload}><h2 className="text-lg font-bold">Profile photo</h2>
    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] || null)} />
    <button className="rounded-lg bg-teal-700 px-4 py-2 text-white">Upload</button>{message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}

function RequestAccessPanel({ shareForm, setShareForm, input, box, button, submit }) {
  return <section className={box}><h2 className="text-lg font-bold">Request patient access</h2><p className="text-sm">For a patient who did not consent at booking. The patient approves or declines in their own dashboard.</p>
    <div className="grid gap-3 md:grid-cols-2">{input('Patient record ID (from the patient)', shareForm.patient_record_id, value => setShareForm({ ...shareForm, patient_record_id: value }))}{input('Purpose', shareForm.purpose, value => setShareForm({ ...shareForm, purpose: value }))}</div>
    <div className="flex flex-wrap gap-3"><select className="rounded-lg border p-2" value={shareForm.resource_type} onChange={e => setShareForm({ ...shareForm, resource_type: e.target.value, action: e.target.value === 'ENCOUNTER' ? 'REVIEW' : 'VIEW' })}><option value="ENCOUNTER">Consultation record access</option><option value="PRESCRIPTION">A specific prescription</option><option value="REPORT">A specific report</option></select>{shareForm.resource_type !== 'ENCOUNTER' && input('Prescription/report ID', shareForm.resource_id, value => setShareForm({ ...shareForm, resource_id: value }))}{input('Minutes', shareForm.duration_minutes, value => setShareForm({ ...shareForm, duration_minutes: Number(value) }), 'number')}</div>
    <button className={button} onClick={submit}>Request access</button></section>;
}
