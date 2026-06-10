import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const AMOUNT_TO_PLAN = {
  1000: '24h',
  4999: '7day',
  9999: '30day',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const body   = req.body || {};
  const secret = process.env.ZAPIER_SECRET;

  if (secret && body.secret !== secret) {
    console.error('selar-webhook: invalid secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const email       = (body.email        || '').toLowerCase().trim();
  const amountRaw   =  body.amount       || body.price || 0;
  const orderId     =  body.order_id     || body.reference || '';
  const productName =  body.product_name || '';
  const paidAtRaw   =  body.paid_at      || body.payment_date || '';

  const amount = Number(String(amountRaw).replace(/[^0-9.]/g, ''));
  const paidAt = paidAtRaw ? new Date(paidAtRaw) : new Date();

  console.log('selar-webhook: received', { email, amount, orderId, productName });

  if (!email) {
    console.error('selar-webhook: missing email');
    return res.status(400).json({ error: 'Missing buyer email' });
  }

  let plan = AMOUNT_TO_PLAN[amount];

  if (!plan) {
    const knownAmounts = Object.keys(AMOUNT_TO_PLAN).map(Number).sort((a, b) => b - a);
    const matched = knownAmounts.find(a => Math.abs(amount - a) <= 5);
    if (matched) plan = AMOUNT_TO_PLAN[matched];
  }

  if (!plan) {
    console.error(`selar-webhook: unknown amount ₦${amount} for ${email} — no plan granted`);
    return res.status(200).json({
      received: true,
      action:   'ignored',
      reason:   `Amount ₦${amount} does not match any known plan. Update AMOUNT_TO_PLAN if pricing changed.`,
    });
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: {
        premiumPlan: plan,
        premiumPaidAt: paidAt,
        premiumOrderId: orderId
      }
    });

    console.log(`selar-webhook: ✅ granted [${plan}] to [${email}]`, user.id);
    return res.status(200).json({ received: true, email, plan, paidAt: paidAt.toISOString(), orderId });

  } catch (err) {
    console.error('selar-webhook: DB write failed', err.message);
    // If user not found, Prisma update throws an error.
    // We should upsert or just ignore. The old logic sent to Google Sheets without checking if user existed.
    // If they bought via Selar but haven't submitted the biodata form yet? 
    // They usually submit the form before seeing the Selar link, but just in case, we could upsert.
    // Let's change to upsert just in case.
    try {
      await prisma.user.upsert({
        where: { email },
        update: {
          premiumPlan: plan,
          premiumPaidAt: paidAt,
          premiumOrderId: orderId
        },
        create: {
          email,
          name: 'Unknown',
          fname: 'Unknown',
          lname: 'Unknown',
          role: 'Unknown',
          level: 'Unknown',
          premiumPlan: plan,
          premiumPaidAt: paidAt,
          premiumOrderId: orderId
        }
      });
      return res.status(200).json({ received: true, email, plan, paidAt: paidAt.toISOString(), orderId });
    } catch (upsertErr) {
      console.error('selar-webhook: DB upsert failed', upsertErr.message);
      return res.status(200).json({
        received: true,
        warning:  'DB write failed — grant not recorded. Check Vercel logs.',
        error:    upsertErr.message,
      });
    }
  }
}