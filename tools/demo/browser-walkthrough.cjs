// Browser walkthrough of the demo workflow using fictional fixtures. Passwords are read from the local-only file and never printed.
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = 'http://127.0.0.1:5173';
const OUT = process.env.SHOTS_DIR || require('os').tmpdir() + '/medminders-shots';
fs.mkdirSync(OUT, { recursive: true });
const creds = Object.fromEntries(fs.readFileSync('D:/WEB DESIGN IT/IDEA/MedMinders/server/storage/app/demo-credentials.local.txt', 'utf8')
  .split(/\r?\n/).filter(l => l.includes('@demo.medminders.test')).map(l => { const [role, email, , pw] = l.trim().split(/\s+/); return [role, { email, pw }]; }));
const results = [];
let page;
const step = async (name, fn) => { try { await fn(); results.push(['PASS', name]); console.log('PASS', name); } catch (e) { await page.screenshot({ path: OUT + '/FAIL-' + name.slice(0, 2).replace('.', '') + '.png' }).catch(() => {}); const so = page.getByRole('button', { name: 'Sign out' }); if (await so.count()) await so.click().catch(() => {}); results.push(['FAIL', name, e.message.split('\n')[0]]); console.log('FAIL', name, '-', e.message.split('\n')[0]); } };

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.url().includes('/api/') && r.status() >= 400) console.log('   API', r.status(), r.request().method(), r.url().replace('http://127.0.0.1:8000/api/v1', '')); });
  page.on('dialog', d => d.accept('Demo cancellation'));
  const shot = n => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: false });
  const go = async path => { await page.goto(BASE + path); await page.waitForTimeout(2200); };
  const staffLogin = async (path, who) => { await go(path); await page.getByLabel('Email').fill(creds[who].email); await page.getByLabel('Password', { exact: true }).fill(creds[who].pw); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.getByText(/portal$/i).first().waitFor({ timeout: 10000 }); await page.waitForTimeout(1500); };
  const logout = async () => { await page.getByRole('button', { name: 'Sign out' }).click(); await page.waitForTimeout(800); };
  const phone = '019' + String(Date.now()).slice(-8);
  const PNAME = 'E2E Patient ' + phone.slice(-4) + ' (Fictional)';

  await step('1. Doctor login opens doctor dashboard with confirmed schedule', async () => {
    await staffLogin('/doctor-login', 'doctor');
    await page.getByRole('heading', { name: 'doctor portal' }).waitFor();
    await page.getByText('Confirmed by hospital').first().waitFor();
    await shot('01-doctor-dashboard'); await logout();
  });

  await step('2. New patient registers with password (no SMS) and requests a slot', async () => {
    await go('/patient-register');
    await page.getByLabel('Full name').fill(PNAME); await page.getByLabel('Phone number').fill(phone);
    await page.getByLabel('Password', { exact: true }).fill('fictional-pass-123'); await page.getByLabel('Confirm password').fill('fictional-pass-123');
    await page.getByRole('button', { name: 'Create patient account' }).click();
    await page.getByRole('heading', { name: 'patient portal' }).waitFor({ timeout: 10000 });
    await page.waitForURL(/patient-login/, { timeout: 5000 });
    await page.getByText('Phone unverified').waitFor();
    await page.getByRole('button', { name: /Dr\. Demo Ayesha/ }).click();
    const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    await page.locator('#dashboard-book input[type=date]').fill(tomorrow);
    await page.waitForTimeout(1500);
    await page.locator('#dashboard-book button:not([disabled])', { hasText: /\d\d:\d\d (AM|PM)/ }).nth(3).click();
    await page.getByRole('button', { name: /^Request / }).click();
    await page.getByText('Request sent to the hospital').waitFor();
    await page.locator('#dashboard-appointments').getByText('Awaiting hospital').first().waitFor();
    await shot('02-patient-booking'); await logout();
  });

  await step('3. Hospital receives and confirms the request', async () => {
    await staffLogin('/hospital-login', 'hospital');
    const card = page.locator('#dashboard-appointments div.rounded-xl', { hasText: PNAME }).first();
    await card.getByRole('button', { name: 'Confirm' }).click();
    await page.getByText('Updated. The patient was notified.').waitFor();
    await shot('03-hospital-confirm'); await logout();
  });

  await step('4. Doctor sees confirmed appointment and issues an antibiotic prescription', async () => {
    await staffLogin('/doctor-login', 'doctor');
    await page.locator('#dashboard-appointments').getByText(PNAME).first().waitFor();
    const f = page.locator('#dashboard-prescribe');
    await f.locator('select').first().selectOption({ label: /E2E Patient/ }.label ? undefined : undefined).catch(() => {});
    const value = await f.locator('select').first().locator('option', { hasText: PNAME }).first().getAttribute('value');
    await f.locator('select').first().selectOption(value);
    if (await f.getByLabel('Allergy review').count()) await f.getByLabel('Allergy review').selectOption('NONE_KNOWN');
    await f.getByLabel('Diagnosis or provisional diagnosis').fill('Fictional demo: suspected bacterial infection');
    await f.getByLabel('Generic name').fill('Amoxicillin'); await f.getByLabel('Strength').fill('500 mg'); await f.getByLabel('Dosage form').fill('Capsule');
    await f.getByLabel('Dose and unit').fill('1 capsule'); await f.getByLabel('Route').fill('Oral');
    await f.getByLabel('Schedule type').selectOption('EVERY_N_HOURS');
    await f.getByLabel('Authorized quantity').fill('15');
    await f.getByLabel('Antibiotic').check(); await f.getByLabel('Clinical indication').fill('Fictional indication');
    await f.getByLabel('Investigation orders, comma separated').fill('Complete blood count');
    await f.getByLabel('Follow-up', { exact: true }).fill('Review in 5 days');
    await f.getByRole('button', { name: 'Issue prescription' }).click();
    await page.getByText('Prescription issued.').waitFor({ timeout: 10000 });
    await shot('04-doctor-prescription'); await logout();
  });

  const patientLogin = async () => { await go('/patient-login'); await page.getByLabel('Phone or linked email').fill(phone); await page.getByLabel('Password', { exact: true }).fill('fictional-pass-123'); await page.locator('form button[class]', { hasText: 'Sign in with password' }).last().click(); await page.getByRole('heading', { name: 'patient portal' }).waitFor({ timeout: 10000 }); await page.waitForTimeout(1500); };

  await step('5. Patient sees prescription, shares with pharmacy and hospital, confirms first dose', async () => {
    await patientLogin();
    const rx = page.locator('#dashboard-prescriptions article').first();
    await rx.getByText('Amoxicillin').first().waitFor();
    const selects = rx.locator('select');
    await selects.nth(0).selectOption({ label: 'Demo Green Leaf Pharmacy (Fictional)' }); await rx.getByRole('button', { name: 'Share 7 days' }).nth(0).click();
    await page.getByText(/Shared with Demo Green Leaf/).waitFor();
    await selects.nth(1).selectOption({ label: 'Demo Riverside General Hospital (Fictional)' }); await rx.getByRole('button', { name: 'Share 7 days' }).nth(1).click();
    await page.getByText(/Shared with Demo Riverside/).waitFor();
    await page.getByRole('button', { name: 'I took the first dose now' }).click();
    await page.getByText('First dose confirmed').waitFor();
    await shot('05-patient-share-start'); await logout();
  });

  await step('6. Pharmacy records partial dispensing', async () => {
    await staffLogin('/pharmacy-login', 'pharmacy');
    const card = page.locator('#dashboard-dispensing article', { hasText: PNAME }).first();
    await card.getByLabel('Quantity').fill('6');
    await card.getByRole('button', { name: 'Record supply' }).click();
    await page.getByText(/Supply recorded. Remaining authorized: 9/).waitFor();
    await shot('06-pharmacy-dispense'); await logout();
  });

  await step('7. Patient dose tracking, due-dose alarm modal, test alarm, log Taken', async () => {
    await patientLogin();
    await page.getByRole('dialog').waitFor({ timeout: 35000 });
    await shot('07a-alarm-modal');
    await page.getByRole('dialog').getByRole('button', { name: 'Taken', exact: true }).click();
    await page.getByText('Dose report saved').first().waitFor();
    await page.getByRole('button', { name: 'Enable alarm sound' }).click();
    await page.getByRole('button', { name: /Test alarm/ }).click();
    await page.getByText(/TEST ALARM — demonstration only/).waitFor();
    await shot('07b-test-alarm');
    await page.getByRole('button', { name: 'Close test alarm' }).click();
    const tracker = page.locator('#dashboard-courses');
    await tracker.getByText('Dispensed (pharmacy)').waitFor();
    await tracker.scrollIntoViewIfNeeded(); await shot('07c-course-tracker');
  });

  await step('8. Patient reports medication problem; doctor reviews it', async () => {
    const box = page.locator('#dashboard-problems');
    await box.locator('select').first().selectOption({ index: 1 });
    await box.locator('textarea').fill('Fictional: mild nausea after dose');
    await box.getByRole('button', { name: 'Send to care team' }).click();
    await page.getByText('Sent to your prescriber').waitFor();
    await logout();
    await staffLogin('/doctor-login', 'doctor');
    const item = page.locator('#dashboard-problems div.rounded-xl', { hasText: 'Fictional: mild nausea' }).first();
    await item.getByPlaceholder('Response to patient (required)').fill('Take with food and continue as prescribed. Contact us if it worsens.');
    await item.getByRole('button', { name: 'Resolve' }).click();
    await page.getByText('Response saved and sent to the patient.').waitFor();
    await page.locator('#dashboard-patients').getByText(PNAME).first().waitFor();
    await shot('08-doctor-problem'); await logout();
  });

  await step('9. Hospital accepts test, bills, releases report; patient views it', async () => {
    await staffLogin('/hospital-login', 'hospital');
    const inc = page.locator('#dashboard-orders div', { hasText: PNAME }).filter({ has: page.getByRole('button', { name: 'Accept' }) }).last();
    await inc.getByRole('button', { name: 'Accept' }).click();
    await page.getByText('Order accepted.').waitFor();
    const card = page.locator('#dashboard-orders div.rounded-xl', { hasText: PNAME }).first();
    await card.getByLabel('Price (BDT)').fill('450'); await card.getByRole('button', { name: 'Create bill' }).click(); await page.getByText('Bill created.').waitFor();
    await card.getByPlaceholder('Report observations').fill('Fictional CBC values within reference range.');
    await card.getByRole('button', { name: 'Save draft report' }).click(); await page.getByText(/Draft saved/).waitFor();
    await card.getByRole('button', { name: 'Review and release' }).click(); await page.getByText(/Report released/).waitFor();
    await shot('09a-hospital-report'); await logout();
    await patientLogin();
    const arch = page.locator('#dashboard-reports');
    await arch.getByRole('button', { name: 'View' }).first().click();
    await arch.getByText('Fictional CBC values within reference range.').waitFor();
    await arch.scrollIntoViewIfNeeded(); await shot('09b-patient-report');
  });

  await step('10. Refresh keeps session; role URL enforced; logout clears access', async () => {
    await page.reload(); await page.waitForTimeout(2500);
    await page.getByRole('heading', { name: 'patient portal' }).waitFor();
    await page.goto(BASE + '/doctor-login'); await page.waitForURL(/patient-login/, { timeout: 20000 }).catch(() => {});
    if (!page.url().includes('/patient-login')) throw new Error('Patient session was shown on ' + page.url());
    await page.goBack(); await page.waitForTimeout(1500);
    await logout();
    await page.reload(); await page.waitForTimeout(2500);
    await page.locator('form button', { hasText: 'Sign in with password' }).first().waitFor();
    const leaked = await page.evaluate(() => sessionStorage.getItem('medminders_token'));
    if (leaked) throw new Error('token remained after logout');
  });

  await step('Mobile layout renders patient login without horizontal scroll', async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await go('/patient-login');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await shot('11-mobile-login');
    if (overflow > 4) throw new Error('horizontal overflow ' + overflow + 'px');
  });

  console.log('\nPage errors:', errors.length ? errors : 'none');
  fs.writeFileSync(OUT + '/results.json', JSON.stringify({ results, errors }, null, 2));
  await browser.close();
})();
