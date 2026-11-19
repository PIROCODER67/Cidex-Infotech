import { handleAudit } from './seo_audit.js';
// CIDEX INFOTECH - Cloudflare Worker: chat endpoint, price endpoint, static site.
// Secrets: OPENAI_API_KEY (set with `wrangler secret put OPENAI_API_KEY`). Never put the key in this file.
import { SERVICES, estimate, cleanAnswers, missingFields, RULE_VERSION, CONTACT, TEAM_THRESHOLD_INR } from './pricing.js';
import { SERVICES_INFO } from './services_info.js';
import { POLICIES } from './policies.js';
import { MARKETING_GUIDE } from './marketing.js';

const MAX_MESSAGES = 20;
const MAX_CHARS = 1000;
const DISCLAIMER = 'This is an estimated price based on the information you provided, not a final quotation. The final price will be confirmed by CIDEX INFOTECH through a written quotation after reviewing your requirements. Applicable GST and other taxes, if any, will be charged separately. Third-party costs, subscriptions and usage fees are excluded unless explicitly stated.';
const OFFLINE_REPLY = `The AI assistant is not switched on yet. You can reach the CIDEX team at ${CONTACT.phone} or ${CONTACT.email}.`;
const ERROR_REPLY = `Something went wrong on our side. Please try again, or contact the team at ${CONTACT.phone} or ${CONTACT.email}.`;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const fmtINR = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const fmtUSD = (inr, rate) => '$' + Math.round(inr / rate).toLocaleString('en-US');

// Turns a price result into what the page shows, in both currencies. The page picks one.
function display(result) {
  if (result.status === 'team') {
    return { status: 'team', label: result.label, reason: result.reason, contact: CONTACT };
  }
  if (result.status === 'estimate' || result.status === 'from') {
    const rate = result.rate;
    return {
      status: result.status,
      label: result.label,
      period: result.period,
      scope_note: result.note || '',
      lines: result.lines.map((l) => ({ label: l.label, INR: fmtINR(l.inr), USD: fmtUSD(l.inr, rate) })),
      total: { INR: fmtINR(result.totalInr), USD: fmtUSD(result.totalInr, rate) },
      rounded: result.rounded,
      rounding_note: result.rounded ? 'Rounded to the nearest ₹10.' : '',
      usd_note: `USD shown at 1 USD = ₹${rate}, rounded to the nearest dollar.`,
      disclaimer: DISCLAIMER,
      from_note: result.status === 'from' ? 'This is a starting price. The team confirms the final amount.' : '',
    };
  }
  return null;
}

// The AI's reply must never contain a number that looks like a price. The number comes from the card.
function safeReply(text) {
  let t = typeof text === 'string' ? text.trim() : '';
  if (!t) t = 'Tell me a bit more about your project.';
  if (/[₹$]\s?\d|\d[\d,]*\s?(INR|USD|rupees|dollars)/i.test(t)) {
    t = 'I have worked out your estimate and it is shown below.';
  }
  return t.slice(0, 1500);
}

function validMessages(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(-MAX_MESSAGES).filter(
    (m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.length <= MAX_CHARS
  ).map((m) => ({ role: m.role, content: m.content }));
}

function sanitiseState(s) {
  const service = s && SERVICES[s.service] ? s.service : null;
  return { service, answers: service ? cleanAnswers(service, s.answers) : {} };
}

function systemPrompt(state) {
  const services = Object.entries(SERVICES).map(([id, s]) => {
    const qs = s.questions.map((q) => {
      const opts = q.type === 'choice' ? ` (options: ${q.options.join(', ')})` : '';
      return `    - ${q.key} [${q.type}]${opts}: ${q.question}`;
    }).join('\n');
    return `- ${id}: ${s.label}\n${qs}`;
  }).join('\n');

  const missing = state.service ? missingFields(state.service, state.answers) : [];
  const current = state.service
    ? `Current service: ${state.service}. Answers so far: ${JSON.stringify(state.answers)}. Still needed: ${missing.length ? missing.join(', ') : 'nothing, the estimate is ready'}.`
    : 'No service chosen yet.';

  return `You are the CIDEX INFOTECH website assistant. CIDEX is a digital services company in Kolkata, India.

Your job:
- Find out which service the visitor is asking about and collect the answers for it. Do not recommend packages or services, and do not explain what any service includes. If the visitor asks what a service includes, say the team will explain it and give the contact details.
- Ask the questions needed for that service. Ask one or two at a time, in plain friendly English. Do not repeat questions already answered.
- Put the answers in the "answers" object using the exact keys below. Only use keys listed for the chosen service.
- Only say the estimate is shown below when every question for the service is answered. If any question is still unanswered, ask the next one instead. Do not calculate or state any price, amount or range yourself. The system works out the price.

Strict rules:
- Never state, guess or calculate a price, amount, discount or total. Never mention ₹ or $ with a number.
- Prices exclude GST. If asked about GST, say management confirms the final tax.
- Second-website discount: mention it only if the visitor asks about a second website, and only in brackets, e.g. "(second-website discounts may be available, confirmed by our management)". Never apply or calculate it.
- Do not promise delivery dates, rankings, results or acceptance. Do not discuss contracts, advance payments, refunds, cancellations or late payments; say management handles these.
- Do not ask for payment details, passwords or government ID numbers.
- If the visitor asks for a person, or the project is custom or large, give the team contact: phone ${CONTACT.phone}, email ${CONTACT.email}.
- Keep replies short.

Services and their answer keys:
${services}

${current}

Reply ONLY with a JSON object in this shape:
{"reply": "your message to the visitor", "service": "one service id from the list, or null", "answers": {"key": "value"}}
Use true/false for yes/no answers, numbers for counts, and option names exactly as written for choices.`;
}

// Clow (price estimator) does not judge whether a service is needed; it sends those doubts to Aetheria.
const NEED_DOUBT = /\b(do|does|should|would|will)\s+(i|we|my\s+\w+|our\s+\w+)\s+(really\s+)?need\b|\bneed\s+it\s+or\s+not\b|\bi\s+(will|'ll|might|may)\s+need\s+(it|this|that)\b|\b(is|are)\s+(it|this|that)\s+(necessary|needed|required|important)\b|\bshould\s+i\s+(get|buy|have|do|take)\b|\bnot\s+sure\s+(if|whether|what)\b|\bdon'?t\s+know\s+(if|whether)\b/i;
const CLOW_REDIRECT = 'You shall talk to Aetheria first. It will clarify your doubts.';

const ESTIMATE_FAIL_REPLY = `We couldn't generate your estimate right now. Your answers have been kept. Please try again, or contact our team at ${CONTACT.phone} or ${CONTACT.email}.`;
const CLAIMS_ESTIMATE = /(estimate|quotation|quote)[^.]*\b(shown below|generated|ready|prepared|below)\b/i;

// The model sometimes says the estimate is ready when answers are missing or no estimate exists.
// The server decides: ask the next missing question, or say the estimate could not be made.
export function guardReply(reply, service, missing, est) {
  const claims = CLAIMS_ESTIMATE.test(reply);
  if (missing.length) {
    if (!claims) return reply;
    const next = SERVICES[service].questions.find((q) => q.key === missing[0]);
    return `Thanks, got that. ${next.question}`;
  }
  if (!est && claims) return ESTIMATE_FAIL_REPLY;
  return reply;
}

async function handleChat(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }

  const state = sanitiseState(body.state);
  const messages = validMessages(body.messages);
  const currencyRate = Number(env.USD_INR_RATE) > 0 ? Number(env.USD_INR_RATE) : 94;

  if (!env.OPENAI_API_KEY) {
    return json({ reply: OFFLINE_REPLY, state, estimate: null, ai_ready: false }, 503);
  }
  if (!messages.length) return json({ error: 'no_messages' }, 400);

  // Doubts about whether a service is needed go to Aetheria, not to the price estimator.
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  if (lastUser && NEED_DOUBT.test(lastUser.content)) {
    return json({ reply: CLOW_REDIRECT, state, estimate: null, ai_ready: true });
  }

  let parsed = {};
  try {
    const res = await fetch(`${env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: systemPrompt(state) }, ...messages],
      }),
    });
    if (!res.ok) return json({ reply: ERROR_REPLY, state, estimate: null, ai_ready: true }, 502);
    const data = await res.json();
    parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
  } catch {
    return json({ reply: ERROR_REPLY, state, estimate: null, ai_ready: true }, 502);
  }

  // Keep the service and answers. A new service starts fresh.
  const newService = SERVICES[parsed.service] ? parsed.service : state.service;
  const base = newService === state.service ? state.answers : {};
  const next = { service: newService, answers: cleanAnswers(newService, { ...base, ...(parsed.answers || {}) }) };

  let est = null;
  if (next.service) {
    const result = estimate(next.service, next.answers, { usdInrRate: currencyRate });
    if (result.status === 'estimate' || result.status === 'from' || result.status === 'team') {
      est = display({ ...result, rate: currencyRate, label: result.label });
    }
  }

  const missing = next.service ? missingFields(next.service, next.answers) : [];
  return json({
    reply: guardReply(safeReply(parsed.reply), next.service, missing, est),
    state: next,
    estimate: est,
    missing,
    ai_ready: true,
  });
}

async function handleEstimate(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }
  const rate = Number(env.USD_INR_RATE) > 0 ? Number(env.USD_INR_RATE) : 94;
  const result = estimate(body.service, body.answers || {}, { usdInrRate: rate });
  if (result.status === 'need_info' || result.status === 'unknown_service') return json(result, 400);
  return json({ ...display({ ...result, rate }), threshold_inr: TEAM_THRESHOLD_INR, rule_version: RULE_VERSION });
}

// ---------- Service explainer ("Explore services") ----------
// Explains services from SERVICES_INFO only. Never calculates or applies discounts.
function advisorPrompt() {
  return `You are Aetheria, the CIDEX INFOTECH services guide. CIDEX is a digital services company in Kolkata, India.

Your job:
- Explain CIDEX services, using only the SERVICES GUIDE below.
- Show what each service does for the client. For every feature you explain, give its benefit right after it, so the visitor sees both. Keep features and benefits in balance; do not list features alone.
- When a visitor asks what they need or which service fits, use the CIDEX MARKETING METHOD below as a guide: a relatable problem, why it matters, the service, its benefit, then one short invitation to contact the team. Write these as natural sentences. Never print the words Problem, Consequence, Feature, Benefit or Call to action as labels.
- If the visitor has not said what their business does, ask one question about it before recommending a service.
- Explain delivery dates, refunds and cancellations, and late payments, using only the POLICY SUMMARY below.
- Help a visitor see which service may fit, and say honestly when a service may not be needed yet.

How to answer (keep the number of exchanges low):
- Answer the full question in your first reply. Include the related facts the visitor will almost certainly need next (for example, what is extra, or what happens if they cancel).
- Be direct and complete. No small talk, no long introductions, no repeated offers.
- Ask at most one question per reply, and only when the answer truly depends on it.
- Use short paragraphs and bullet lists when the answer has several parts.

Strict rules:
- Use only facts in the SERVICES GUIDE and POLICY SUMMARY. If something is not in them, say the team will confirm, and give the team contact.
- Starting prices: quote them exactly as written, labelled "starting from". Never add items together, never create a total or quote, and never say "your price will be".
- Estimates for a specific project: tell the visitor to use the "Ask for a price" button.
- Delivery dates: never give or promise a date. Say delivery dates are subject to the contract for each project, and explain what can move them, from the policy summary.
- Refunds and cancellations: explain the rules. Never calculate a refund or cancellation amount, and never say a specific amount will be returned. The team works out the exact amount in writing.
- Late payments: explain the process in the policy summary. Do not invent fees.
- Advance payments and payment schedules: do not bring them up. If asked, say the contract sets them and the visitor should read the Terms and Privacy Policy before accepting a quotation.
- Discounts: never offer or calculate them. Second-website discounts: mention only if the visitor asks about a second website, in brackets, and say management confirms it.
- Never call a CIDEX service useless, bad or unnecessary in general. Never name or compare other companies.
- Do not promise rankings, results, sales, or that a project will be accepted.
- Do not ask for payment details, passwords, or ID numbers.
- For custom or large projects, or anything outside these guides, give the team contact: phone ${CONTACT.phone}, email ${CONTACT.email}.
- Plain text only. Do not use markdown: no asterisks, no bold, no headings, no tables. Use simple dashes for lists.
- Never describe the team's skills, experience, expertise or quality, and never say the team is good, reliable or expert. Say the team will confirm the right people for the project.
- Personal, romantic, flirtatious or off-topic messages: reply in one short, friendly sentence saying you help with CIDEX services, then offer to help with a service. Do not explain at length what you are.
- Keep replies short and to the point.
- Social media packages: each package has one fixed monthly price that covers its limits. Say this plainly when a visitor asks about posts. Example: Advanced is a fixed price for up to 35 feed posts on up to 3 platforms, so the price is the same for 10 or 35 posts within that limit.
- Feed posts mean static graphics, carousels and agreed feed content. Reels, videos, stories and filming are separate, and the team quotes them.
- Basic and Growth cover 1 platform. Two platforms need Advanced or higher.

${MARKETING_GUIDE}

SERVICES GUIDE:
${SERVICES_INFO}

${POLICIES}

Reply ONLY with a JSON object in this shape: {"reply": "your message to the visitor"}`;
}

async function handleAdvisor(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }
  const messages = validMessages(body.messages);

  if (!env.OPENAI_API_KEY) return json({ reply: OFFLINE_REPLY, ai_ready: false }, 503);
  if (!messages.length) return json({ error: 'no_messages' }, 400);

  try {
    const res = await fetch(`${env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: advisorPrompt() }, ...messages],
      }),
    });
    if (!res.ok) return json({ reply: ERROR_REPLY, ai_ready: true }, 502);
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    const reply = typeof parsed.reply === 'string' && parsed.reply.trim()
      ? parsed.reply.trim().slice(0, 3000)
      : 'Could you tell me a bit more about what you are looking for?';
    return json({ reply, ai_ready: true });
  } catch {
    return json({ reply: ERROR_REPLY, ai_ready: true }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') {
      return json({ ok: true, ai_ready: Boolean(env.OPENAI_API_KEY), rule_version: RULE_VERSION });
    }
    if (url.pathname === '/api/chat' && request.method === 'POST') return handleChat(request, env);
    if (url.pathname === '/api/advisor' && request.method === 'POST') return handleAdvisor(request, env);
    if (url.pathname === '/api/estimate' && request.method === 'POST') return handleEstimate(request, env);
    if (url.pathname === '/api/audit' && request.method === 'POST') return handleAudit(request, env);
    if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};
