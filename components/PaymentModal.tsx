import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { CreditCard, Lock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { createPaymentIntent } from '../services/paymentService';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

// Validate Stripe publishable key
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const isStripeConfigured = Boolean(stripePublishableKey && stripePublishableKey.trim().length > 0);

// Initialize Stripe only if properly configured
let stripePromise: Promise<Stripe | null> | null = null;
if (isStripeConfigured) {
  stripePromise = loadStripe(stripePublishableKey);
  console.log('Stripe initialized with publishable key');
} else {
  console.warn('Stripe not configured - VITE_STRIPE_PUBLISHABLE_KEY is missing or empty');
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (paymentIntentId: string) => void;
  claimId: string;
  documentType: string;
}

interface PaymentFormProps {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
  documentType: string;
}

// Inner form component with access to Stripe hooks
const PaymentForm: React.FC<PaymentFormProps> = ({
  clientSecret,
  onSuccess,
  onCancel,
  documentType
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found');
      setIsProcessing(false);
      return;
    }

    try {
      const { paymentIntent, error: stripeError } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement as any,
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        setIsComplete(true);
        // Brief delay to show success state
        setTimeout(() => {
          onSuccess(paymentIntent.id);
        }, 1500);
      } else {
        setError('Payment was not completed');
        setIsProcessing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsProcessing(false);
    }
  };

  if (isComplete) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-teal-600" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Payment Successful</h3>
        <p className="text-slate-600">Your document is now ready to download.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Content */}
      <div className="p-6 md:p-8">
        <div className="mb-6">
          <p className="text-slate-600 mb-4">
            Complete payment to download your <span className="font-medium text-slate-900">{documentType}</span> document without watermark.
          </p>

          {/* Price display */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Document download</span>
              <span className="text-2xl font-bold text-slate-900">£2.50</span>
            </div>
          </div>

          {/* Card Element */}
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Card details
          </label>
          <div className="border border-slate-300 rounded-xl p-4 bg-white focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition-all">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#0f172a',
                    '::placeholder': {
                      color: '#94a3b8',
                    },
                  },
                  invalid: {
                    color: '#dc2626',
                  },
                },
              }}
            />
          </div>

          {/* Security note */}
          <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
            <Lock className="w-4 h-4" />
            <span>Secured by Stripe. We never store your card details.</span>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 border-t border-slate-200 p-6 flex gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isProcessing}
          fullWidth
          size="lg"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          isLoading={isProcessing}
          icon={!isProcessing ? <Lock className="w-4 h-4" /> : undefined}
          fullWidth
          size="lg"
        >
          {isProcessing ? 'Processing...' : 'Pay £2.50'}
        </Button>
      </div>
    </form>
  );
};

// Main modal component
export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  claimId,
  documentType
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !clientSecret) {
      setIsLoading(true);
      setError(null);

      createPaymentIntent(claimId, documentType)
        .then((response) => {
          setClientSecret(response.clientSecret);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err.message || 'Failed to initialize payment');
          setIsLoading(false);
        });
    }
  }, [isOpen, claimId, documentType, clientSecret]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setClientSecret(null);
      setError(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    setClientSecret(null);
    setError(null);
    onClose();
  };

  const handleRetry = () => {
    setError(null);
    setClientSecret(null);
    setIsLoading(true);
    createPaymentIntent(claimId, documentType)
      .then((response) => {
        setClientSecret(response.clientSecret);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to initialize payment');
        setIsLoading(false);
      });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Complete Payment"
      titleIcon={
        <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
          <CreditCard className="w-6 h-6" />
        </div>
      }
      maxWidthClassName="max-w-md"
      bodyClassName="p-0"
    >
      {/* Stripe not configured warning */}
      {!isStripeConfigured && (
        <div className="p-8">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-900 font-medium">Payment System Not Configured</p>
              <p className="text-amber-700 text-sm mt-1">
                Stripe payment integration is not configured. Please contact the administrator to set up payment processing.
              </p>
              <p className="text-amber-600 text-xs mt-2">
                Technical: VITE_STRIPE_PUBLISHABLE_KEY environment variable is missing or empty.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              fullWidth
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isStripeConfigured && isLoading && (
        <div className="p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-4" />
          <p className="text-slate-600">Preparing payment...</p>
        </div>
      )}

      {/* Error state */}
      {isStripeConfigured && error && !isLoading && (
        <div className="p-8">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 font-medium">Payment Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={handleRetry}
              fullWidth
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Payment form */}
      {isStripeConfigured && clientSecret && !isLoading && !error && stripePromise && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
            },
          }}
        >
          <PaymentForm
            clientSecret={clientSecret}
            onSuccess={onPaymentSuccess}
            onCancel={handleClose}
            documentType={documentType}
          />
        </Elements>
      )}
    </Modal>
  );
};
