import { getPaymentMessage } from '$lib/auth-check.js';

export function load() {
  return {
    paymentInfo: getPaymentMessage()
  };
}