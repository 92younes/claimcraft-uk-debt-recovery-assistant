/**
 * Payment Service - Handles Stripe payment API interactions
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface PaymentVerificationResponse {
  status: string;
  paid: boolean;
  claimId: string;
  documentType: string;
  amount: number;
  currency: string;
}

export interface PaymentServiceStatus {
  configured: boolean;
  provider: string;
}

/**
 * Create a PaymentIntent for document download
 */
export const createPaymentIntent = async (
  claimId: string,
  documentType: string
): Promise<PaymentIntentResponse> => {
  const response = await fetch(`${API_BASE}/api/payments/create-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claimId, documentType })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create payment');
  }

  return response.json();
};

/**
 * Verify payment status with server
 */
export const verifyPayment = async (
  paymentIntentId: string
): Promise<PaymentVerificationResponse> => {
  const response = await fetch(`${API_BASE}/api/payments/verify/${paymentIntentId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to verify payment');
  }

  return response.json();
};

/**
 * Check if payment service is configured
 */
export const getPaymentServiceStatus = async (): Promise<PaymentServiceStatus> => {
  try {
    const response = await fetch(`${API_BASE}/api/payments/status`);
    return response.json();
  } catch {
    return { configured: false, provider: 'stripe' };
  }
};
