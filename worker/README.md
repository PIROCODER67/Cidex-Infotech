# CIDEX chat and price backend

Files:
- `src/pricing.js` - all price rules (v1, 2026-11-08). Only place a number comes from.
- `src/index.js` - `/api/chat` (AI asks questions), `/api/estimate` (price only), `/api/health`.
- `wrangler.toml` - Cloudflare settings. Static site is served from `../public`.

## Turn the AI on (after you get the OpenAI key)
1. Put the key in as a secret (do not paste it into any file):
   `npx wrangler secret put OPENAI_API_KEY`
2. Check `/api/health` shows `"ai_ready": true`.
3. Deploy: `npx wrangler deploy`

Until the key is set, the chat shows a "not switched on yet" message with the team contact. Prices still calculate through `/api/estimate`.

## Before deploying
- Copy the site file to `public/index.html` (the working site file is `claude_changes.txt`).
- Run the 30-question benchmark, then set `OPENAI_MODEL` in `wrangler.toml`.

## Open decisions (from the founder's answers)
- Advertising "$ amount" wording: fixed fee only is coded.
- Email per-send delivery charge (US$0.003–0.01): not added to the customer price. Kept for the team only.
- Ranges in the catalogue (e.g. graphics ₹1,000–₹2,000) use the lower number, marked "from".
- Interactive website: pages above 5 cost ₹5,000 each (standard add-on rate). Not in the source; confirm.
- Reels/videos for social media go to the team.
- Chat history for signed-in users is not built yet (no login yet).
