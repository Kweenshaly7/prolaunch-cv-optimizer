// api/selar-webhook.js
// ─────────────────────────────────────────────────────────────────────────────
// Receives Selar sale events forwarded by Zapier (or Pabbly Connect) and
// grants the correct premium plan to the buyer in Google Sheets.
//
// WHY ZAPIER?
// Selar does not expose a raw webhook URL field. Its event triggers are routed
// through automation platforms. The supported flow is:
//   Selar (New Sale trigger) → Zapier → Webhooks by Zapier (POST action) → here
//
// ─── FULL SETUP GUIDE ────────────────────────────────────────────────────────
//
// STEP 1 — Add env variable in Vercel
//   ZAPIER_SECRET = any long random string you choose, e.g. "plc_zap_k9x2mT..."
//   Dashboard → your project → Settings → Environment Variables → Add
//
// STEP 2 — Create the Zap in Zapier
//   Trigger  : App = Selar  |  Event = "New Sale" (or "New Order")
//   Action   : App = "Webhooks by Zapier"  |  Event = "POST"
//     URL    : https://prolaunch-cv-optimizer.vercel.app/api/selar-webhook
//     Payload Type: JSON
//     Data   : (map these fields from the Selar trigger step)
//       secret        → (type your ZAPIER_SECRET value here as a static string)
//       email         → {{buyer_email}}   or the Selar field for buyer's email
//       amount        → {{amount}}        or {{price}} — the number paid in NGN
//       order_id      → {{order_id}}      or {{reference}}
//       product_name  → {{product_name}}
//       paid_at       → {{created_at}}    or {{payment_date}}
//
// STEP 3 — In Selar product settings → "Redirect URL after purchase", set:
//   https://prolaunch-cv-optimizer.vercel.app/pages/unlock.html
//   Selar appends ?email=xxx automatically. The unlock page polls lookup-user
//   every 5 s until the Zapier-triggered write confirms the plan.
//
// STEP 4 — Test end-to-end
//   Use Zapier's "Test trigger" with a real Selar test order, confirm the
//   Vercel function log shows "granted [plan] to [email]", and check Sheets.
//
// ─── AMOUNT → PLAN MAPPING ───────────────────────────────────────────────────
// Keep these amounts in sync with your Selar product variant prices.
// ─────────────────────────────────────────────────────────────────────────────

const AMOUNT_TO_PLAN = {
  1000: '24h',
  4999: '7day',
  9999: '30day',
};

export default async function handler(req, res) {
  // ── Only POST ──────────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  // ── 1. Shared-secret auth ─────────────────────────────────────────────────
  // Zapier sends your secret as a JSON body field (set in the Zap's Data map).
  // This prevents random internet traffic from writing to your Sheets.
  const body   = req.body || {};
  const secret = process.env.ZAPIER_SECRET;

  if (secret && body.secret !== secret) {
    console.error('selar-webhook: invalid secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── 2. Extract fields from Zapier payload ─────────────────────────────────
  // Zapier flattens nested objects, so all fields arrive at the top level.
  const email       = (body.email        || '').toLowerCase().trim();
  const amountRaw   =  body.amount       || body.price || 0;
  const orderId     =  body.order_id     || body.reference || '';
  const productName =  body.product_name || '';
  const paidAtRaw   =  body.paid_at      || body.payment_date || '';

  const amount = Number(String(amountRaw).replace(/[^0-9.]/g, ''));
  const paidAt = paidAtRaw ? new Date(paidAtRaw).getTime() : Date.now();

  console.log('selar-webhook: received', { email, amount, orderId, productName });

  // ── 3. Validate ───────────────────────────────────────────────────────────
  if (!email) {
    console.error('selar-webhook: missing email');
    return res.status(400).json({ error: 'Missing buyer email' });
  }

  // ── 4. Map amount → plan ──────────────────────────────────────────────────
  // Try exact match first; fall back to nearest lower bound so minor rounding
  // (e.g. Selar rounding ₦4999 to ₦5000 in some reports) still maps correctly.
  let plan = AMOUNT_TO_PLAN[amount];

  if (!plan) {
    const knownAmounts = Object.keys(AMOUNT_TO_PLAN).map(Number).sort((a, b) => b - a);
    const matched = knownAmounts.find(a => Math.abs(amount - a) <= 5); // ±₦5 tolerance
    if (matched) plan = AMOUNT_TO_PLAN[matched];
  }

  if (!plan) {
    // Unknown amount — log for manual review, return 200 so Zapier doesn't retry
    console.error(`selar-webhook: unknown amount ₦${amount} for ${email} — no plan granted`);
    return res.status(200).json({
      received: true,
      action:   'ignored',
      reason:   `Amount ₦${amount} does not match any known plan. Update AMOUNT_TO_PLAN if pricing changed.`,
    });
  }

  // ── 5. Write to Google Sheets ─────────────────────────────────────────────
  const sheetsUrl = process.env.GOOGLE_SCRIPT_URL || process.env.SHEETS_URL;
  if (!sheetsUrl) {
    console.error('selar-webhook: GOOGLE_SCRIPT_URL not set');
    return res.status(500).json({ error: 'Database URL not configured' });
  }

  try {
    const sheetsRes = await fetch(sheetsUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body:    JSON.stringify({
        action:      'savePremium',
        email,
        plan,
        paidAt:      String(paidAt),
        orderId,
        amount:      String(amount),
        productName,
        source:      'zapier',
      }),
    });

    const text = await sheetsRes.text();
    let result;
    try { result = JSON.parse(text); } catch (_) { result = { raw: text }; }

    console.log(`selar-webhook: ✅ granted [${plan}] to [${email}]`, result);
    return res.status(200).json({ received: true, email, plan, paidAt, orderId });

  } catch (err) {
    // Return 200 so Zapier doesn't retry and create duplicate grants.
    // The order is valid — investigate the Sheets write error manually.
    console.error('selar-webhook: Sheets write failed', err.message);
    return res.status(200).json({
      received: true,
      warning:  'Sheets write failed — grant not recorded. Check Vercel logs.',
      error:    err.message,
    });
  }
}