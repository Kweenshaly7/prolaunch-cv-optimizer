// api/lookup-user/route.js
import { NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400, headers: corsHeaders });
    }

    const sheetsUrl = process.env.GOOGLE_SCRIPT_URL || process.env.SHEETS_URL;
    if (!sheetsUrl) {
      console.error('Missing Sheets URL in environment variables.');
      return NextResponse.json({ error: 'Sheets URL not configured.' }, { status: 500, headers: corsHeaders });
    }

    const profileRes = await fetch(sheetsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'lookup', email: email.toLowerCase().trim() })
    });

    const text = await profileRes.text();
    let result;

    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse Google response. Raw response:', text);
      return NextResponse.json(
        { found: false, message: 'User not found or database error.' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (!result.found) {
      return NextResponse.json({ found: false }, { status: 200, headers: corsHeaders });
    }

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
      }
    }

    return NextResponse.json({
      found: true,
      user: {
        name:     result.name     || '',
        fname:    result.fname    || result.name?.split(' ')[0] || '',
        lname:    result.lname    || result.name?.split(' ').slice(1).join(' ') || '',
        email:    result.email    || email,
        role:     result.role     || '',
        level:    result.level    || '',
        joinedAt: result.joinedAt || ''
      },
      premium: {
        active:    premiumActive,
        timestamp: premiumTimestamp,
        timeLeft:  premiumTimeLeft
      }
    }, { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error('Lookup error:', err);
    return NextResponse.json(
      { error: 'Could not reach the database. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
