// api/lookup-user.js
// ─────────────────────────────────────────────────────────────────────────────
// Looks up a returning user by email via the Google Apps Script Web App.
// Returns their saved profile + whether active premium exists.
//
// The Apps Script must handle action=lookup (see GOOGLE_SHEETS_SETUP.gs update).
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const sheetsUrl = process.env.SHEETS_URL;
  if (!sheetsUrl) return res.status(500).json({ error: 'Sheets URL not configured.' });

  try {
    // ── Query Google Sheets for user profile ──────────────────────────────────
    const profileRes = await fetch(sheetsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'lookup', email: email.toLowerCase().trim() })
    });

    // Apps Script returns text/plain with JSON body
    const text = await profileRes.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      return res.status(404).json({ found: false, message: 'User not found.' });
    }

    if (!result.found) {
      return res.status(200).json({ found: false });
    }

    // ── Check premium status ───────────────────────────────────────────────────
    const ACCESS_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms
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
      }
    }

    return res.status(200).json({
      found: true,
      user: {
        name:      result.name      || '',
        fname:     result.fname     || result.name?.split(' ')[0] || '',
        lname:     result.lname     || result.name?.split(' ').slice(1).join(' ') || '',
        email:     result.email     || email,
        role:      result.role      || '',
        level:     result.level     || '',
        joinedAt:  result.joinedAt  || ''
      },
      premium: {
        active:    premiumActive,
        timestamp: premiumTimestamp,
        timeLeft:  premiumTimeLeft
      }
    });

  } catch (err) {
    console.error('Lookup error:', err);
    return res.status(500).json({ error: 'Could not reach the database. Please try again.' });
  }
}
