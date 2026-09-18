const express = require('express')
const router = express.Router()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const prisma = require('../lib/prisma')
const auth = require('../middleware/auth')

// POST /api/payments/create-intent
router.post('/create-intent', auth, async (req, res) => {
  const { bookingId } = req.body

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { item: true }
    })

    if (!booking) return res.status(404).json({ error: 'Booking not found' })
    if (booking.renterId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' })

    const amount = Math.round(booking.totalPrice * 100) // Stripe uses paise/cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'inr',
      metadata: { bookingId }
    })

    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('Payment intent error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/payments/confirm
router.post('/confirm', auth, async (req, res) => {
  const { paymentIntentId, bookingId } = req.body

  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (intent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' })
    }

    // Update booking status and create payment record
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'confirmed' }
    })

    await prisma.payment.create({
      data: {
        amount: intent.amount / 100,
        status: 'paid',
        gateway: 'stripe',
        bookingId
      }
    })

    res.json({ success: true })
  } catch (err) {
    console.error('Payment confirm error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router