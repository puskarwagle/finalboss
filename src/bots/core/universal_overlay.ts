import { WebDriver } from 'selenium-webdriver';

export class UniversalOverlay {
  private driver: WebDriver;

  constructor(driver: WebDriver) {
    this.driver = driver;
  }

  // Show sign-in overlay and wait for Enter key
  async showSignInOverlay(): Promise<void> {
    try {
      // Inject the overlay into the page
      await this.driver.executeScript(`
        (function() {
          // Check if user already clicked continue
          if (localStorage.getItem('universalOverlayCompleted')) {
            return;
          }

          // Remove existing overlay if present
          const existingOverlay = document.getElementById('universal-signin-overlay');
          if (existingOverlay) {
            existingOverlay.remove();
          }

          // Mark that we're showing the overlay
          localStorage.setItem('universalOverlayActive', 'true');

          // Create overlay container
          const overlay = document.createElement('div');
          overlay.id = 'universal-signin-overlay';
          overlay.style.cssText = \`
            position: fixed;
            top: 20px;
            right: 20px;
            width: 350px;
            height: auto;
            background: transparent;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            pointer-events: none;
          \`;

          // Create message box
          const messageBox = document.createElement('div');
          messageBox.style.cssText = \`
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            text-align: center;
            border: 3px solid #ff4444;
            pointer-events: auto;
          \`;

          // Create title
          const title = document.createElement('h2');
          title.style.cssText = \`
            color: #ff4444;
            margin: 0 0 20px 0;
            font-size: 24px;
            font-weight: bold;
          \`;
          title.innerHTML = '🔐 Please Sign In';

          // Create message
          const message = document.createElement('p');
          message.style.cssText = \`
            color: #333;
            margin: 0 0 20px 0;
            font-size: 14px;
            line-height: 1.4;
          \`;
          message.innerHTML = 'Please sign in to your account manually. You can click anywhere on the page to log in.';

          // Create continue button
          const continueButton = document.createElement('button');
          continueButton.style.cssText = \`
            background: #ff4444;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            width: 100%;
            margin-top: 10px;
          \`;
          continueButton.innerHTML = '✅ I have logged in - Continue';

          // Add hover effect
          continueButton.onmouseover = () => continueButton.style.background = '#dd3333';
          continueButton.onmouseout = () => continueButton.style.background = '#ff4444';

          // Button click handler
          continueButton.onclick = () => {
            overlay.remove();
            // Set flags that continue was clicked
            window.universalOverlayButtonClicked = true;
            localStorage.setItem('universalOverlayCompleted', 'true');
            localStorage.removeItem('universalOverlayActive');
          };

          // Assemble the overlay
          messageBox.appendChild(title);
          messageBox.appendChild(message);
          messageBox.appendChild(continueButton);
          overlay.appendChild(messageBox);
          document.body.appendChild(overlay);

          // Auto re-inject overlay on page loads during login process
          const autoReInject = () => {
            if (localStorage.getItem('universalOverlayActive') && !localStorage.getItem('universalOverlayCompleted')) {
              if (!document.getElementById('universal-signin-overlay')) {
                document.body.appendChild(overlay);
              }
            }
          };

          // Check every 2 seconds if we need to re-inject
          const checkInterval = setInterval(() => {
            if (localStorage.getItem('universalOverlayCompleted')) {
              clearInterval(checkInterval);
            } else {
              autoReInject();
            }
          }, 2000);

          // Also check when page loads
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', autoReInject);
          } else {
            autoReInject();
          }
        })();
      `);

      console.log('🔐 Please sign in manually and click "Continue" when done');

      // Wait for continue button to be clicked
      return new Promise<void>((resolve) => {
        const checkInterval = setInterval(async () => {
          try {
            const buttonClicked = await this.driver.executeScript('return window.universalOverlayButtonClicked;');
            if (buttonClicked) {
              // Clean up the flag
              await this.driver.executeScript('delete window.universalOverlayButtonClicked;');
              clearInterval(checkInterval);
              console.log('✅ Continue clicked - navigating back to search...');
              resolve();
            }
          } catch (error) {
            // Continue checking
          }
        }, 500);

        // Timeout after 10 minutes
        setTimeout(() => {
          clearInterval(checkInterval);
          console.log('⏰ Sign-in timeout reached');
          resolve();
        }, 10 * 60 * 1000);
      });

    } catch (error) {
      console.error(`Error showing sign-in overlay: ${error}`);
      throw error;
    }
  }

  // Remove overlay (cleanup)
  async removeOverlay(): Promise<void> {
    try {
      await this.driver.executeScript(`
        const overlay = document.getElementById('universal-signin-overlay');
        if (overlay) {
          overlay.remove();
        }
        delete window.universalOverlayButtonClicked;
        localStorage.removeItem('universalOverlayActive');
        localStorage.removeItem('universalOverlayCompleted');
      `);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}