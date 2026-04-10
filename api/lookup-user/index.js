<<<<<<< HEAD
// api/lookup-user/route.js
// Vercel serverless function — looks up a returning user by email from Google Sheets
=======
// api/lookup-user/index.js
// Looks up a returning user by email from Google Sheets and returns
// their profile + verified premium status (plan + timestamp from server).
//
// The client uses this response to call PL.grantPremium(plan, ts) —
// meaning premium is ONLY granted when the server confirms it,
// not from any client-side query param that could be spoofed.
>>>>>>> staging

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let body = req.body;
    if (typeof body === 'string') {
<<<<<<< HEAD
      try { body = JSON.parse(body); } catch {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
    }

    const { email } = body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const sheetsUrl = process.env.GOOGLE_SCRIPT_URL || process.env.SHEETS_URL;
    if (!sheetsUrl) {
      console.error('Missing Sheets URL in environment variables.');
      return res.status(500).json({ error: 'Sheets URL not configured.' });
    }

    const profileRes = await fetch(sheetsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'lookup', email: email.toLowerCase().trim() })
=======
      try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON body' }); }
    }

    const { email } = body || {};
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const sheetsUrl = process.env.GOOGLE_SCRIPT_URL || process.env.SHEETS_URL;
    if (!sheetsUrl) return res.status(500).json({ error: 'Sheets URL not configured.' });

    const profileRes = await fetch(sheetsUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body:    JSON.stringify({ action: 'lookup', email: email.toLowerCase().trim() }),
>>>>>>> staging
    });

    const text = await profileRes.text();
    let result;
<<<<<<< HEAD

    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse Google response. Raw response:', text);
      return res.status(404).json({ found: false, message: 'User not found or database error.' });
    }

    if (!result.found) {
      return res.status(200).json({ found: false });
    }

    // ── Check premium status ──────────────────────────────────────────────────
    const ACCESS_DURATION = 24 * 60 * 60 * 1000;
    let premiumActive = false;
    let premiumTimestamp = null;
    let premiumTimeLeft = null;

    if (result.premiumPaidAt) {
      const paidAt = parseInt(result.premiumPaidAt);
      const elapsed = Date.now() - paidAt;
      if (elapsed < ACCESS_DURATION) {
        premiumActive = true;
        premiumTimestamp = paidAt;
        const remaining = ACCESS_DURATION - elapsed;
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        premiumTimeLeft = `${h}h ${m}m`;
=======
    try { result = JSON.parse(text); }
    catch { return res.status(404).json({ found: false, message: 'Database error.' }); }

    if (!result.found) return res.status(200).json({ found: false });

    // ── Premium status ────────────────────────────────────────────────────
    // Plan durations in ms — must match shared.js PLANS
    const PLAN_DURATIONS = {
      '24h':   24 * 60 * 60 * 1000,
      '7day':  7  * 24 * 60 * 60 * 1000,
      '30day': 30 * 24 * 60 * 60 * 1000,
    };

    let premiumActive    = false;
    let premiumPlan      = null;
    let premiumTimestamp = null;
    let premiumTimeLeft  = null;

    // Sheets stores: premiumPaidAt (Unix ms timestamp) + premiumPlan (plan key)
    if (result.premiumPaidAt) {
      const paidAt   = parseInt(result.premiumPaidAt);
      const plan     = result.premiumPlan || '24h';   // default to 24h for legacy records
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
>>>>>>> staging
      }
    }

    return res.status(200).json({
      found: true,
      user: {
        name:     result.name     || '',
        fname:    result.fname    || result.name?.split(' ')[0] || '',
        lname:    result.lname    || result.name?.split(' ').slice(1).join(' ') || '',
        email:    result.email    || email,
        role:     result.role     || '',
        level:    result.level    || '',
<<<<<<< HEAD
        joinedAt: result.joinedAt || ''
      },
      premium: {
        active:    premiumActive,
        timestamp: premiumTimestamp,
        timeLeft:  premiumTimeLeft
      }
=======
        joinedAt: result.joinedAt || '',
      },
      premium: {
        active:    premiumActive,
        plan:      premiumPlan,
        timestamp: premiumTimestamp,
        timeLeft:  premiumTimeLeft,
      },
>>>>>>> staging
    });

  } catch (err) {
    console.error('Lookup error:', err);
    return res.status(500).json({ error: 'Could not reach the database. Please try again.' });
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> staging
