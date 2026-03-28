import { NextResponse } from 'next/server';

export async function POST(request) {
  // Parse the incoming JSON body from your frontend
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Check for the environment variable (checking both names just to be safe!)
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL || process.env.SHEETS_URL;

  if (!scriptUrl) {
    console.error("Missing Google Script URL in environment variables.");
    return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 });
  }

  try {
    // Forward the payload to Google Apps Script
    const response = await fetch(scriptUrl, {
      method: 'POST',
      // CRITICAL: Must be text/plain to bypass Google's strict CORS rules
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
      body: JSON.stringify(body),
    });

    // Parse Google's response
    const text = await response.text();
    let result;
    
    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse Google response. Raw response:', text);
      return NextResponse.json({ error: 'Database format error.' }, { status: 502 });
    }

    // Send success back to the frontend
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Error forwarding to Sheets:', error);
    return NextResponse.json({ error: 'Failed to connect to the database.' }, { status: 500 });
  }
}
