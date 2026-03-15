/**
 * Stripe Payment Integration Example
 * Complete setup for payment processing and subscription management
 */

import Stripe from 'stripe';
import { NextApiRequest, NextApiResponse } from 'next';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export interface PaymentIntentData {
  amount: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, string>;
  paymentMethodTypes?: string[];
}

export interface SubscriptionData {
  customerId: string;
  priceId: string;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}

/**
 * Create a payment intent for one-time payments
 */
export async function createPaymentIntent(data: PaymentIntentData) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(data.amount * 100), // Convert to cents
      currency: data.currency,
      customer: data.customerId,
      metadata: data.metadata || {},
      payment_method_types: data.paymentMethodTypes || ['card'],
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a subscription for recurring payments
 */
export async function createSubscription(data: SubscriptionData) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: data.customerId,
      items: [{ price: data.priceId }],
      trial_period_days: data.trialPeriodDays,
      metadata: data.metadata || {},
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

    return {
      success: true,
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error) {
    console.error('Error creating subscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create or retrieve a Stripe customer
 */
export async function createOrRetrieveCustomer(
  email: string,
  userId: string,
  name?: string
) {
  try {
    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return {
        success: true,
        customer: existingCustomers.data[0],
      };
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });

    return {
      success: true,
      customer,
    };
  } catch (error) {
    console.error('Error creating/retrieving customer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle Stripe webhooks
 */
export async function handleWebhook(req: NextApiRequest, res: NextApiResponse) {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send('Webhook signature verification failed');
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

/**
 * Get subscription status for a customer
 */
export async function getSubscriptionStatus(customerId: string) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return {
        success: true,
        status: 'none',
        subscription: null,
      };
    }

    const subscription = subscriptions.data[0];
    return {
      success: true,
      status: subscription.status,
      subscription,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string, immediately = false) {
  try {
    const subscription = immediately
      ? await stripe.subscriptions.cancel(subscriptionId)
      : await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });

    return {
      success: true,
      subscription,
    };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Webhook event handlers

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);
  
  // Update order status in database
  // Send confirmation email
  // Trigger fulfillment process
  
  // Example: Update order in database
  // await updateOrderStatus(paymentIntent.metadata.orderId, 'paid');
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id);
  
  // Update order status in database
  // Send failure notification
  // Log for investigation
  
  // Example: Update order in database
  // await updateOrderStatus(paymentIntent.metadata.orderId, 'failed');
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  // Update subscription status
  // Send receipt email
  // Grant access to premium features
  
  const customerId = invoice.customer as string;
  // await updateCustomerSubscriptionStatus(customerId, 'active');
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id);
  
  // Update subscription status
  // Send payment failure notification
  // Implement retry logic
  
  const customerId = invoice.customer as string;
  // await updateCustomerSubscriptionStatus(customerId, 'past_due');
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);
  
  // Create subscription record in database
  // Send welcome email
  // Grant access to features
  
  const customerId = subscription.customer as string;
  // await createSubscriptionRecord(customerId, subscription);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  
  // Update subscription record in database
  // Handle plan changes
  // Update feature access
  
  const customerId = subscription.customer as string;
  // await updateSubscriptionRecord(customerId, subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  // Update subscription record in database
  // Revoke access to premium features
  // Send cancellation confirmation
  
  const customerId = subscription.customer as string;
  // await deleteSubscriptionRecord(customerId, subscription.id);
}

/**
 * Create a setup intent for saving payment methods
 */
export async function createSetupIntent(customerId: string) {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    });

    return {
      success: true,
      clientSecret: setupIntent.client_secret,
    };
  } catch (error) {
    console.error('Error creating setup intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get customer's payment methods
 */
export async function getPaymentMethods(customerId: string) {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return {
      success: true,
      paymentMethods: paymentMethods.data,
    };
  } catch (error) {
    console.error('Error getting payment methods:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export { stripe };