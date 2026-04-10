// api/save-sheet/route.js
// Vercel serverless function — receives user data and forwards to Google Apps Script

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;

  // Vercel may not auto-parse JSON for all routes — handle both cases
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const scriptUrl = process.env.GOOGLE_SCRIPT_URL || process.env.SHEETS_URL;
  if (!scriptUrl) {
    console.error('Missing Google Script URL in environment variables.');
    return res.status(500).json({ error: 'Server misconfiguration.' });
  }

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let result;

    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse Google Apps Script response. Raw:', text);
      return res.status(502).json({ error: 'Database format error.' });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error forwarding to Sheets:', error);
    return res.status(500).json({ error: 'Failed to connect to the database.' });
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> staging
