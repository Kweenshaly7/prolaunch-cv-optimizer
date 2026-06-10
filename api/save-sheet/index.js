import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;

  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { email, name, fname, lname, role, level } = body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase().trim() },
      update: {
        name: name || '',
        fname: fname || '',
        lname: lname || '',
        role: role || '',
        level: level || '',
      },
      create: {
        email: email.toLowerCase().trim(),
        name: name || '',
        fname: fname || '',
        lname: lname || '',
        role: role || '',
        level: level || '',
      }
    });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error saving user:', error);
    return res.status(500).json({ error: 'Failed to save to the database.' });
  }
}
