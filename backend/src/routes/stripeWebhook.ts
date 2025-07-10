import { Request, Response } from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});
const prisma = new PrismaClient();

export const stripeWebhookHandler = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, whSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.customer && session.subscription) {
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        // update doctor profile to ACTIVE
        await prisma.doctorProfile.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            subscriptionStatus: 'ACTIVE',
            stripeSubscriptionId: subscriptionId,
          },
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.doctorProfile.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          subscriptionStatus: 'CANCELLED',
        },
      });
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
};