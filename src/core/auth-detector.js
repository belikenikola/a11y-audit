/**
 * Auth Detector - Identifies pages that require authentication
 * Uses heuristics to detect login walls, redirects, and auth requirements
 */

const AUTH_URL_PATTERNS = [
  '/login',
  '/signin',
  '/sign-in',
  '/sign_in',
  '/auth',
  '/authenticate',
  '/sso',
  '/oauth',
  '/cas',
  '/saml',
  '/account/login',
  '/user/login',
  '/users/sign_in',
  '/session/new'
];

const AUTH_FORM_SELECTORS = [
  'input[type="password"]',
  'input[name*="password"]',
  'input[name*="passwd"]',
  'input[id*="password"]',
  'input[autocomplete="current-password"]',
  'input[autocomplete="new-password"]'
];

const AUTH_TEXT_PATTERNS = [
  /sign\s*in/i,
  /log\s*in/i,
  /enter\s*(your\s*)?password/i,
  /forgot\s*(your\s*)?password/i,
  /authentication\s*required/i,
  /access\s*denied/i,
  /please\s*log\s*in/i,
  /you\s*must\s*(be\s*)?logged\s*in/i,
  /session\s*expired/i,
  /unauthorized/i
];

const AUTH_HTTP_CODES = [401, 403];

/**
 * Detects if a page requires authentication
 * @param {Object} params - Detection parameters
 * @param {import('playwright').Page} params.page - Playwright page instance
 * @param {import('playwright').Response} params.response - HTTP response
 * @param {string} params.originalUrl - The originally requested URL
 * @returns {Promise<{ requiresAuth: boolean, reason?: string }>}
 */
export async function detectAuth({ page, response, originalUrl }) {
  const checks = await Promise.all([
    checkHttpStatus(response),
    checkUrlRedirect(page, originalUrl),
    checkFormFields(page),
    checkPageContent(page)
  ]);

  // Find the first positive detection
  const detected = checks.find(check => check.requiresAuth);

  if (detected) {
    return detected;
  }

  return { requiresAuth: false };
}

/**
 * Check HTTP status code for auth-related responses
 */
async function checkHttpStatus(response) {
  if (!response) {
    return { requiresAuth: false };
  }

  const status = response.status();

  if (AUTH_HTTP_CODES.includes(status)) {
    return {
      requiresAuth: true,
      reason: `HTTP ${status} - Authentication required`
    };
  }

  return { requiresAuth: false };
}

/**
 * Check if page was redirected to a login URL
 */
async function checkUrlRedirect(page, originalUrl) {
  const currentUrl = page.url().toLowerCase();
  const originalLower = originalUrl.toLowerCase();

  // Check if we were redirected away from the original URL
  if (currentUrl !== originalLower) {
    const matchedPattern = AUTH_URL_PATTERNS.find(pattern =>
      currentUrl.includes(pattern)
    );

    if (matchedPattern) {
      return {
        requiresAuth: true,
        reason: `Redirected to login page: ${page.url()}`
      };
    }
  }

  // Also check if original URL contains auth patterns
  const originalHasAuth = AUTH_URL_PATTERNS.find(pattern =>
    originalLower.includes(pattern)
  );

  if (originalHasAuth) {
    return {
      requiresAuth: true,
      reason: `URL appears to be a login page`
    };
  }

  return { requiresAuth: false };
}

/**
 * Check for password input fields indicating a login form
 */
async function checkFormFields(page) {
  try {
    for (const selector of AUTH_FORM_SELECTORS) {
      const element = await page.$(selector);
      if (element) {
        // Verify the element is visible
        const isVisible = await element.isVisible().catch(() => false);
        if (isVisible) {
          return {
            requiresAuth: true,
            reason: 'Login form detected (password field present)'
          };
        }
      }
    }
  } catch {
    // Ignore errors during form detection
  }

  return { requiresAuth: false };
}

/**
 * Check page content for authentication-related text
 */
async function checkPageContent(page) {
  try {
    // Get visible text from specific elements likely to contain auth messages
    const selectors = ['h1', 'h2', 'h3', '.error', '.alert', '.message', 'title', 'main'];
    let combinedText = '';

    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          const text = await element.textContent().catch(() => '');
          combinedText += ` ${text}`;
        }
      } catch {
        continue;
      }
    }

    // Also get the page title
    const title = await page.title().catch(() => '');
    combinedText += ` ${title}`;

    // Check against auth text patterns
    for (const pattern of AUTH_TEXT_PATTERNS) {
      if (pattern.test(combinedText)) {
        return {
          requiresAuth: true,
          reason: 'Page content indicates authentication required'
        };
      }
    }
  } catch {
    // Ignore errors during content detection
  }

  return { requiresAuth: false };
}

export { AUTH_URL_PATTERNS, AUTH_FORM_SELECTORS, AUTH_TEXT_PATTERNS, AUTH_HTTP_CODES };
