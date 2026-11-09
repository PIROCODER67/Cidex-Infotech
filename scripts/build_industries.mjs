// Builds one page per industry from industries/industries.json, and the Industries section on the home page.
// Run from the project folder: node scripts/build_industries.mjs
import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'industries/industries.json'), 'utf8'));
const sitePath = path.join(root, 'claude_changes.txt');
let site = fs.readFileSync(sitePath, 'utf8');
const BASE = 'https://cidexinfotech.com';
const WA = 'https://wa.me/918777324473?text=';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const li = (items) => items.map((x) => `<li>${esc(x)}</li>`).join('');
const styles = [...site.matchAll(/<style>[\s\S]*?<\/style>/g)].map((m) => m[0]).join('\n');

const pageCss = `
  .ind-page{padding-top:120px; padding-bottom:80px; max-width:820px;}
  .ind-page h1{font-size:clamp(2rem,4.4vw,3rem); font-weight:700; letter-spacing:-0.02em; margin:14px 0 18px; color:var(--hi);}
  .ind-page h2{font-size:1.25rem; font-weight:700; color:var(--hi); margin:36px 0 12px;}
  .ind-lead{color:var(--lo); font-size:1.08rem; font-weight:300; line-height:1.6;}
  .ind-page p, .ind-page li{color:var(--lo); font-weight:300; line-height:1.6;}
  .ind-list{list-style:none; padding:0; margin:0; display:grid; gap:10px;}
  .ind-list li{border-top:1px solid var(--hairline); padding-top:10px;}
  .ind-note{margin-top:32px; border:1px solid var(--hairline-hi); border-radius:14px; padding:16px 18px; background:var(--glass); color:var(--lo); font-size:0.9rem; line-height:1.55;}
  .ind-cta{display:flex; gap:12px; flex-wrap:wrap; margin-top:36px;}
  .ind-top{position:fixed; top:0; left:0; right:0; z-index:50; display:flex; justify-content:space-between; align-items:center; padding:16px 24px; background:rgba(5,5,5,0.7); backdrop-filter:blur(12px);}
  .ind-top a{color:var(--hi); text-decoration:none; font-size:0.9rem;}
  .ind-top a.ind-brand{font-weight:700;}
  .ind-top nav{display:flex; gap:18px;}
  .ind-foot{margin-top:60px; color:var(--lo-dim); font-size:0.8rem;}
  .ind-grid{display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr)); gap:14px; margin-top:28px;}
  .ind-card{display:flex; flex-direction:column; gap:6px; padding:18px; border:1px solid var(--hairline-hi); border-radius:14px; background:var(--glass); text-decoration:none; color:var(--lo);}
  .ind-card strong{color:var(--hi); font-size:1rem; font-weight:600;}
  .ind-card span{font-size:0.86rem; font-weight:300; line-height:1.5;}
  .ind-card:hover{border-color:var(--cyan);}
`;

function page(ind) {
  const note = ind.note ? `<aside class="ind-note">${esc(ind.note)}</aside>` : '';
  const proof = ind.proof.length ? `<section><h2>Why trust us</h2><ul class="ind-list">${li(ind.proof)}</ul></section>` : '';
  const waText = encodeURIComponent(`Hi CIDEX, I would like to talk about ${ind.name.toLowerCase()}.`);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(ind.name)} | CIDEX Infotech</title>
<meta name="description" content="${esc(ind.title)}. Websites, SEO and online systems for ${esc(ind.name.toLowerCase())} from CIDEX Infotech.">
<link rel="canonical" href="${BASE}/industries/${ind.slug}.html">
<meta name="robots" content="index, follow">
${styles}
<style>${pageCss}</style>
</head>
<body>
<header class="ind-top">
  <a class="ind-brand" href="/">CIDEX Infotech</a>
  <nav><a href="/#industries">All industries</a><a href="/#seo-check">Free website check</a></nav>
</header>
<main class="wrap ind-page">
  <span class="eyebrow">${esc(ind.name)}</span>
  <h1>${esc(ind.title)}</h1>
  <p class="ind-lead">${esc(ind.problem)}</p>

  <section>
    <h2>Questions we get</h2>
    <ul class="ind-list">${li(ind.asks)}</ul>
    <p>Ask us on WhatsApp and we will answer you directly.</p>
  </section>

  <section>
    <h2>What holds people back</h2>
    <ul class="ind-list">${li(ind.worries)}</ul>
  </section>

  ${proof}

  <section>
    <h2>How we can help</h2>
    <p>${esc(ind.lead)}</p>
    <ul class="ind-list">${li(ind.services)}</ul>
  </section>

  ${note}

  <div class="ind-cta">
    <a class="btn-primary" href="/#seo-check">Run a free website check</a>
    <a class="btn-ghost" href="${WA}${waText}" target="_blank" rel="noopener">WhatsApp us</a>
    <a class="btn-ghost" href="/#industries">See other industries</a>
  </div>

  <p class="ind-foot">CIDEX Infotech, Kolkata. Prices are on our <a href="/#pricing">price list</a>.</p>
</main>
</body>
</html>
`;
}

// Writes the pages
fs.mkdirSync(path.join(root, 'public/industries'), { recursive: true });
for (const ind of data) {
  fs.writeFileSync(path.join(root, 'public/industries', ind.slug + '.html'), page(ind));
}

// Home page section (between markers)
const cards = data.map((ind) =>
  `<a class="ind-card" href="/industries/${ind.slug}.html"><strong>${esc(ind.name)}</strong><span>${esc(ind.title)}</span></a>`
).join('\n        ');
const section = `<!-- INDUSTRIES:START -->
    <section id="industries">
      <div class="wrap">
        <span class="eyebrow">Industries</span>
        <h2 style="font-size:clamp(1.8rem,3.4vw,2.5rem); font-weight:700; letter-spacing:-0.02em; margin-bottom:14px;">Built for your industry</h2>
        <p style="color:var(--lo); font-size:1.02rem; font-weight:300; max-width:60ch;">Pick your business to see the problems we solve and how we would help.</p>
        <div class="ind-grid">
        ${cards}
        </div>
      </div>
    </section>
    <!-- INDUSTRIES:END -->`;
const re = /<!-- INDUSTRIES:START -->[\s\S]*?<!-- INDUSTRIES:END -->/;
if (!re.test(site)) throw new Error('INDUSTRIES markers missing in claude_changes.txt');
site = site.replace(re, section);
fs.writeFileSync(sitePath, site);
fs.writeFileSync(path.join(root, 'public/index.html'), site);

// Sitemap
const urls = [`${BASE}/`, ...data.map((d) => `${BASE}/industries/${d.slug}.html`)];
fs.writeFileSync(path.join(root, 'public/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') + `\n</urlset>\n`);
console.log(`Built ${data.length} industry pages, home section, sitemap (${urls.length} URLs).`);
