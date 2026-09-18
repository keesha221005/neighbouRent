import { useState } from 'react'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import api from '../api/axios'

export default function CheckoutForm({ bookingId, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Get client secret from backend
      const { data } = await api.post('/payments/create-intent', { bookingId })

      // 2. Confirm payment with Stripe
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)
        }
      })

      if (result.error) {
        setError(result.error.message)
        setLoading(false)
        return
      }

      // 3. Tell backend payment succeeded
      await api.post('/payments/confirm', { paymentIntentId: result.paymentIntent.id, bookingId })

      onSuccess()
    } catch (err) {
      setError('Payment failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-lg p-4 bg-white">
        <CardElement options={{
          style: {
            base: { fontSize: '16px', color: '#374151' }
          }
        }} />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  )
}