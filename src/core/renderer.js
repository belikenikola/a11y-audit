/**
 * Page Renderer - Uses Playwright to load and render pages
 * Handles browser lifecycle, page loading, and error states
 */

import { chromium } from 'playwright';
import { detectAuth } from './auth-detector.js';
import { logger } from '../utils/logger.js';

/**
 * @typedef {Object} RenderResult
 * @property {boolean} success - Whether the page was successfully loaded
 * @property {import('playwright').Page} [page] - The Playwright page instance
 * @property {import('playwright').Browser} [browser] - The browser instance
 * @property {string} [error] - Error message if failed
 * @property {boolean} [requiresAuth] - Whether auth is required
 * @property {string} [authReason] - Reason for auth requirement
 */

/**
 * Browser instance cache for reuse
 */
let browserInstance = null;

/**
 * Launches or returns cached browser instance
 * @returns {Promise<import('playwright').Browser>}
 */
async function getBrowser() {
  if (!browserInstance || !browserInstance.isConnected()) {
    logger.debug('Launching new browser instance');
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu'
      ]
    });
  }
  return browserInstance;
}

/**
 * Closes the browser instance
 */
export async function closeBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    logger.debug('Closing browser instance');
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Renders a page and prepares it for accessibility analysis
 * @param {string} url - The URL to render
 * @param {Object} options - Render options
 * @param {number} [options.timeout=30000] - Page load timeout in ms
 * @param {boolean} [options.waitForNetworkIdle=true] - Wait for network to be idle
 * @returns {Promise<RenderResult>}
 */
export async function renderPage(url, options = {}) {
  const { timeout = 30000, waitForNetworkIdle = true } = options;

  let browser = null;
  let context = null;
  let page = null;

  try {
    browser = await getBrowser();

    // Create a new context for isolation
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 a11y-audit/1.0',
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true
    });

    page = await context.newPage();

    logger.debug(`Navigating to: ${url}`);

    // Navigate to the page
    const response = await page.goto(url, {
      timeout,
      waitUntil: waitForNetworkIdle ? 'networkidle' : 'domcontentloaded'
    });

    // Check for HTTP errors
    if (!response) {
      return {
        success: false,
        error: 'No response received from server'
      };
    }

    const status = response.status();
    if (status >= 400 && status !== 401 && status !== 403) {
      return {
        success: false,
        error: `HTTP error ${status}: ${response.statusText()}`
      };
    }

    // Detect authentication requirements
    const authResult = await detectAuth({ page, response, originalUrl: url });

    if (authResult.requiresAuth) {
      // Clean up since we won't continue
      await context.close();
      return {
        success: false,
        requiresAuth: true,
        authReason: authResult.reason
      };
    }

    // Wait for page to stabilize
    await page.waitForLoadState('domcontentloaded');

    // Optional: wait a bit more for dynamic content
    await page.waitForTimeout(1000);

    logger.debug('Page rendered successfully');

    return {
      success: true,
      page,
      context,
      browser
    };
  } catch (error) {
    // Clean up on error
    if (context) {
      await context.close().catch(() => {});
    }

    // Categorize the error
    if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      return {
        success: false,
        error: 'Domain not found - check the URL'
      };
    }

    if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
      return {
        success: false,
        error: 'Connection refused - server may be down'
      };
    }

    if (error.message.includes('net::ERR_CONNECTION_TIMED_OUT') || error.name === 'TimeoutError') {
      return {
        success: false,
        error: `Page load timed out after ${timeout}ms`
      };
    }

    if (error.message.includes('net::ERR_CERT')) {
      return {
        success: false,
        error: 'SSL certificate error'
      };
    }

    return {
      success: false,
      error: error.message || 'Unknown error during page render'
    };
  }
}

/**
 * Cleans up page and context resources
 * @param {Object} renderResult - The result from renderPage
 */
export async function cleanupPage(renderResult) {
  if (renderResult?.context) {
    try {
      await renderResult.context.close();
    } catch {
      // Ignore cleanup errors
    }
  }
}

export { getBrowser };
