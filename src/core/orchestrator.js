/**
 * Orchestrator - Coordinates the full audit workflow
 * Manages the flow from URL input to final report
 */

import { renderPage, cleanupPage, closeBrowser } from './renderer.js';
import { analyzePage } from './analyzer.js';
import { logger } from '../utils/logger.js';
import { validateUrl, validateLevel } from '../utils/validators.js';

/**
 * @typedef {Object} AuditOptions
 * @property {string} [level='AA'] - WCAG level (A, AA, AAA)
 * @property {number} [timeout=30000] - Page load timeout
 * @property {boolean} [verbose=false] - Enable verbose logging
 */

/**
 * @typedef {Object} AuditResult
 * @property {boolean} success - Whether audit completed successfully
 * @property {string} url - The audited URL
 * @property {string} timestamp - ISO timestamp of audit
 * @property {string} level - WCAG level tested
 * @property {string} [error] - Error message if failed
 * @property {boolean} [requiresAuth] - Whether auth is required
 * @property {string} [authReason] - Reason for auth requirement
 * @property {Object} [summary] - Audit summary statistics
 * @property {Object[]} [violations] - Accessibility violations
 * @property {Object[]} [incomplete] - Items needing manual review
 * @property {Object[]} [passes] - Passing checks
 * @property {Object} [testEngine] - axe-core version info
 * @property {Object} [testEnvironment] - Browser environment info
 */

/**
 * Runs a complete accessibility audit on a URL
 * @param {string} url - The URL to audit
 * @param {AuditOptions} options - Audit options
 * @returns {Promise<AuditResult>}
 */
export async function runAudit(url, options = {}) {
  const { level = 'AA', timeout = 30000, verbose = false } = options;

  // Set logger verbosity
  logger.setVerbose(verbose);

  const timestamp = new Date().toISOString();

  // Validate inputs
  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) {
    return {
      success: false,
      url,
      timestamp,
      level,
      error: urlValidation.error
    };
  }

  const levelValidation = validateLevel(level);
  if (!levelValidation.valid) {
    return {
      success: false,
      url,
      timestamp,
      level,
      error: levelValidation.error
    };
  }

  const normalizedUrl = urlValidation.url.href;
  const normalizedLevel = levelValidation.level;

  logger.debug(`Starting audit for: ${normalizedUrl}`);
  logger.debug(`WCAG Level: ${normalizedLevel}, Timeout: ${timeout}ms`);

  let renderResult = null;

  try {
    // Step 1: Render the page
    logger.debug('Step 1: Rendering page...');
    renderResult = await renderPage(normalizedUrl, { timeout });

    if (!renderResult.success) {
      // Check if it's an auth issue
      if (renderResult.requiresAuth) {
        logger.warning('Authentication required');
        return {
          success: false,
          url: normalizedUrl,
          timestamp,
          level: normalizedLevel,
          requiresAuth: true,
          authReason: renderResult.authReason,
          error: `This URL is not processable - authentication required: ${renderResult.authReason}`
        };
      }

      // Other render errors
      logger.error(`Render failed: ${renderResult.error}`);
      return {
        success: false,
        url: normalizedUrl,
        timestamp,
        level: normalizedLevel,
        error: renderResult.error
      };
    }

    // Step 2: Analyze accessibility
    logger.debug('Step 2: Analyzing accessibility...');
    const analysisResult = await analyzePage(renderResult.page, {
      level: normalizedLevel
    });

    if (!analysisResult.success) {
      logger.error(`Analysis failed: ${analysisResult.error}`);
      return {
        success: false,
        url: normalizedUrl,
        timestamp,
        level: normalizedLevel,
        error: analysisResult.error
      };
    }

    // Step 3: Compile results
    logger.debug('Step 3: Compiling results...');

    return {
      success: true,
      url: normalizedUrl,
      timestamp,
      level: normalizedLevel,
      summary: analysisResult.summary,
      violations: analysisResult.violations,
      incomplete: analysisResult.incomplete,
      passes: analysisResult.passes,
      inapplicable: analysisResult.inapplicable,
      testEngine: analysisResult.testEngine,
      testEnvironment: analysisResult.testEnvironment
    };
  } catch (error) {
    logger.error(`Unexpected error: ${error.message}`);
    return {
      success: false,
      url: normalizedUrl || url,
      timestamp,
      level: normalizedLevel || level,
      error: `Unexpected error: ${error.message}`
    };
  } finally {
    // Always clean up page resources
    if (renderResult) {
      await cleanupPage(renderResult);
    }
  }
}

/**
 * Gracefully shuts down the auditor (closes browser)
 */
export async function shutdown() {
  logger.debug('Shutting down auditor...');
  await closeBrowser();
}

/**
 * Validates that a URL can be audited without actually running the audit
 * @param {string} url - URL to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAuditTarget(url) {
  return validateUrl(url);
}
