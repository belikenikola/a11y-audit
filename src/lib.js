/**
 * @belikenikola/wcag-audit — public library API.
 *
 * This module is the package entry point (see `main` and `exports` in package.json).
 * The CLI bin lives at bin/wcag-audit.js and is built on top of this same surface.
 *
 * Typical programmatic use:
 *
 *   import { runAudit, generateReport, saveReport, shutdown } from '@belikenikola/wcag-audit';
 *
 *   const result = await runAudit('https://example.com', { level: 'AA' });
 *   if (result.success) {
 *     const html = generateReport(result, 'html');
 *     await saveReport(result, 'report.html', 'html');
 *   }
 *   await shutdown();
 *
 * Serverless / custom-Chromium use (e.g. Vercel + @sparticuz/chromium):
 *
 *   import { setBrowserLauncher, runAudit, shutdown } from '@belikenikola/wcag-audit';
 *   import { chromium } from 'playwright-core';
 *   import chromiumBin from '@sparticuz/chromium';
 *
 *   setBrowserLauncher(async () => chromium.launch({
 *     args: chromiumBin.args,
 *     executablePath: await chromiumBin.executablePath(),
 *     headless: true,
 *   }));
 *   const result = await runAudit(url);
 *   await shutdown();
 */

export { runAudit, shutdown, validateAuditTarget } from './core/orchestrator.js';
export {
  generateReport,
  saveReport,
  getDefaultFilename,
  getReportData,
  FORMATTERS,
} from './reporting/generator.js';
export {
  buildTodoList,
  groupTodosByCategory,
  groupTodosByPrinciple,
  calculateEffortSummary,
} from './todo/builder.js';
export { EXIT_CODES } from './cli.js';
export { setBrowserLauncher } from './core/renderer.js';
