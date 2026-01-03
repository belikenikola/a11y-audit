/**
 * Report Generator - Dispatches to appropriate formatter and handles file output
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { formatJson, buildReport } from './json-formatter.js';
import { formatHtml } from './html-formatter.js';
import { formatMarkdown } from './md-formatter.js';
import { logger } from '../utils/logger.js';

/**
 * Available formatters
 */
const FORMATTERS = {
  json: formatJson,
  html: formatHtml,
  md: formatMarkdown
};

/**
 * Generates a formatted report
 * @param {Object} auditResult - Raw audit result from orchestrator
 * @param {string} format - Output format (json, html, md)
 * @returns {string} Formatted report content
 */
export function generateReport(auditResult, format = 'json') {
  const formatter = FORMATTERS[format.toLowerCase()];

  if (!formatter) {
    throw new Error(`Unknown format: ${format}. Supported: ${Object.keys(FORMATTERS).join(', ')}`);
  }

  return formatter(auditResult);
}

/**
 * Generates and saves a report to file
 * @param {Object} auditResult - Raw audit result from orchestrator
 * @param {string} outputPath - File path to save to
 * @param {string} format - Output format (json, html, md)
 * @returns {Promise<{ success: boolean, path?: string, error?: string }>}
 */
export async function saveReport(auditResult, outputPath, format = 'json') {
  try {
    const content = generateReport(auditResult, format);

    // Ensure directory exists
    const dir = dirname(outputPath);
    await mkdir(dir, { recursive: true });

    // Write file
    await writeFile(outputPath, content, 'utf8');

    logger.debug(`Report saved to: ${outputPath}`);

    return { success: true, path: outputPath };
  } catch (error) {
    logger.error(`Failed to save report: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Gets the default filename for a report
 * @param {string} url - The audited URL
 * @param {string} format - Output format
 * @returns {string} Default filename
 */
export function getDefaultFilename(url, format = 'json') {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/\./g, '-');
    const timestamp = new Date().toISOString().split('T')[0];
    return `a11y-report-${hostname}-${timestamp}.${format}`;
  } catch {
    const timestamp = new Date().toISOString().split('T')[0];
    return `a11y-report-${timestamp}.${format}`;
  }
}

/**
 * Returns the raw report object (for programmatic use)
 * @param {Object} auditResult - Raw audit result
 * @returns {Object} Full report object
 */
export function getReportData(auditResult) {
  return buildReport(auditResult);
}

export { FORMATTERS };
