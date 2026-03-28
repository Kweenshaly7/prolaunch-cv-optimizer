// api/save-sheet/route.js
import { NextResponse } from 'next/server';

// FIX: Added CORS headers — previously missing entirely
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// FIX: Added OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
  }

  const scriptUrl = process.env.GOOGLE_SCRIPT_URL || process.env.SHEETS_URL;
  if (!scriptUrl) {
    console.error('Missing Google Script URL in environment variables.');
    return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500, headers: corsHeaders });
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
      return NextResponse.json({ error: 'Database format error.' }, { status: 502, headers: corsHeaders });
    }

    return NextResponse.json(result, { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Error forwarding to Sheets:', error);
    return NextResponse.json({ error: 'Failed to connect to the database.' }, { status: 500, headers: corsHeaders });
  }
}
