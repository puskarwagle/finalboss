<script>
  import { getPaymentMessage } from '$lib/auth-check';

  const paymentInfo = getPaymentMessage();
</script>

<style>
  .unauthorized-container {
    min-height: 80vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .unauthorized-icon {
    font-size: 4rem;
    color: var(--color-error);
    margin-bottom: var(--space-lg);
  }

  .unauthorized-title {
    font-size: var(--font-size-xl);
    color: var(--color-error);
    margin-bottom: var(--space-md);
    font-weight: var(--font-weight-bold);
  }

  .unauthorized-message {
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-xl);
    max-width: 600px;
    line-height: 1.6;
  }

  .contact-info {
    background: var(--color-surface);
    padding: var(--space-lg);
    border-radius: var(--radius-md);
    border: 2px solid var(--color-primary);
    margin-bottom: var(--space-xl);
  }

  .contact-email {
    color: var(--color-primary);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-lg);
  }

  .back-button {
    display: inline-block;
    padding: var(--space-md) var(--space-lg);
    background: var(--color-primary);
    color: var(--color-black);
    text-decoration: none;
    border-radius: var(--radius-sm);
    font-weight: var(--font-weight-bold);
    transition: var(--transition-normal);
  }

  .back-button:hover {
    background: var(--color-primary-dark);
    box-shadow: var(--shadow-glow);
  }
</style>

<main class="page page--centered unauthorized-container">
  <div class="unauthorized-icon">🚫</div>

  <h1 class="unauthorized-title">Access Denied</h1>

  <p class="unauthorized-message">
    {paymentInfo.message}
  </p>

  <div class="contact-info">
    <p>Contact for access:</p>
    <div class="contact-email">{paymentInfo.contact}</div>
  </div>

  <a href="/login" class="back-button">Back to Login</a>
</main>