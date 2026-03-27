export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Pull the secret URL from your Vercel environment variables
  // Notice we are NOT using NEXT_PUBLIC_ here, so this stays hidden from the browser
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;

  if (!scriptUrl) {
    console.error("Missing GOOGLE_SCRIPT_URL in environment variables.");
    return res.status(500).json({ error: 'Server misconfiguration.' });
  }

  try {
    // Forward the payload from the frontend directly to Google
    const response = await fetch(scriptUrl, {
      method: 'POST',
      // Apps Script safely accepts plain text to process the JSON
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
      body: JSON.stringify(req.body),
    });

    // Parse Google's response
    const result = await response.json();

    // Send Google's success message back to your frontend
    return res.status(200).json(result);

  } catch (error) {
    console.error('Error forwarding to Sheets:', error);
    return res.status(500).json({ error: 'Failed to connect to the database.' });
  }
}
