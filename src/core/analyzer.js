/**
 * Accessibility Analyzer - axe-core integration for WCAG analysis
 * Runs accessibility checks and normalizes results
 */

import AxeBuilder from '@axe-core/playwright';
import { logger } from '../utils/logger.js';

/**
 * WCAG level to axe-core tags mapping
 * Each level includes all lower levels
 */
const LEVEL_TAGS = {
  A: ['wcag2a', 'wcag21a'],
  AA: ['wcag2a', 'wcag21a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
  AAA: ['wcag2a', 'wcag21a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'wcag2aaa', 'wcag21aaa']
};

/**
 * Impact severity ordering (highest to lowest)
 */
const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'];

/**
 * WCAG criteria descriptions for common rules
 */
const WCAG_DESCRIPTIONS = {
  '1.1.1': 'Non-text Content',
  '1.2.1': 'Audio-only and Video-only (Prerecorded)',
  '1.2.2': 'Captions (Prerecorded)',
  '1.2.3': 'Audio Description or Media Alternative (Prerecorded)',
  '1.2.5': 'Audio Description (Prerecorded)',
  '1.3.1': 'Info and Relationships',
  '1.3.2': 'Meaningful Sequence',
  '1.3.3': 'Sensory Characteristics',
  '1.3.4': 'Orientation',
  '1.3.5': 'Identify Input Purpose',
  '1.4.1': 'Use of Color',
  '1.4.2': 'Audio Control',
  '1.4.3': 'Contrast (Minimum)',
  '1.4.4': 'Resize Text',
  '1.4.5': 'Images of Text',
  '1.4.10': 'Reflow',
  '1.4.11': 'Non-text Contrast',
  '1.4.12': 'Text Spacing',
  '1.4.13': 'Content on Hover or Focus',
  '2.1.1': 'Keyboard',
  '2.1.2': 'No Keyboard Trap',
  '2.1.4': 'Character Key Shortcuts',
  '2.2.1': 'Timing Adjustable',
  '2.2.2': 'Pause, Stop, Hide',
  '2.3.1': 'Three Flashes or Below Threshold',
  '2.4.1': 'Bypass Blocks',
  '2.4.2': 'Page Titled',
  '2.4.3': 'Focus Order',
  '2.4.4': 'Link Purpose (In Context)',
  '2.4.5': 'Multiple Ways',
  '2.4.6': 'Headings and Labels',
  '2.4.7': 'Focus Visible',
  '2.5.1': 'Pointer Gestures',
  '2.5.2': 'Pointer Cancellation',
  '2.5.3': 'Label in Name',
  '2.5.4': 'Motion Actuation',
  '3.1.1': 'Language of Page',
  '3.1.2': 'Language of Parts',
  '3.2.1': 'On Focus',
  '3.2.2': 'On Input',
  '3.2.3': 'Consistent Navigation',
  '3.2.4': 'Consistent Identification',
  '3.3.1': 'Error Identification',
  '3.3.2': 'Labels or Instructions',
  '3.3.3': 'Error Suggestion',
  '3.3.4': 'Error Prevention (Legal, Financial, Data)',
  '4.1.1': 'Parsing',
  '4.1.2': 'Name, Role, Value',
  '4.1.3': 'Status Messages'
};

/**
 * @typedef {Object} AnalysisResult
 * @property {boolean} success - Whether analysis completed
 * @property {string} [error] - Error message if failed
 * @property {Object[]} violations - Accessibility violations
 * @property {Object[]} incomplete - Checks that need manual review
 * @property {Object[]} passes - Passing checks
 * @property {Object[]} inapplicable - Checks that don't apply
 * @property {Object} summary - Summary statistics
 */

/**
 * Analyzes a page for accessibility issues
 * @param {import('playwright').Page} page - Playwright page instance
 * @param {Object} options - Analysis options
 * @param {string} [options.level='AA'] - WCAG level to test
 * @returns {Promise<AnalysisResult>}
 */
export async function analyzePage(page, options = {}) {
  const { level = 'AA' } = options;

  try {
    logger.debug(`Running accessibility analysis for WCAG level ${level}`);

    const tags = LEVEL_TAGS[level];
    if (!tags) {
      return {
        success: false,
        error: `Invalid WCAG level: ${level}`
      };
    }

    // Configure and run axe-core
    const axeBuilder = new AxeBuilder({ page })
      .withTags(tags)
      .options({
        resultTypes: ['violations', 'incomplete', 'passes', 'inapplicable']
      });

    const results = await axeBuilder.analyze();

    // Normalize and enhance results
    const violations = normalizeViolations(results.violations);
    const incomplete = normalizeViolations(results.incomplete);
    const passes = results.passes.map(p => ({
      id: p.id,
      description: p.description,
      wcag: extractWcagCriteria(p.tags)
    }));

    // Calculate summary
    const summary = {
      violations: violations.length,
      violationInstances: violations.reduce((sum, v) => sum + v.nodes.length, 0),
      incomplete: incomplete.length,
      passes: passes.length,
      inapplicable: results.inapplicable.length,
      score: calculateScore(violations, passes)
    };

    logger.debug(`Analysis complete: ${summary.violations} violations, ${summary.passes} passes`);

    return {
      success: true,
      violations,
      incomplete,
      passes,
      inapplicable: results.inapplicable.length,
      summary,
      testEngine: {
        name: results.testEngine.name,
        version: results.testEngine.version
      },
      testEnvironment: {
        userAgent: results.testEnvironment.userAgent,
        windowWidth: results.testEnvironment.windowWidth,
        windowHeight: results.testEnvironment.windowHeight
      }
    };
  } catch (error) {
    logger.error(`Analysis failed: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Unknown error during analysis'
    };
  }
}

/**
 * Normalizes violation data for consistent output
 * @param {Object[]} violations - Raw axe-core violations
 * @returns {Object[]} Normalized violations
 */
function normalizeViolations(violations) {
  return violations
    .map(violation => ({
      id: violation.id,
      impact: violation.impact,
      wcag: extractWcagCriteria(violation.tags),
      wcagLevel: extractWcagLevel(violation.tags),
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.map(node => ({
        html: truncateHtml(node.html),
        selector: Array.isArray(node.target) ? node.target.join(' > ') : node.target,
        failureSummary: node.failureSummary,
        impact: node.impact
      }))
    }))
    .sort((a, b) => {
      // Sort by impact severity
      const aIndex = IMPACT_ORDER.indexOf(a.impact);
      const bIndex = IMPACT_ORDER.indexOf(b.impact);
      return aIndex - bIndex;
    });
}

/**
 * Extracts WCAG criteria numbers from axe tags
 * @param {string[]} tags - axe-core tags
 * @returns {string[]} WCAG criteria numbers
 */
function extractWcagCriteria(tags) {
  const criteria = [];
  const wcagPattern = /^wcag(\d)(\d)(\d+)$/;

  for (const tag of tags) {
    const match = tag.match(wcagPattern);
    if (match) {
      criteria.push(`${match[1]}.${match[2]}.${match[3]}`);
    }
  }

  return [...new Set(criteria)].sort();
}

/**
 * Extracts highest WCAG level from tags
 * @param {string[]} tags - axe-core tags
 * @returns {string} WCAG level (A, AA, or AAA)
 */
function extractWcagLevel(tags) {
  if (tags.some(t => t.includes('aaa'))) return 'AAA';
  if (tags.some(t => t.includes('aa') && !t.includes('aaa'))) return 'AA';
  return 'A';
}

/**
 * Truncates HTML to a reasonable length
 * @param {string} html - HTML string
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated HTML
 */
function truncateHtml(html, maxLength = 200) {
  if (!html || html.length <= maxLength) return html;
  return html.substring(0, maxLength) + '...';
}

/**
 * Calculates an accessibility score (0-100)
 * @param {Object[]} violations - Violations array
 * @param {Object[]} passes - Passes array
 * @returns {number} Score percentage
 */
function calculateScore(violations, passes) {
  const totalChecks = violations.length + passes.length;
  if (totalChecks === 0) return 100;

  // Weight violations by impact
  const impactWeights = { critical: 4, serious: 3, moderate: 2, minor: 1 };
  const maxWeight = 4;

  let totalWeight = passes.length * maxWeight;
  let violationWeight = 0;

  for (const violation of violations) {
    const weight = impactWeights[violation.impact] || 2;
    violationWeight += weight;
    totalWeight += weight;
  }

  const score = ((totalWeight - violationWeight) / totalWeight) * 100;
  return Math.round(score);
}

/**
 * Gets a human-readable description for a WCAG criterion
 * @param {string} criterion - WCAG criterion number (e.g., "1.4.3")
 * @returns {string} Description
 */
export function getWcagDescription(criterion) {
  return WCAG_DESCRIPTIONS[criterion] || 'Unknown criterion';
}

export { LEVEL_TAGS, IMPACT_ORDER, WCAG_DESCRIPTIONS };
