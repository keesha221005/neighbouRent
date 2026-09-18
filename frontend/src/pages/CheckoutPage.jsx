import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { useLocation, useNavigate } from 'react-router-dom'
import CheckoutForm from '../components/CheckoutForm'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export default function CheckoutPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { bookingId, itemTitle, totalPrice } = state || {}

  if (!bookingId) {
    navigate('/listings')
    return null
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6">
      <h1 className="text-2xl font-bold mb-2">Complete Payment</h1>
      <p className="text-gray-600 mb-6">Booking for: <strong>{itemTitle}</strong></p>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between">
          <span>Total Amount</span>
          <span className="font-bold">₹{totalPrice}</span>
        </div>
      </div>

      <Elements stripe={stripePromise}>
        <CheckoutForm
          bookingId={bookingId}
          onSuccess={() => navigate('/dashboard', {
            state: { message: 'Payment successful! Booking confirmed.' }
          })}
        />
      </Elements>

      <p className="text-xs text-gray-400 mt-4 text-center">
        Test card: 4242 4242 4242 4242 — any future date — any CVC
      </p>
    </div>
  )
}