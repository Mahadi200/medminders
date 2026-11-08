// Records a captioned product demo (WebM, 1280x720) from the live local app with fictional data.
// Staff tokens are obtained via the API so no password is ever typed or shown on screen.
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173', API = 'http://127.0.0.1:8000/api/v1';
const OUT = 'D:/WEB DESIGN IT/IDEA/MedMinders/docs/demo-video';
fs.mkdirSync(OUT + '/raw', { recursive: true });
const creds = Object.fromEntries(fs.readFileSync('D:/WEB DESIGN IT/IDEA/MedMinders/server/storage/app/demo-credentials.local.txt', 'utf8')
  .split(/\r?\n/).filter(l => l.includes('@demo.medminders.test')).map(l => { const [role, email, , pw] = l.trim().split(/\s+/); return [role, { email, pw }]; }));
const post = async (path, body) => { const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(path + ' ' + r.status); return r.json(); };
const tokens = {};
const sfx = String(Date.now()).slice(-4);
const PNAME = `Rahim ${sfx} (Fictional)`;

(async () => {
  for (const role of ['doctor', 'hospital', 'pharmacy']) tokens[role] = (await post('/auth/login', { email: creds[role].email, password: creds[role].pw })).token;
  const patient = await post('/auth/patients/register-password', { name: PNAME, phone: '0195' + String(Date.now()).slice(-7), password: 'fictional-' + sfx + '-pass', password_confirmation: 'fictional-' + sfx + '-pass' });
  tokens.patient = patient.token;

  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: OUT + '/raw', size: { width: 1280, height: 720 } } });
  const page = await ctx.newPage();
  const W = ms => page.waitForTimeout(ms);
  const caption = async (title, line = '') => page.evaluate(([t, l]) => {
    let el = document.getElementById('mm-caption');
    if (!el) { el = document.createElement('div'); el.id = 'mm-caption'; document.body.appendChild(el); }
    el.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;max-width:1100px;background:rgba(8,28,51,.94);color:#fff;padding:12px 22px;border-radius:14px;border-left:6px solid #14b8a6;font:600 20px/1.35 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);pointer-events:none';
    el.innerHTML = `<div>${t}</div>${l ? `<div style="font-weight:400;font-size:15px;opacity:.88;margin-top:3px">${l}</div>` : ''}`;
  }, [title, line]);
  const card = async (title, lines, ms) => { await page.setContent(`<html><body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0b2545,#0f766e);font-family:system-ui,sans-serif;color:#fff"><div style="max-width:980px;padding:40px"><p style="letter-spacing:.2em;text-transform:uppercase;color:#5eead4;font-weight:700;margin:0 0 12px">MedMinders</p><h1 style="font-size:46px;margin:0 0 22px;line-height:1.15">${title}</h1>${lines.map(l => `<p style="font-size:23px;margin:10px 0;opacity:.93">${l}</p>`).join('')}<p style="margin-top:34px;font-size:14px;opacity:.7">Demonstration with fictional people and organizations. Not for real patient care.</p></div></body></html>`); await W(ms); };
  const as = async (role, path, hash = '') => { await page.goto(BASE + '/'); await page.evaluate(t => sessionStorage.setItem('medminders_token', t), tokens[role]); await page.goto(BASE + path + hash); await W(2600); await page.locator('h1', { hasText: /portal/i }).first().waitFor({ timeout: 20000 }); await W(1200); };
  const scrollTo = async sel => { await page.locator(sel).first().scrollIntoViewIfNeeded(); await page.evaluate(s => { const e = document.querySelector(s); if (e) window.scrollBy(0, e.getBoundingClientRect().top - 90); }, sel); await W(500); };

  // 1. Problem
  await card('Antibiotics only work when they are used right.', ['Missed doses, incomplete courses and self-medication contribute to antimicrobial resistance (AMR).', 'Patients, doctors, pharmacies and hospitals rarely share one picture of a treatment course.'], 7000);
  // 2. Ecosystem
  await page.goto(BASE + '/'); await W(2600); await caption('MedMinders — patient-centred antimicrobial stewardship support', 'One connected workflow for patients, doctors, pharmacies and hospitals'); await W(4500);
  await page.goto(BASE + '/amr-awareness'); await W(2200); await caption('Bangla/English AMR education', 'Responsible antibiotic use explained for patients and caregivers'); await W(4000);

  // 3. Doctor profile & schedule
  await as('doctor', '/doctor-login'); await caption('Doctor: BMDC-reviewed profile', 'Verification shown honestly — fixtures here are fictional'); await W(3500);
  await scrollTo('#dashboard-profile'); await caption('Visiting schedule confirmed by the hospital', 'Linked by hospital ID — patients can only book confirmed slots'); await W(4500);

  // 4. Patient booking
  await as('patient', '/patient-login'); await scrollTo('#dashboard-book'); await caption('Patient: book a verified doctor', 'Password sign-up without SMS · phone stays unverified until verified');
  await page.getByRole('button', { name: /Dr\. Demo Ayesha/ }).click(); await W(1200);
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
  await page.locator('#dashboard-book input[type=date]').fill(tomorrow); await W(2200);
  await page.locator('#dashboard-book button:not([disabled])', { hasText: /\d\d:\d\d (AM|PM)/ }).nth(5 + Number(sfx) % 20).click(); await W(1500);
  await caption('Consent is explicit and time-limited', 'The doctor may open this record for this visit only'); await W(2500);
  await page.getByRole('button', { name: /^Request / }).click(); await page.getByText('Request sent to the hospital').first().waitFor({ timeout: 60000 }); await W(1000);
  await scrollTo('#dashboard-appointments'); await caption('Request goes to the correct hospital', 'Status: awaiting hospital confirmation'); await W(3500);

  // 5. Hospital confirms
  await as('hospital', '/hospital-login'); await caption('Hospital front desk receives the request', 'Confirm, decline, or propose a new time (patient must accept)'); await W(2500);
  await page.locator('#dashboard-appointments div.rounded-xl', { hasText: PNAME }).first().getByRole('button', { name: 'Confirm' }).click(); await page.getByText('Updated. The patient was notified.').first().waitFor({ timeout: 60000 }); await W(1000);
  await caption('Confirmed — the doctor and patient are notified'); await W(2500);

  // 6. Doctor prescribes
  await as('doctor', '/doctor-login'); await caption('Doctor sees the confirmed appointment'); await W(2500);
  await scrollTo('#dashboard-prescribe'); await caption('Structured prescription: medicine, schedule, duration, tests, follow-up', 'MedMinders never suggests a drug or dose');
  const f = page.locator('#dashboard-prescribe');
  await f.locator('select').first().locator('option', { hasText: PNAME }).first().waitFor({ state: 'attached', timeout: 60000 });
  const value = await f.locator('select').first().locator('option', { hasText: PNAME }).first().getAttribute('value');
  await f.locator('select').first().selectOption(value); await W(600);
  if (await f.getByLabel('Allergy review').count()) await f.getByLabel('Allergy review').selectOption('NONE_KNOWN');
  await f.getByLabel('Diagnosis or provisional diagnosis').fill('Fictional: suspected bacterial infection');
  for (const [l, v] of [['Generic name', 'Amoxicillin'], ['Strength', '500 mg'], ['Dosage form', 'Capsule'], ['Dose and unit', '1 capsule'], ['Route', 'Oral']]) { await f.getByLabel(l).fill(v); await W(250); }
  await f.getByLabel('Schedule type').selectOption('EVERY_N_HOURS'); await f.getByLabel('Authorized quantity').fill('15');
  await f.getByLabel('Antibiotic').check(); await f.getByLabel('Clinical indication').fill('Fictional indication');
  await f.getByLabel('Investigation orders, comma separated').fill('Complete blood count'); await f.getByLabel('Follow-up', { exact: true }).fill('Review in 5 days');
  await W(1500); await f.getByRole('button', { name: 'Issue prescription' }).click(); await page.getByText('Prescription issued.').first().waitFor({ timeout: 60000 }); await W(1000);
  await caption('Issued — the patient sees it immediately'); await W(2500);

  // 7. Patient sharing & first dose
  await as('patient', '/patient-login'); await scrollTo('#dashboard-prescriptions'); await caption('Patient controls sharing', 'Pharmacy gets dispensing access; hospital gets the test order — each for 7 days, revocable');
  const rx = page.locator('#dashboard-prescriptions article').first();
  await rx.locator('select').nth(0).selectOption({ label: 'Demo Green Leaf Pharmacy (Fictional)' }); await W(700); await rx.getByRole('button', { name: 'Share 7 days' }).nth(0).click(); await page.getByText(/Shared with Demo Green Leaf/).first().waitFor({ timeout: 60000 }); await W(800);
  await rx.locator('select').nth(1).selectOption({ label: 'Demo Riverside General Hospital (Fictional)' }); await W(700); await rx.getByRole('button', { name: 'Share 7 days' }).nth(1).click(); await page.getByText(/Shared with Demo Riverside/).first().waitFor({ timeout: 60000 }); await W(1000);

  // 8. Pharmacy partial dispensing
  await as('pharmacy', '/pharmacy-login'); await scrollTo('#dashboard-dispensing'); await caption('Pharmacy sees only what the patient shared', 'Partial supply recorded — the prescription itself is never edited');
  const pc = page.locator('#dashboard-dispensing article', { hasText: PNAME }).first();
  await pc.getByLabel('Quantity').fill('6'); await W(800); await pc.getByRole('button', { name: 'Record supply' }).click(); await page.getByText(/Supply recorded/).first().waitFor({ timeout: 60000 }); await W(2000);

  // 9. Patient: first dose, alarm, tracking
  await as('patient', '/patient-login'); await scrollTo('#dashboard-courses'); await caption('The schedule starts from the confirmed first dose', 'Purchase, first dose and reported doses are tracked separately'); await W(2500);
  await page.getByRole('button', { name: 'I took the first dose now' }).click(); await page.getByText('First dose confirmed').first().waitFor({ timeout: 60000 }); await W(1500);
  await page.reload(); await W(3000);
  await page.getByRole('dialog').waitFor({ timeout: 40000 }); await caption('Due-dose alarm in the open app', 'Taken · Taken late · Skipped · Not sure — snooze never changes the prescribed time'); await W(5000);
  await page.getByRole('dialog').getByRole('button', { name: 'Taken', exact: true }).click(); await page.getByText('Dose report saved').first().waitFor({ timeout: 60000 }); await W(1000);
  await scrollTo('#dashboard-courses'); await caption('Clear course picture with honest denominators', 'Unconfirmed ≠ missed · estimated supply is labelled as an estimate'); await W(6000);
  await page.evaluate(() => window.scrollBy(0, 330)); await caption('Supply alert only when supply is short for the authorized course', 'No “buy more” prompt after a course ends'); await W(4500);
  await scrollTo('#dashboard-alarm'); await page.getByRole('button', { name: /Test alarm/ }).click(); await caption('Test alarm for demonstrations — this device only, nothing recorded'); await W(3500);
  await page.getByRole('button', { name: 'Close test alarm' }).click(); await W(800);

  // 10. Medication problem → doctor
  await scrollTo('#dashboard-problems'); await caption('Patient reports a medication problem', 'Reviewed in working hours — not an emergency service (call 999)');
  const box = page.locator('#dashboard-problems'); await box.locator('select').first().selectOption({ index: 1 }); await box.locator('textarea').fill('Fictional: mild nausea after the dose'); await W(1200);
  await box.getByRole('button', { name: 'Send to care team' }).click(); await page.getByText('Sent to your prescriber').first().waitFor({ timeout: 60000 }); await W(1000);
  await as('doctor', '/doctor-login'); await scrollTo('#dashboard-patients'); await caption('Authorized doctor sees adherence and the report', 'Patient-reported data, shown with denominators'); await W(4000);
  await scrollTo('#dashboard-problems'); const item = page.locator('#dashboard-problems div.rounded-xl', { hasText: 'Fictional: mild nausea' }).first();
  await item.getByPlaceholder('Response to patient (required)').fill('Take with food and continue as prescribed. Contact us if it worsens.'); await W(1200);
  await item.getByRole('button', { name: 'Resolve' }).click(); await page.getByText('Response saved and sent to the patient.').first().waitFor({ timeout: 60000 }); await caption('Response goes back to the patient'); await W(2500);

  // 11. Hospital report → patient
  await as('hospital', '/hospital-login'); await scrollTo('#dashboard-orders'); await caption('Hospital: accept test, bill in BDT, release a reviewed report');
  await page.locator('#dashboard-orders div', { hasText: PNAME }).filter({ has: page.getByRole('button', { name: 'Accept' }) }).last().getByRole('button', { name: 'Accept' }).click(); await page.getByText('Order accepted.').first().waitFor({ timeout: 60000 }); await W(800);
  const hc = page.locator('#dashboard-orders div.rounded-xl', { hasText: PNAME }).first();
  await hc.getByLabel('Price (BDT)').fill('450'); await hc.getByRole('button', { name: 'Create bill' }).click(); await page.getByText('Bill created.').first().waitFor({ timeout: 60000 }); await W(800);
  await hc.getByPlaceholder('Report observations').fill('Fictional CBC values within reference range.'); await hc.getByRole('button', { name: 'Save draft report' }).click(); await page.getByText(/Draft saved/).first().waitFor({ timeout: 60000 }); await W(800);
  await hc.getByRole('button', { name: 'Review and release' }).click(); await page.getByText(/Report released/).first().waitFor({ timeout: 60000 }); await W(1500);
  await as('patient', '/patient-login'); await scrollTo('#dashboard-reports'); await caption('Patient’s private records archive', 'Search and filter · provider-issued vs status labels');
  await page.locator('#dashboard-reports').getByRole('button', { name: 'View' }).first().click(); await W(4500);

  // 12. Close
  await card('Right medicine. Right dose. Right time.', ['MedMinders aims to support responsible antibiotic use — reduced misuse and AMR are goals, not yet measured outcomes.', 'Next: SMS/push reminders, licensed interaction data, Bangla PDFs, reviewed AI summaries, and clinical evaluation.'], 8000);

  await page.close(); const raw = await page.video().path(); await ctx.close(); await browser.close();
  fs.copyFileSync(raw, OUT + '/MedMinders_demo_captioned.webm'); fs.rmSync(OUT + '/raw', { recursive: true, force: true });
  console.log('saved', OUT + '/MedMinders_demo_captioned.webm');
})().catch(e => { console.error('RECORDING FAILED', e.message); process.exit(1); });
