// Free website check. Automated only: fetches the homepage, applies fixed rules, returns the report.
// No AI call. Never emails the customer; the team is notified from the Gmail bridge.

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const SUPABASE_URL = 'https://xqabhktmkeadzrxkmepo.supabase.co';
const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 1500000;
const DAY = 86400000;
const LIMITS = { perIpPerDay: 5, perSitePer30Days: 1, perEmailPer30Days: 3 };
const NOTICE = 'This is an automated check of your homepage only. It does not measure search rankings, keywords or competitors. A detailed plan is a paid service.';

// Accepts a normal website address. Refuses anything that could point the check at an internal address.
export function cleanUrl(input) {
  let raw = String(input || '').trim();
  if (!raw || raw.length > 300) return null;
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== '80' && u.port !== '443') return null;
  const host = u.hostname.toLowerCase();
  if (!host.includes('.') || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null;
  if (/^[0-9.]+$/.test(host) || host.includes(':')) return null; // no raw IP addresses
  return u;
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp('\\s' + name + '\\s*=\\s*["\']([^"\']*)["\']', 'i'));
  return m ? m[1] : null;
};

// Pure function: takes the page HTML and returns the report. Used by the Worker and by tests.
export function runChecks(html, finalUrl, ms, bytes) {
  const checks = [];
  const add = (id, label, status, note) => checks.push({ id, label, status, note });

  if (finalUrl.startsWith('https://')) add('https', 'Secure connection', 'pass', 'The site loads over HTTPS.');
  else add('https', 'Secure connection', 'fail', 'The site loads without HTTPS. Visitors and Google treat it as less safe. Add an SSL certificate and redirect to HTTPS.');

  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleM ? titleM[1].replace(/\s+/g, ' ').trim() : '';
  if (!title) add('title', 'Page title', 'fail', 'No page title. Add a clear title with your business name and main service.');
  else if (title.length < 30 || title.length > 60) add('title', 'Page title', 'warn', `The title is ${title.length} characters. Aim for 30 to 60 so it shows in full on Google.`);
  else add('title', 'Page title', 'pass', `The title is ${title.length} characters, a good length.`);

  const descTag = (html.match(/<meta[^>]+name\s*=\s*["']description["'][^>]*>/i) || [])[0];
  const desc = descTag ? (attr(descTag, 'content') || '').trim() : '';
  if (!desc) add('description', 'Meta description', 'fail', 'No description. Add one or two sentences that say what you do and where, so Google can show it under your link.');
  else if (desc.length < 70 || desc.length > 160) add('description', 'Meta description', 'warn', `The description is ${desc.length} characters. Aim for 70 to 160.`);
  else add('description', 'Meta description', 'pass', `The description is ${desc.length} characters, a good length.`);

  if (/<meta[^>]+name\s*=\s*["']viewport["']/i.test(html)) add('mobile', 'Mobile layout setting', 'pass', 'The page declares a mobile viewport.');
  else add('mobile', 'Mobile layout setting', 'fail', 'No mobile viewport setting. On phones the page will look shrunk and hard to use.');

  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1Count === 1) add('h1', 'Main heading', 'pass', 'One main heading (H1) is present.');
  else if (h1Count === 0) add('h1', 'Main heading', 'fail', 'No main heading (H1). Add one clear heading that names what you do.');
  else add('h1', 'Main heading', 'warn', `There are ${h1Count} main headings. Keep one H1 per page.`);

  if (/<meta[^>]+name\s*=\s*["']robots["'][^>]*noindex/i.test(html)) add('index', 'Visible to Google', 'fail', 'The page asks search engines not to list it (noindex). It will not appear on Google until that is removed.');
  else add('index', 'Visible to Google', 'pass', 'The page allows search engines to list it.');

  if (!/<html[^>]*\slang\s*=\s*["'][^"']+["']/i.test(html)) add('lang', 'Language setting', 'warn', 'The page does not declare its language. Add a lang attribute to the html tag.');

  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter(t => !/\salt\s*=/i.test(t)).length;
  if (noAlt > 0) add('alt', 'Image descriptions', 'warn', `${noAlt} image${noAlt === 1 ? '' : 's'} have no alt text. Describe them so search engines and screen readers understand them.`);
  else add('alt', 'Image descriptions', 'pass', imgs.length ? 'Every image has alt text.' : 'No images found on the page.');

  if (ms <= 1500) add('speed', 'Load time', 'pass', `The page answered in ${ms} ms from our check server.`);
  else if (ms <= 3000) add('speed', 'Load time', 'warn', `The page answered in ${ms} ms. Visitors on mobile data may wait longer. Compress images and reduce scripts.`);
  else add('speed', 'Load time', 'fail', `The page took ${ms} ms to answer. Slow pages lose visitors. Check hosting and heavy images first.`);

  if (bytes > 1000000) add('size', 'Page size', 'warn', `The page HTML is ${Math.round(bytes / 1000)} KB. Large pages load slowly on phones.`);

  const penalty = { pass: 0, warn: 5, fail: 15 };
  const score = Math.max(0, 100 - checks.reduce((sum, c) => sum + penalty[c.status], 0));
  return { url: finalUrl, score, checks, notice: NOTICE };
}

async function sha256Hex(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function handleAudit(request, env) {
  if (!env.SUPABASE_SERVICE_KEY) return json({ error: 'not_ready', message: 'The website check is not connected yet. Please contact the team.' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_request', message: 'Could not read the form. Please try again.' }, 400); }

  // Bots fill the hidden field, or submit faster than a person can type.
  if (body.website) return json({ error: 'bad_request', message: 'Could not run the check. Please try again.' }, 400);
  if (Number(body.elapsed) >= 0 && Number(body.elapsed) < 3000) return json({ error: 'too_fast', message: 'Please take a moment to fill in the form, then try again.' }, 400);

  const u = cleanUrl(body.url);
  if (!u) return json({ error: 'bad_url', message: 'Enter a website address, like yourbusiness.com.' }, 400);
  const email = String(body.email || '').trim().toLowerCase();
  if (!email || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'bad_email', message: 'Enter a valid email so our team can follow up.' }, 400);
  const name = String(body.name || '').trim().slice(0, 100);
  const host = u.hostname.toLowerCase();

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256Hex(ip + ':cidex-audit');
  const sbHeaders = { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY };
  const since = (days) => new Date(Date.now() - days * DAY).toISOString();
  const countRows = async (filter) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/audit_requests?select=id&${filter}`, { headers: sbHeaders });
    if (!res.ok) throw new Error('count ' + res.status);
    return (await res.json()).length;
  };

  try {
    if (await countRows(`ip_hash=eq.${ipHash}&created_at=gt.${since(1)}`) >= LIMITS.perIpPerDay)
      return json({ error: 'limit', message: 'You have reached today\u2019s limit for the free check. Please try again tomorrow.' }, 429);
    if (await countRows(`host=eq.${host}&created_at=gt.${since(30)}`) >= LIMITS.perSitePer30Days)
      return json({ error: 'recent', message: 'This website was checked in the last 30 days. Our team has the result and may contact you.' }, 429);
    if (await countRows(`email=eq.${encodeURIComponent(email)}&created_at=gt.${since(30)}`) >= LIMITS.perEmailPer30Days)
      return json({ error: 'limit', message: 'This email has reached the free check limit for this month.' }, 429);
  } catch {
    return json({ error: 'busy', message: 'The check is busy right now. Please try again in a few minutes.' }, 503);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  const started = Date.now();
  let res, buf;
  try {
    res = await fetch(u.toString(), { redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': 'CIDEX-SEO-Check/1.0', accept: 'text/html' } });
    buf = await res.arrayBuffer();
  } catch {
    clearTimeout(timer);
    return json({ error: 'unreachable', message: 'We could not open that website. Check the address and try again.' }, 422);
  }
  clearTimeout(timer);
  const ms = Date.now() - started;

  if (res.status >= 400) return json({ error: 'site_error', message: `The website answered with an error (${res.status}). Check that the address opens in a browser.` }, 422);
  if (!/text\/html/i.test(res.headers.get('content-type') || '')) return json({ error: 'not_html', message: 'That address is not a web page we can check.' }, 422);

  const bytes = buf.byteLength;
  const html = new TextDecoder().decode(buf.slice(0, MAX_BYTES));
  const report = runChecks(html, res.url || u.toString(), ms, bytes);

  const save = await fetch(`${SUPABASE_URL}/rest/v1/audit_requests`, {
    method: 'POST',
    headers: { ...sbHeaders, 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify({ url: report.url, host, name, email, score: report.score, result: report, ip_hash: ipHash })
  });
  if (!save.ok) return json({ error: 'save_failed', message: 'We could not save your check. Please try again.' }, 503);
  return json(report);
}
