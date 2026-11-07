// CIDEX INFOTECH - pricing rules, version v1 (2026-11-08).
// Source: founder's filled questions file and pricing_rules_locked.txt.
// The AI never sets a price. It only collects answers; this file decides the number.

export const RULE_VERSION = 'v1-2026-11-08';
export const TEAM_THRESHOLD_INR = 100000; // exactly 1 lakh and above goes to the team
export const COPY_PER_PAGE_INR = 800;
export const CONTACT = { phone: '+91 87773 24473', email: 'cidexinfotech1@gmail.com' };

const roundTen = (n) => Math.round(n / 10) * 10;
const sum = (lines) => lines.reduce((t, l) => t + l.inr, 0);

// ---------- Question definitions (the AI asks these, in its own words) ----------
const Q = {
  website: [
    { key: 'website_type', type: 'choice', options: ['standard', 'interactive', 'custom', 'complex_or_app'], question: 'Standard business website, interactive/motion-rich, custom-designed, or complex/web app?' },
    { key: 'pages', type: 'number', question: 'How many pages do you need?' },
    { key: 'contact_forms', type: 'number', question: 'How many contact or enquiry forms? (0 if none)' },
    { key: 'payment_gateway', type: 'boolean', question: 'Do you need online payments?' },
    { key: 'products', type: 'number', question: 'Do you sell products online? How many? (0 if none)' },
    { key: 'content_supplied', type: 'boolean', question: 'Will you supply all the text and images yourself?' },
    { key: 'multilingual', type: 'boolean', question: 'Do you need more than one language?' },
  ],
  seo: [
    { key: 'pages_to_optimise', type: 'number', question: 'How many existing pages should we optimise?' },
    { key: 'keywords', type: 'number', question: 'How many target keywords do you want?' },
    { key: 'content_writing', type: 'boolean', question: 'Do you need us to write articles or new content?' },
  ],
  ads: [
    { key: 'campaigns', type: 'number', question: 'How many active campaigns do you want to run?' },
    { key: 'platforms', type: 'number', question: 'How many platforms? (Google, Meta = Facebook/Instagram)' },
    { key: 'other_platforms', type: 'boolean', question: 'Do you need platforms other than Google or Meta?' },
    { key: 'monthly_ad_budget', type: 'number', question: 'What is your monthly ad budget in ₹? (You pay this to the platform; it is separate from our fee.)' },
  ],
  social: [
    { key: 'platforms', type: 'number', question: 'How many social media platforms?' },
    { key: 'posts', type: 'number', question: 'How many feed posts per month?' },
    { key: 'reels', type: 'number', question: 'How many reels or videos per month? (0 if none)' },
  ],
  design: [
    { key: 'item', type: 'choice', options: ['logo', 'brand_kit', 'favicon', 'social_graphic', 'website_banner', 'ad_banner', 'poster', 'business_card', 'letterhead', 'presentation_cover'], question: 'What do you need designed? (logo, brand kit, favicon, social graphic, website banner, ad banner, poster, business card, letterhead, presentation cover)' },
    { key: 'quantity', type: 'number', question: 'How many of this item? (1 for logo, brand kit or favicon)' },
  ],
  video: [
    { key: 'videos', type: 'number', question: 'How many videos?' },
    { key: 'raw_minutes', type: 'number', question: 'How many minutes of raw footage per video?' },
    { key: 'final_minutes', type: 'number', question: 'How many minutes should each final video be?' },
    { key: 'subtitles', type: 'boolean', question: 'Do you need subtitles or animated titles?' },
  ],
  ai_automation: [
    { key: 'steps', type: 'number', question: 'How many steps does the automated process have?' },
    { key: 'systems', type: 'number', question: 'How many tools or systems need to connect?' },
    { key: 'sensitive_data', type: 'boolean', question: 'Does it involve sensitive customer, money or HR data?' },
  ],
  business_automation: [
    { key: 'item', type: 'choice', options: ['task_sheets', 'performance_index', 'api_integration', 'webhook', 'admin_access', 'handover_docs', 'extended_docs', 'workspace_basic', 'workspace_advanced', 'domain_basic', 'domain_advanced', 'vault_basic', 'vault_advanced', 'hr_onboarding', 'sop_basic', 'sop_extensive', 'feedback_workflow', 'invoicing_pipeline', 'crm_basic', 'crm_advanced', 'client_portal'], question: 'Which business automation do you need? (task sheets, performance index, API integration, webhook, admin access, handover docs, workspace deployment, domain setup, password vault, HR onboarding, SOP library, feedback workflow, invoicing, CRM, client portal)' },
    { key: 'people', type: 'number', question: 'How many people will use it (employees or users)?' },
    { key: 'count', type: 'number', question: 'How many of the main items does it handle? (APIs, event types, roles, subdomains, onboarding stages, or SOP documents; 1 if not sure)' },
  ],
  research: [
    { key: 'level', type: 'choice', options: ['basic', 'standard', 'advanced', 'deep'], question: 'How deep should the research be: basic, standard, advanced, or deep/specialised?' },
  ],
  website_management: [
    { key: 'updates_per_month', type: 'number', question: 'How many content or small updates per month?' },
    { key: 'backend_complex', type: 'boolean', question: 'Does the site have databases, logins or complex backend systems?' },
  ],
  email: [
    { key: 'contacts', type: 'number', question: 'How many contacts are on your list?' },
    { key: 'campaigns', type: 'number', question: 'How many email campaigns do you need?' },
    { key: 'automation', type: 'boolean', question: 'Do you need automated email sequences (welcome, follow-up)?' },
    { key: 'recurring', type: 'boolean', question: 'Do you need a monthly or recurring newsletter service?' },
    { key: 'crm', type: 'boolean', question: 'Do you need the email tool connected to a CRM?' },
  ],
  other: [
    { key: 'service', type: 'choice', options: [], question: 'Which service?' }, // options filled below
  ],
};

// Starting prices for services that are priced as "from" with no calculation.
const OTHER = {
  email_automation: ['Email marketing automation', 10000],
  whatsapp_automation: ['WhatsApp Business automation', 15000],
  chatbot: ['Chatbot development and deployment', 15000],
  custom_ai_assistant: ['Custom AI assistant / business chatbot', 25000],
  ai_document_processing: ['AI document processing system', 20000],
  ai_data_analysis: ['AI-powered data analysis', 10000],
  process_consulting: ['Business process analysis and consultation', 5000],
  workflow_consulting: ['Workflow automation consulting', 5000],
  data_migration: ['Data migration between platforms', 10000],
  database_design: ['Database design and optimisation', 10000],
  speed_optimisation: ['Website speed optimisation', 5000],
  security_configuration: ['Website security configuration', 5000],
  accessibility_improvements: ['Website accessibility improvements', 5000],
  backup_setup: ['Website backup and recovery setup', 3000],
  website_migration: ['Website migration', 10000],
  website_redesign: ['Website redesign', 15000],
  landing_page: ['Landing page development', 5000],
  ecommerce_maintenance: ['E-commerce maintenance (per month)', 8000],
  analytics_setup: ['Analytics and tracking setup', 5000],
  search_console_setup: ['Google Search Console / Analytics setup', 3000],
  conversion_tracking: ['Conversion tracking setup', 5000],
  custom_dashboard: ['Custom dashboard development', 15000],
  data_visualisation: ['Data visualisation and reporting', 5000],
  presentation_design: ['Presentation design', 2000],
  brochure_design: ['Brochure and catalogue design', 2000],
  technical_documentation: ['Technical documentation', 3000],
  accessibility_audit: ['Website accessibility audit', 5000],
};
Q.other[0].options = Object.keys(OTHER);

// Business automation items: label, price, and the limit that sends it to the team.
const BIZ = {
  task_sheets: { label: 'Employee Task Management Sheets', inr: 10000, field: 'people', max: 15 },
  performance_index: { label: 'Automated Performance Index', inr: 15000, field: 'people', max: 15 },
  api_integration: { label: 'API integration', inr: 10000, field: 'count', max: 1 },
  webhook: { label: 'Webhook integration', inr: 5000, field: 'count', max: 1 },
  admin_access: { label: 'Admin control & user access', inr: 8000, field: 'count', max: 3 },
  handover_docs: { label: 'Handover documentation', inr: 3000, field: 'count', max: 99 },
  extended_docs: { label: 'Extended technical documentation', inr: 5000, field: 'count', max: 99 },
  workspace_basic: { label: 'Google Workspace / Microsoft 365 deployment', inr: 5000, field: 'people', max: 5 },
  workspace_advanced: { label: 'Advanced Workspace deployment', inr: 10000, field: 'people', max: 15 },
  domain_basic: { label: 'Custom domain portfolio architecture', inr: 3000, field: 'count', max: 3 },
  domain_advanced: { label: 'Advanced domain architecture', inr: 7000, field: 'count', max: 10 },
  vault_basic: { label: 'Basic business password-vault setup', inr: 3000, field: 'people', max: 5 },
  vault_advanced: { label: 'Advanced password-vault configuration', inr: 7000, field: 'people', max: 15 },
  hr_onboarding: { label: 'Automated HR onboarding pipeline', inr: 20000, field: 'count', max: 5 },
  sop_basic: { label: 'SOP library development', inr: 15000, field: 'count', max: 15 },
  sop_extensive: { label: 'Extensive SOP library', inr: 40000, field: 'count', max: 50 },
  feedback_workflow: { label: 'Employee feedback and appraisal workflow', inr: 10000, field: 'people', max: 15 },
  invoicing_pipeline: { label: 'Automated invoicing and expense pipeline', inr: 10000, field: 'count', max: 1 },
  crm_basic: { label: 'Basic CRM setup', inr: 15000, field: 'people', max: 5 },
  crm_advanced: { label: 'Advanced CRM configuration', inr: 40000, field: 'people', max: 15 },
  client_portal: { label: 'Automated client onboarding portal', inr: 35000, field: null, max: 0 },
};

const DESIGN = {
  logo: ['Logo design', 5000, 1],
  brand_kit: ['Brand identity and brand kit', 25000, 1],
  favicon: ['Favicon design', 1000, 1],
  social_graphic: ['Basic social media graphic (from)', 500, 10],
  website_banner: ['Website banner (from)', 1000, 10],
  ad_banner: ['Advertisement banner (from)', 750, 10],
  poster: ['Poster / flyer (from)', 1000, 10],
  business_card: ['Business card', 1000, 10],
  letterhead: ['Letterhead', 1000, 10],
  presentation_cover: ['Presentation cover (from)', 750, 10],
};

// ---------- Calculators ----------
// Each returns { status: 'estimate', lines, period } | { status: 'team', reason } | { status: 'from', lines }.

function calcWebsite(a) {
  if (a.website_type === 'custom' || a.website_type === 'complex_or_app') return team('Custom-designed, complex and web-app projects are quoted by the team.');
  if (a.multilingual) return team('Multilingual websites are quoted by the team.');
  if (a.products > 20) return team('Stores with more than 20 products are quoted by the team.');
  const lines = [];
  if (a.website_type === 'interactive') {
    lines.push({ label: 'Interactive & Motion-Rich website (starting)', inr: 80000 });
    const extra = Math.max(0, a.pages - 5);
    if (extra) lines.push({ label: `${extra} extra page(s) beyond 5`, inr: extra * 5000 });
  } else {
    if (a.pages > 15) return team('Standard websites above 15 pages are quoted by the team.');
    const tiers = [[5, 'Basic Website', 10000], [8, 'Professional Website', 20000], [12, 'Advanced Standard Website', 35000], [15, 'Premium Standard Website', 50000]];
    let idx = tiers.findIndex((t) => a.pages <= t[0]);
    if (a.contact_forms > 2) idx = Math.max(idx, 2); // more than 2 forms moves to Advanced
    lines.push({ label: tiers[idx][1], inr: tiers[idx][2] });
  }
  if (a.products > 0) lines.push({ label: 'E-commerce setup (up to 20 products, includes one gateway)', inr: 20000 });
  else if (a.payment_gateway) lines.push({ label: 'Payment gateway integration', inr: 20000 });
  if (!a.content_supplied) lines.push({ label: `Copywriting (${a.pages} page(s) at ₹${COPY_PER_PAGE_INR})`, inr: COPY_PER_PAGE_INR * a.pages });
  return { status: 'estimate', lines, period: 'one-time' };
}

function calcSeo(a) {
  if (a.content_writing) return team('Content writing for SEO is quoted separately.');
  const tiers = [['Basic SEO', 6000, 5, 5], ['Growth SEO', 12000, 15, 10], ['Advanced SEO', 25000, 30, 20]];
  const t = tiers.find((x) => a.keywords <= x[2] && a.pages_to_optimise <= x[3]);
  if (!t) return team('This many keywords or pages needs a team quote.');
  return { status: 'estimate', lines: [{ label: t[0], inr: t[1] }], period: 'monthly' };
}

function calcAds(a) {
  if (a.other_platforms) return team('Platforms other than Google and Meta are checked by the team.');
  const tiers = [['Basic Campaign Management', 10000, 2, 1, 15000], ['Growth Campaign Management', 20000, 5, 2, 40000], ['Advanced Campaign Management', 40000, 10, 3, 100000]];
  const t = tiers.find((x) => a.campaigns <= x[2] && a.platforms <= x[3] && a.monthly_ad_budget >= x[4]);
  if (!t) return team('This campaign size or ad budget needs a team quote.');
  return { status: 'estimate', lines: [{ label: t[0], inr: t[1] }], period: 'monthly' };
}

function calcSocial(a) {
  if (a.reels > 0) return team('Reels and videos are quoted separately by the team.');
  const tiers = [['Social Media Basic', 10000, 1, 15], ['Social Media Growth', 20000, 1, 25], ['Social Media Advanced', 40000, 3, 35], ['Social Media Full-service', 75000, 3, 60]];
  const t = tiers.find((x) => a.platforms <= x[2] && a.posts <= x[3]);
  if (!t) return team('More than 3 platforms or 60 posts needs a team quote.');
  return { status: 'estimate', lines: [{ label: t[0], inr: t[1] }], period: 'monthly' };
}

function calcDesign(a) {
  const d = DESIGN[a.item];
  if (!d) return team('This design type is quoted by the team.');
  const qty = d[2] === 1 ? 1 : a.quantity;
  if (qty > 10) return team('Large design orders are quoted by the team.');
  return { status: 'from', lines: [{ label: qty > 1 ? `${d[0]} x${qty}` : d[0], inr: d[1] * qty }], period: 'one-time' };
}

function calcVideo(a, rate) {
  if (a.videos > 5) return team('Bulk video projects are quoted by the team.');
  if (a.raw_minutes > 45 || a.final_minutes > 10) return team('Longer videos are quoted by the team.');
  const advanced = a.subtitles || a.raw_minutes > 15 || a.final_minutes > 3;
  const usd = advanced ? 75 : 50;
  const label = advanced ? 'Advanced video editing' : 'Basic video editing';
  return { status: 'estimate', lines: [{ label: `${label} (US$${usd} x${a.videos})`, inr: Math.round(usd * rate * a.videos) }], period: 'one-time' };
}

function calcAiAutomation(a) {
  if (a.sensitive_data) return team('Sensitive data needs a team security review.');
  if (a.steps <= 5 && a.systems <= 2) return { status: 'estimate', lines: [{ label: 'Basic AI Automation', inr: 25000 }], period: 'one-time' };
  if (a.steps <= 12 && a.systems <= 4) return { status: 'estimate', lines: [{ label: 'Multi-step Automation', inr: 40000 }], period: 'one-time' };
  return team('Larger automations are quoted by the team.');
}

function calcBusiness(a) {
  const b = BIZ[a.item];
  if (!b) return team('This automation is quoted by the team.');
  if (a.item === 'feedback_workflow' && a.people > 15) {
    if (a.people <= 50) return { status: 'estimate', lines: [{ label: 'Advanced feedback and appraisal system', inr: 20000 }], period: 'one-time' };
    return team('Feedback systems above 50 employees are quoted by the team.');
  }
  if (a.item === 'client_portal') return { status: 'estimate', lines: [{ label: b.label + ' (basic)', inr: b.inr }], period: 'one-time' };
  if (b.field && a[b.field] > b.max) return team(`${b.label} above its standard scope is quoted by the team.`);
  return { status: 'estimate', lines: [{ label: b.label, inr: b.inr }], period: 'one-time' };
}

function calcResearch(a) {
  const prices = { basic: 5000, standard: 15000, advanced: 30000 };
  if (!prices[a.level]) return team('Deep and specialised research is quoted by the team.');
  return { status: 'from', lines: [{ label: `${a.level[0].toUpperCase() + a.level.slice(1)} research (starting)`, inr: prices[a.level] }], period: 'one-time' };
}

function calcManagement(a) {
  const tiers = [['Basic website maintenance', 3000, 4], ['Standard website management', 8000, 10], ['Advanced website management', 15000, 20], ['Complex website management', 20000, 30]];
  let idx = tiers.findIndex((t) => a.updates_per_month <= t[2]);
  if (idx < 0) return team('More than 30 updates per month is quoted by the team.');
  if (a.backend_complex) idx = Math.max(idx, 3);
  return { status: 'estimate', lines: [{ label: tiers[idx][0], inr: tiers[idx][1] }], period: 'monthly' };
}

function calcEmail(a) {
  if (a.automation || a.recurring || a.crm) return team('Automation, recurring newsletters and CRM connections are quoted by the team.');
  if (a.contacts > 20000 || a.campaigns > 3) return team('Lists above 20,000 contacts or more than 3 campaigns are quoted by the team.');
  if (a.contacts <= 1000 && a.campaigns <= 1) return { status: 'estimate', lines: [{ label: 'Email marketing, up to 1,000 contacts', inr: 2500 }], period: 'one-time' };
  if (a.contacts <= 5000 && a.campaigns <= 2) return { status: 'estimate', lines: [{ label: 'Email marketing, 1,001–5,000 contacts', inr: 5000 }], period: 'one-time' };
  const price = a.contacts <= 10000 ? 15000 : a.contacts <= 15000 ? 17500 : 20000;
  return { status: 'estimate', lines: [{ label: 'Email marketing, 5,001–20,000 contacts', inr: price }], period: 'one-time' };
}

function calcOther(a) {
  const o = OTHER[a.service];
  if (!o) return team('This service is quoted by the team.');
  const monthly = a.service === 'ecommerce_maintenance';
  return { status: 'from', lines: [{ label: o[0], inr: o[1] }], period: monthly ? 'monthly' : 'one-time' };
}

const team = (reason) => ({ status: 'team', reason });

export const SERVICES = {
  website: { label: 'Website development', questions: Q.website, calc: calcWebsite },
  seo: { label: 'SEO (monthly)', questions: Q.seo, calc: calcSeo },
  ads: { label: 'Advertising management (monthly)', questions: Q.ads, calc: calcAds },
  social: { label: 'Social media management (monthly)', questions: Q.social, calc: calcSocial },
  design: { label: 'Logo, brand and graphic design', questions: Q.design, calc: calcDesign },
  video: { label: 'Video editing', questions: Q.video, calc: calcVideo },
  ai_automation: { label: 'AI automation', questions: Q.ai_automation, calc: calcAiAutomation },
  business_automation: { label: 'Business automation', questions: Q.business_automation, calc: calcBusiness },
  research: { label: 'Research', questions: Q.research, calc: calcResearch },
  website_management: { label: 'Website management (monthly)', questions: Q.website_management, calc: calcManagement },
  email: { label: 'Email marketing (one-time)', questions: Q.email, calc: calcEmail },
  other: { label: 'Other services', questions: Q.other, calc: calcOther },
};

// ---------- Checking and cleaning answers ----------
function cleanValue(q, raw) {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (q.type === 'number') {
    const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[,₹$\s]/g, ''));
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  }
  if (q.type === 'boolean') {
    if (typeof raw === 'boolean') return raw;
    const s = String(raw).trim().toLowerCase();
    if (['yes', 'y', 'true', '1'].includes(s)) return true;
    if (['no', 'n', 'false', '0'].includes(s)) return false;
    return undefined;
  }
  if (q.type === 'choice') {
    const s = String(raw).trim().toLowerCase().replace(/[\s-]+/g, '_');
    return q.options.includes(s) ? s : undefined;
  }
  return undefined;
}

// Keeps only this service's answers, converted to the right types.
export function cleanAnswers(serviceId, raw = {}) {
  const svc = SERVICES[serviceId];
  if (!svc) return {};
  const out = {};
  for (const q of svc.questions) {
    const v = cleanValue(q, raw[q.key]);
    if (v !== undefined) out[q.key] = v;
  }
  return out;
}

export function missingFields(serviceId, answers = {}) {
  const svc = SERVICES[serviceId];
  if (!svc) return [];
  return svc.questions.filter((q) => answers[q.key] === undefined).map((q) => q.key);
}

// ---------- Main entry: the one place a number comes from ----------
export function estimate(serviceId, rawAnswers = {}, opts = {}) {
  const svc = SERVICES[serviceId];
  if (!svc) return { status: 'unknown_service' };
  const answers = cleanAnswers(serviceId, rawAnswers);
  const missing = missingFields(serviceId, answers);
  if (missing.length) return { status: 'need_info', service: serviceId, missing };

  const rate = Number(opts.usdInrRate) > 0 ? Number(opts.usdInrRate) : 94;
  const result = svc.calc(answers, rate);
  const base = { service: serviceId, label: svc.label, rule_version: RULE_VERSION };
  if (result.status === 'team') return { ...base, status: 'team', reason: result.reason };

  const subtotal = sum(result.lines);
  if (subtotal >= TEAM_THRESHOLD_INR) return { ...base, status: 'team', reason: 'The estimate is ₹1,00,000 or more, so the team will quote it.' };

  const total = roundTen(subtotal);
  return {
    ...base,
    status: result.status, // 'estimate' or 'from'
    period: result.period,
    lines: result.lines,
    totalInr: total,
    rounded: total !== subtotal,
    rate,
  };
}
