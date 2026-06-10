import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const totalUsers = await prisma.user.count();
    
    const premiumUsers = await prisma.user.count({
      where: {
        premiumPlan: { not: null }
      }
    });

    // Approximate revenue calculation
    // 24h = 1000 NGN, 7day = 4999 NGN, 30day = 9999 NGN
    // We will aggregate based on plans
    const usersWithPlans = await prisma.user.groupBy({
      by: ['premiumPlan'],
      _count: { premiumPlan: true }
    });

    let estimatedRevenue = 0;
    usersWithPlans.forEach(group => {
      if (group.premiumPlan === '24h') estimatedRevenue += group._count.premiumPlan * 1000;
      else if (group.premiumPlan === '7day') estimatedRevenue += group._count.premiumPlan * 4999;
      else if (group.premiumPlan === '30day') estimatedRevenue += group._count.premiumPlan * 9999;
    });

    res.json({
      totalUsers,
      premiumUsers,
      estimatedRevenue
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
