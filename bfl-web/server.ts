import express from 'express';
import path from 'path';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';

if (!STRIPE_KEY) {
  console.warn('[StripeServer] WARNING: STRIPE_SECRET_KEY is not set. Stripe endpoints will not function until configured.');
}

const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, {
      apiVersion: '2025-02-24.acacia' as any,
    })
  : (null as any);

app.use(express.json());

// CORS for local development / Expo mobile access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ─── Health / Status ────────────────────────────────────────────────────────
app.get('/api/stripe/status', async (_req, res) => {
  if (!stripe) {
    return res.status(503).json({ status: 'unconfigured', message: 'Stripe secret key not configured on server' });
  }
  try {
    const balance = await stripe.balance.retrieve();
    res.json({
      status: 'online',
      livemode: balance.livemode,
      currency: balance.available[0]?.currency || 'aud',
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ─── Create Checkout Session ────────────────────────────────────────────────
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured on the server. Please set STRIPE_SECRET_KEY in server environment variables.' });
  }

  try {
    const {
      clientId,
      clientName,
      clientEmail,
      planId,
      planName,
      amountInCents,
      invoiceNumber,
      startDate,
      endDate,
      formattedStart,
      formattedEnd,
      successUrl,
      cancelUrl,
    } = req.body;

    if (!amountInCents || !planName) {
      return res.status(400).json({ error: 'Missing required plan or amount information' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: clientEmail || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: `BFL Fitness - ${planName}`,
              description: `1-Month Coaching Program (${formattedStart || ''} to ${formattedEnd || ''})`.trim(),
            },
            unit_amount: Math.round(amountInCents),
          },
          quantity: 1,
        },
      ],
      metadata: {
        clientId: clientId || '',
        clientName: clientName || '',
        clientEmail: clientEmail || '',
        planId: planId || '',
        planName: planName || '',
        invoiceNumber: invoiceNumber || '',
        startDate: startDate || '',
        endDate: endDate || '',
      },
    });

    res.json({
      sessionId: session.id,
      url: session.url,
      invoiceNumber,
    });
  } catch (err: any) {
    console.error('[StripeServer] Create checkout session error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to initialize checkout session' });
  }
});

// ─── Verify Checkout Session ────────────────────────────────────────────────
app.get('/api/stripe/checkout-session/:sessionId', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured on the server.' });
  }

  try {
    const { sessionId } = req.params;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json(session);
  } catch (err: any) {
    console.error('[StripeServer] Verify checkout session error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to verify checkout session' });
  }
});

// ─── Process Payment ────────────────────────────────────────────────────────
app.post('/api/stripe/charge', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured on the server. Please set STRIPE_SECRET_KEY in server environment variables.' });
  }
  try {
    const { amount, currency = 'aud', description, token, card, metadata } = req.body;
    
    if (!amount || (!token && !card)) {
      return res.status(400).json({ error: 'Missing amount or payment source (token or card)' });
    }

    let source = token;
    if (!source && card) {
      const cleanCardNumber = (card.cardNumber || '').replace(/\s+/g, '');
      const cleanCvc = (card.cvc || '').toString().trim();
      const cleanExpMonth = (card.expiryMonth || '').toString().trim();
      const rawExpYear = (card.expiryYear || '').toString().trim();
      const cleanExpYear = rawExpYear.length === 2 ? `20${rawExpYear}` : rawExpYear;

      const tokenObj = await stripe.tokens.create({
        card: {
          number: cleanCardNumber,
          exp_month: cleanExpMonth,
          exp_year: cleanExpYear,
          cvc: cleanCvc,
          name: card.cardholderName || undefined,
        },
      });
      source = tokenObj.id;
    }

    const charge = await stripe.charges.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      source,
      description: description || 'BFL Fitness Coaching Subscription',
      metadata: metadata || {},
    });

    res.json({
      success: true,
      chargeId: charge.id,
      receiptUrl: charge.receipt_url,
      cardLast4: charge.payment_method_details?.card?.last4 || '4242',
      cardBrand: charge.payment_method_details?.card?.brand || 'Visa',
      amount: charge.amount / 100,
      currency: charge.currency.toUpperCase(),
    });
  } catch (err: any) {
    console.error('[StripeServer] Charge error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ─── Static files for production ────────────────────────────────────────────
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[BFL Fitness Server] Running on http://localhost:${PORT}`);
});
