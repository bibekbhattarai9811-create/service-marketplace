import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { apiClient } from '../api';

const StripeCheckout = ({ clientSecret, paymentIntentId, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message);
      setProcessing(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: window.location.href, // Or setup a specific return page if using redirects
      },
      redirect: 'if_required' 
    });

    if (confirmError) {
      setError(confirmError.message);
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      try {
        // Ping backend to finalize job
        await apiClient.post('/stripe/confirm-payment', { payment_intent_id: paymentIntent.id });
        onSuccess();
      } catch (err) {
        setError("Payment succeeded, but backend verification failed.");
        setProcessing(false);
      }
    } else {
        setError("Unexpected state");
        setProcessing(false);
    }
  };

  return (
    <div className="stripe-checkout-modal" style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, 
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
        <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '24px' }}>Complete Payment</h3>
            <form onSubmit={handleSubmit}>
                <PaymentElement />
                
                {error && <div style={{ color: 'red', marginTop: '16px' }}>{error}</div>}
                
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button type="button" className="ghost-button" onClick={onCancel} disabled={processing}>
                        Cancel
                    </button>
                    <button type="submit" className="primary-button" disabled={!stripe || processing}>
                        {processing ? "Processing..." : "Pay Now"}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default StripeCheckout;
