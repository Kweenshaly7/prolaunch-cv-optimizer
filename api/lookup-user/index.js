import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON body' }); }
    }

    const { email } = body || {};
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) return res.status(200).json({ found: false });

    // ── Premium status ────────────────────────────────────────────────────
    const PLAN_DURATIONS = {
      '24h':   24 * 60 * 60 * 1000,
      '7day':  7  * 24 * 60 * 60 * 1000,
      '30day': 30 * 24 * 60 * 60 * 1000,
    };

    let premiumActive    = false;
    let premiumPlan      = null;
    let premiumTimestamp = null;
    let premiumTimeLeft  = null;

    if (user.premiumPaidAt) {
      const paidAt   = new Date(user.premiumPaidAt).getTime();
      const plan     = user.premiumPlan || '24h';
      const duration = PLAN_DURATIONS[plan] || PLAN_DURATIONS['24h'];
      const elapsed  = Date.now() - paidAt;

      if (elapsed < duration) {
        const remaining = duration - elapsed;
        const d  = Math.floor(remaining / 86400000);
        const h  = Math.floor((remaining % 86400000) / 3600000);
        const m  = Math.floor((remaining % 3600000)  / 60000);

        premiumActive    = true;
        premiumPlan      = plan;
        premiumTimestamp = paidAt;
        premiumTimeLeft  = d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
      }
    }

    return res.status(200).json({
      found: true,
      user: {
        name:     user.name,
        fname:    user.fname,
        lname:    user.lname,
        email:    user.email,
        role:     user.role,
        level:    user.level,
        joinedAt: user.createdAt.toISOString(),
      },
      premium: {
        active:    premiumActive,
        plan:      premiumPlan,
        timestamp: premiumTimestamp,
        timeLeft:  premiumTimeLeft,
      },
    });

  } catch (err) {
    console.error('Lookup error:', err);
    return res.status(500).json({ error: 'Could not reach the database. Please try again.' });
  }
}
