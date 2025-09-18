import { WebDriver } from 'selenium-webdriver';

export interface OverlayConfig {
  title?: string;
  content?: string;
  html?: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  draggable?: boolean;
  collapsible?: boolean;
  autoUpdate?: boolean;
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
  };
}

export class UniversalOverlay {
  private driver: WebDriver;
  private overlayId: string;

  constructor(driver: WebDriver, overlayId: string = 'universal-overlay') {
    this.driver = driver;
    this.overlayId = overlayId;
  }

  // Create or update dynamic overlay
  async showOverlay(config: OverlayConfig): Promise<void> {
    try {
      await this.driver.executeScript(`
        (function() {
          const config = ${JSON.stringify(config)};
          const overlayId = '${this.overlayId}';

          // Remove existing overlay if present
          const existingOverlay = document.getElementById(overlayId);
          if (existingOverlay) {
            existingOverlay.remove();
          }

          // Default configuration
          const defaults = {
            title: 'Bot Status',
            content: 'Working...',
            position: { x: 20, y: 20 },
            size: { width: 400, height: 200 },
            draggable: true,
            collapsible: true,
            style: {
              backgroundColor: '#1a1a1a',
              borderColor: '#00ffff',
              textColor: '#ffffff'
            }
          };

          const finalConfig = { ...defaults, ...config };
          if (config.style) {
            finalConfig.style = { ...defaults.style, ...config.style };
          }

          // Use stored position if available (for position persistence)
          if (window.universalOverlayPosition && !config.position) {
            finalConfig.position = window.universalOverlayPosition;
          }

          // Create overlay container
          const overlay = document.createElement('div');
          overlay.id = overlayId;
          overlay.className = 'universal-dynamic-overlay';
          overlay.style.cssText =
            'position: fixed;' +
            'top: ' + finalConfig.position.y + 'px;' +
            'left: ' + finalConfig.position.x + 'px;' +
            'width: ' + (typeof finalConfig.size.width === 'number' ? finalConfig.size.width + 'px' : finalConfig.size.width) + ';' +
            'height: ' + (typeof finalConfig.size.height === 'number' ? finalConfig.size.height + 'px' : finalConfig.size.height) + ';' +
            'background: ' + finalConfig.style.backgroundColor + ';' +
            'border: 2px solid ' + finalConfig.style.borderColor + ';' +
            'border-radius: 12px;' +
            'box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);' +
            'z-index: 999999;' +
            'font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;' +
            'color: ' + finalConfig.style.textColor + ';' +
            'transition: width 0.3s ease, height 0.3s ease, border-radius 0.3s ease, opacity 0.2s ease, transform 0.2s ease;' +
            'cursor: ' + (finalConfig.draggable ? 'move' : 'default') + ';' +
            'user-select: none;' +
            '-webkit-user-select: none;' +
            '-moz-user-select: none;' +
            '-ms-user-select: none;';

          // Create header
          const header = document.createElement('div');
          header.className = 'overlay-header';
          header.style.cssText =
            'padding: 12px 16px;' +
            'border-bottom: 1px solid ' + finalConfig.style.borderColor + '40;' +
            'display: flex;' +
            'justify-content: space-between;' +
            'align-items: center;' +
            'cursor: ' + (finalConfig.draggable ? 'move' : 'default') + ';';

          const title = document.createElement('div');
          title.style.cssText =
            'font-weight: bold;' +
            'font-size: 14px;' +
            'color: ' + finalConfig.style.borderColor + ';';
          title.textContent = finalConfig.title;

          const controls = document.createElement('div');
          controls.style.cssText =
            'display: flex;' +
            'gap: 8px;';

          // Collapse/Expand button
          if (finalConfig.collapsible) {
            const collapseBtn = document.createElement('button');
            collapseBtn.innerHTML = '−';
            collapseBtn.style.cssText =
              'background: none;' +
              'border: 1px solid ' + finalConfig.style.borderColor + ';' +
              'color: ' + finalConfig.style.borderColor + ';' +
              'width: 24px;' +
              'height: 24px;' +
              'border-radius: 4px;' +
              'cursor: pointer;' +
              'font-size: 16px;' +
              'display: flex;' +
              'align-items: center;' +
              'justify-content: center;';

            collapseBtn.onclick = function() {
              const content = overlay.querySelector('.overlay-content');
              const titleEl = header.querySelector('div:first-child');

              if (content.style.display === 'none') {
                // Expand
                content.style.display = 'block';
                titleEl.style.display = 'block';
                overlay.style.width = (typeof finalConfig.size.width === 'number' ? finalConfig.size.width + 'px' : finalConfig.size.width);
                overlay.style.height = (typeof finalConfig.size.height === 'number' ? finalConfig.size.height + 'px' : finalConfig.size.height);
                overlay.style.borderRadius = '12px';
                overlay.style.borderWidth = '2px';
                collapseBtn.innerHTML = '−';
                collapseBtn.style.fontSize = '16px';
                collapseBtn.style.width = '24px';
                collapseBtn.style.height = '24px';
                collapseBtn.style.border = '1px solid ' + finalConfig.style.borderColor;
                collapseBtn.style.borderRadius = '4px';
                header.style.borderBottom = '1px solid ' + finalConfig.style.borderColor + '40';
                header.style.padding = '12px 16px';
                header.style.justifyContent = 'space-between';
                header.style.width = 'auto';
                header.style.height = 'auto';
              } else {
                // Collapse to circle - hide everything except + button
                content.style.display = 'none';
                titleEl.style.display = 'none';
                overlay.style.width = '60px';
                overlay.style.height = '60px';
                overlay.style.borderRadius = '50%';
                overlay.style.borderWidth = '4px';
                collapseBtn.innerHTML = '+';
                collapseBtn.style.fontSize = '24px';
                collapseBtn.style.width = '100%';
                collapseBtn.style.height = '100%';
                collapseBtn.style.border = 'none';
                collapseBtn.style.borderRadius = '50%';
                collapseBtn.style.background = 'none';
                header.style.borderBottom = 'none';
                header.style.padding = '0';
                header.style.justifyContent = 'center';
                header.style.alignItems = 'center';
                header.style.width = '100%';
                header.style.height = '100%';
              }
            };

            controls.appendChild(collapseBtn);
          }

          header.appendChild(title);
          header.appendChild(controls);

          // Create content area
          const content = document.createElement('div');
          content.className = 'overlay-content';
          content.style.cssText =
            'padding: 16px;' +
            'font-size: 13px;' +
            'line-height: 1.4;' +
            'max-height: 400px;' +
            'overflow-y: auto;';

          if (finalConfig.html) {
            content.innerHTML = finalConfig.html;
          } else {
            content.textContent = finalConfig.content;
          }

          overlay.appendChild(header);
          overlay.appendChild(content);

          // Add drag functionality
          if (finalConfig.draggable) {
            let isDragging = false;
            let currentX;
            let currentY;
            let initialX;
            let initialY;
            let xOffset = finalConfig.position.x;
            let yOffset = finalConfig.position.y;

            // Prevent text selection during drag
            header.addEventListener('selectstart', function(e) {
              e.preventDefault();
              return false;
            });

            header.addEventListener('mousedown', function(e) {
              if (e.target.tagName === 'BUTTON') return;

              e.preventDefault();
              e.stopPropagation();

              initialX = e.clientX - xOffset;
              initialY = e.clientY - yOffset;
              isDragging = true;

              // Add visual feedback
              overlay.style.opacity = '0.8';
              overlay.style.transform = 'scale(1.02)';

              // Prevent text selection on the whole document
              document.body.style.userSelect = 'none';
              document.body.style.webkitUserSelect = 'none';
              document.body.style.mozUserSelect = 'none';
              document.body.style.msUserSelect = 'none';
            });

            document.addEventListener('mousemove', function(e) {
              if (isDragging) {
                e.preventDefault();
                e.stopPropagation();

                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                // Keep overlay within viewport bounds
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const overlayRect = overlay.getBoundingClientRect();

                currentX = Math.max(0, Math.min(currentX, viewportWidth - overlayRect.width));
                currentY = Math.max(0, Math.min(currentY, viewportHeight - overlayRect.height));

                xOffset = currentX;
                yOffset = currentY;

                overlay.style.left = currentX + 'px';
                overlay.style.top = currentY + 'px';

                // Store position for persistence
                window.universalOverlayPosition = { x: xOffset, y: yOffset };
              }
            });

            document.addEventListener('mouseup', function() {
              if (isDragging) {
                isDragging = false;

                // Restore visual feedback
                overlay.style.opacity = '1';
                overlay.style.transform = 'scale(1)';

                // Restore text selection
                document.body.style.userSelect = '';
                document.body.style.webkitUserSelect = '';
                document.body.style.mozUserSelect = '';
                document.body.style.msUserSelect = '';
              }
            });

            // Handle mouse leave to prevent stuck drag state
            document.addEventListener('mouseleave', function() {
              if (isDragging) {
                isDragging = false;
                overlay.style.opacity = '1';
                overlay.style.transform = 'scale(1)';
                document.body.style.userSelect = '';
                document.body.style.webkitUserSelect = '';
                document.body.style.mozUserSelect = '';
                document.body.style.msUserSelect = '';
              }
            });
          }

          document.body.appendChild(overlay);

          // Store overlay reference globally for updates
          window.universalOverlay = overlay;
          window.universalOverlayConfig = finalConfig;
        })();
      `);
    } catch (error) {
      console.error('Error showing overlay:', error);
    }
  }

  // Update overlay content without recreating
  async updateOverlay(updates: Partial<OverlayConfig>): Promise<void> {
    try {
      await this.driver.executeScript(`
        (function() {
          const updates = ${JSON.stringify(updates)};
          const overlay = window.universalOverlay;
          if (!overlay) return;

          // Store current position before updating
          const currentPosition = {
            x: parseInt(overlay.style.left) || 0,
            y: parseInt(overlay.style.top) || 0
          };
          window.universalOverlayPosition = currentPosition;

          if (updates.title) {
            const titleEl = overlay.querySelector('.overlay-header div');
            if (titleEl) titleEl.textContent = updates.title;
          }

          if (updates.content || updates.html) {
            const contentEl = overlay.querySelector('.overlay-content');
            if (contentEl) {
              if (updates.html) {
                contentEl.innerHTML = updates.html;
              } else if (updates.content) {
                contentEl.textContent = updates.content;
              }
            }
          }

          // Update stored config
          if (window.universalOverlayConfig) {
            window.universalOverlayConfig = { ...window.universalOverlayConfig, ...updates };
          }

          // Restore position after update
          overlay.style.left = currentPosition.x + 'px';
          overlay.style.top = currentPosition.y + 'px';
        })();
      `);
    } catch (error) {
      console.error('Error updating overlay:', error);
    }
  }

  // Hide overlay
  async hideOverlay(): Promise<void> {
    try {
      await this.driver.executeScript(`
        const overlay = document.getElementById('${this.overlayId}');
        if (overlay) {
          overlay.remove();
        }
        delete window.universalOverlay;
        delete window.universalOverlayConfig;
      `);
    } catch (error) {
      console.error('Error hiding overlay:', error);
    }
  }

  // Show simple step progress overlay
  async showStepProgress(stepName: string, stepIndex: number, description?: string): Promise<void> {
    const progressHTML = `
      <div style="display: flex; flex-direction: column; gap: 15px; text-align: center;">
        <div style="display: flex; justify-content: center; align-items: center; gap: 15px;">
          <div style="
            color: #00ffff;
            font-size: 20px;
            font-weight: bold;
            min-width: 30px;
          ">${stepIndex}</div>
          <div style="color: #ffffff; font-size: 20px; font-weight: bold;">
            ${stepName}
          </div>
        </div>
        ${description ? `<div style="font-size: 16px; color: #00dd88; line-height: 1.4; margin-top: 5px;">${description}</div>` : ''}
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px;">
          <div style="
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #00ffff;
            animation: pulse 1.5s ease-in-out infinite;
          "></div>
          <span style="font-size: 12px; opacity: 0.7;">Working...</span>
        </div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      </style>
    `;

    await this.showOverlay({
      title: '🤖 Bot Status: Running',
      html: progressHTML,
      position: { x: 20, y: 20 },
      draggable: true,
      collapsible: true,
      style: {
        backgroundColor: '#1a1a1a',
        borderColor: '#00ffff',
        textColor: '#ffffff'
      }
    });
  }

  // Update step progress
  async updateStepProgress(stepName: string, stepIndex: number, description?: string): Promise<void> {
    const progressHTML = `
      <div style="display: flex; flex-direction: column; gap: 15px; text-align: center;">
        <div style="display: flex; justify-content: center; align-items: center; gap: 15px;">
          <div style="
            color: #00ffff;
            font-size: 20px;
            font-weight: bold;
            min-width: 30px;
          ">${stepIndex}</div>
          <div style="color: #ffffff; font-size: 20px; font-weight: bold;">
            ${stepName}
          </div>
        </div>
        ${description ? `<div style="font-size: 16px; color: #00dd88; line-height: 1.4; margin-top: 5px;">${description}</div>` : ''}
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px;">
          <div style="
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #00ffff;
            animation: pulse 1.5s ease-in-out infinite;
          "></div>
          <span style="font-size: 12px; opacity: 0.7;">Working...</span>
        </div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      </style>
    `;

    await this.updateOverlay({
      title: '🤖 Bot Status: Running',
      html: progressHTML
    });
  }

  // Show job progress overlay
  async showJobProgress(appliedJobs: number, totalJobs: number, currentStep: string, stepIndex: number): Promise<void> {
    const progressHTML = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; justify-content: between; align-items: center;">
          <span style="color: #00ffff;">Jobs Applied:</span>
          <span style="font-weight: bold;">${appliedJobs}/${totalJobs}</span>
        </div>
        <div style="background: #333; border-radius: 6px; height: 8px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #00ffff, #00dd88); height: 100%; width: ${(appliedJobs/totalJobs)*100}%; transition: width 0.3s ease;"></div>
        </div>
        <div style="font-size: 12px; opacity: 0.8;">
          Step ${stepIndex}: ${currentStep}
        </div>
      </div>
    `;

    await this.showOverlay({
      title: '🤖 Seek Bot Progress',
      html: progressHTML,
      position: { x: 20, y: 20 },
      size: { width: 400, height: 200 },
      style: {
        backgroundColor: '#1a1a1a',
        borderColor: '#00ffff',
        textColor: '#ffffff'
      }
    });
  }

  // Update job progress
  async updateJobProgress(appliedJobs: number, totalJobs: number, currentStep: string, stepIndex: number): Promise<void> {
    const progressHTML = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; justify-content: between; align-items: center;">
          <span style="color: #00ffff;">Jobs Applied:</span>
          <span style="font-weight: bold;">${appliedJobs}/${totalJobs}</span>
        </div>
        <div style="background: #333; border-radius: 6px; height: 8px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #00ffff, #00dd88); height: 100%; width: ${(appliedJobs/totalJobs)*100}%; transition: width 0.3s ease;"></div>
        </div>
        <div style="font-size: 12px; opacity: 0.8;">
          Step ${stepIndex}: ${currentStep}
        </div>
      </div>
    `;

    await this.updateOverlay({
      html: progressHTML
    });
  }

  // Show custom notification overlay
  async showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<void> {
    const colors = {
      info: { bg: '#1a1a2e', border: '#00ffff', text: '#ffffff' },
      success: { bg: '#1a2e1a', border: '#00ff88', text: '#ffffff' },
      warning: { bg: '#2e2e1a', border: '#ffaa00', text: '#ffffff' },
      error: { bg: '#2e1a1a', border: '#ff4444', text: '#ffffff' }
    };

    const color = colors[type];
    const icons: Record<string, string> = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };

    await this.showOverlay({
      title: `${icons[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      content: message,
      position: { x: 20, y: 100 },
      size: { width: 350, height: 'auto' },
      style: {
        backgroundColor: color.bg,
        borderColor: color.border,
        textColor: color.text
      }
    });
  }

  // Show sign-in overlay using new dynamic system
  async showSignInOverlay(): Promise<void> {
    try {
      // Show dynamic sign-in overlay
      await this.showOverlay({
        title: '🔐 Please Sign In',
        html: `
          <div style="text-align: center;">
            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.4;">
              Please sign in to your account manually. You can click anywhere on the page to log in.
            </p>
            <button id="signin-continue-btn" style="
              background: #ff4444;
              color: white;
              border: none;
              border-radius: 8px;
              padding: 12px 20px;
              font-size: 14px;
              font-weight: bold;
              cursor: pointer;
              width: 100%;
            ">
              ✅ I have logged in - Continue
            </button>
          </div>
        `,
        position: { x: 20, y: 20 },
        style: {
          backgroundColor: '#ffffff',
          borderColor: '#ff4444',
          textColor: '#333333'
        }
      });

      // Add button functionality
      await this.driver.executeScript(`
        const button = document.getElementById('signin-continue-btn');
        if (button) {
          button.onmouseover = () => button.style.background = '#dd3333';
          button.onmouseout = () => button.style.background = '#ff4444';
          button.onclick = () => {
            window.universalOverlayButtonClicked = true;
            localStorage.setItem('universalOverlayCompleted', 'true');
          };
        }
      `);

      console.log('🔐 Please sign in manually and click "Continue" when done');

      // Wait for continue button to be clicked
      return new Promise<void>((resolve) => {
        const checkInterval = setInterval(async () => {
          try {
            const buttonClicked = await this.driver.executeScript('return window.universalOverlayButtonClicked;');
            if (buttonClicked) {
              await this.driver.executeScript('delete window.universalOverlayButtonClicked;');
              clearInterval(checkInterval);
              console.log('✅ Continue clicked - proceeding...');
              await this.hideOverlay();
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

  // Remove overlay (cleanup) - alias for hideOverlay
  async removeOverlay(): Promise<void> {
    await this.hideOverlay();
  }
}