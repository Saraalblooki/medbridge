import { Router } from 'express';
import Stripe from 'stripe';
import { PrismaClient, Role } from '@prisma/client';
import { authenticate, authorizeRoles, AuthRequest } from '../middleware/auth';

const stripeSecret = process.env.STRIPE_SECRET_KEY as string;
if (!stripeSecret) {
  console.warn('STRIPE_SECRET_KEY is not set');
}
const stripe = new Stripe(stripeSecret, {
  apiVersion: '2023-10-16',
});

const prisma = new PrismaClient();
const router = Router();

// Create Checkout Session for subscription
router.post('/create-checkout-session', authenticate, authorizeRoles(Role.DOCTOR), async (req: AuthRequest, res) => {
  try {
    const priceId = process.env.STRIPE_PRICE_ID as string;
    if (!priceId) return res.status(500).json({ message: 'Price ID not configured' });

    // fetch doctor & user
    const userId = req.user!.userId;
    const doctor = await prisma.doctorProfile.findUnique({ where: { userId } });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!doctor || !user) return res.status(404).json({ message: 'Doctor not found' });

    // Create or reuse Stripe customer
    let customerId = doctor.stripeCustomerId || undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id.toString(), role: 'doctor' },
      });
      customerId = customer.id;
      await prisma.doctorProfile.update({ where: { id: doctor.id }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/cancel`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe error', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;