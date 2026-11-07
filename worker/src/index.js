// CIDEX INFOTECH - Cloudflare Worker: chat endpoint, price endpoint, static site.
// Secrets: OPENAI_API_KEY (set with `wrangler secret put OPENAI_API_KEY`). Never put the key in this file.
import { SERVICES, estimate, cleanAnswers, missingFields, RULE_VERSION, CONTACT, TEAM_THRESHOLD_INR } from './pricing.js';

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
- Understand what the visitor needs and pick the right service.
- Ask the questions needed for that service. Ask one or two at a time, in plain friendly English. Do not repeat questions already answered.
- Put the answers in the "answers" object using the exact keys below. Only use keys listed for the chosen service.
- When all answers are known, say the estimate is shown below. Do not calculate or state any price, amount or range yourself. The system works out the price.

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

  let parsed = {};
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
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

  return json({
    reply: safeReply(parsed.reply),
    state: next,
    estimate: est,
    missing: next.service ? missingFields(next.service, next.answers) : [],
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') {
      return json({ ok: true, ai_ready: Boolean(env.OPENAI_API_KEY), rule_version: RULE_VERSION });
    }
    if (url.pathname === '/api/chat' && request.method === 'POST') return handleChat(request, env);
    if (url.pathname === '/api/estimate' && request.method === 'POST') return handleEstimate(request, env);
    if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};
