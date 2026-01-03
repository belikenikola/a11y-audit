/**
 * CLI Module - Command line interface for a11y-audit
 */

import { Command } from 'commander';
import ora from 'ora';
import { runAudit, shutdown } from './core/orchestrator.js';
import { saveReport, getDefaultFilename } from './reporting/generator.js';
import { buildTodoList } from './todo/builder.js';
import { logger, COLORS } from './utils/logger.js';
import { validateUrl, validateLevel, validateFormat, validateTimeout } from './utils/validators.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

// Get package.json for version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

/**
 * Exit codes
 */
export const EXIT_CODES = {
  SUCCESS_NO_VIOLATIONS: 0,
  SUCCESS_WITH_VIOLATIONS: 1,
  AUTH_REQUIRED: 2,
  INVALID_INPUT: 3,
  UNEXPECTED_ERROR: 4
};

/**
 * Creates and configures the CLI program
 * @returns {Command}
 */
export function createProgram() {
  const program = new Command();

  program
    .name('a11y-audit')
    .description('WCAG 2.1 accessibility auditor with actionable reports and to-do lists')
    .version(pkg.version)
    .argument('<url>', 'URL to audit')
    .option('-l, --level <level>', 'WCAG conformance level: A, AA, or AAA', 'AA')
    .option('-f, --format <format>', 'Output format: json, html, or md', 'json')
    .option('-o, --output <path>', 'Output file path')
    .option('-t, --timeout <ms>', 'Page load timeout in milliseconds', '30000')
    .option('-v, --verbose', 'Enable verbose logging', false)
    .option('--no-color', 'Disable colored output')
    .action(runCommand);

  return program;
}

/**
 * Main command action
 * @param {string} url - URL to audit
 * @param {Object} options - Command options
 */
async function runCommand(url, options) {
  const spinner = ora({ isSilent: options.verbose });

  try {
    // Set verbose mode
    logger.setVerbose(options.verbose);

    // Validate inputs
    const urlResult = validateUrl(url);
    if (!urlResult.valid) {
      logger.error(urlResult.error);
      process.exit(EXIT_CODES.INVALID_INPUT);
    }

    const levelResult = validateLevel(options.level);
    if (!levelResult.valid) {
      logger.error(levelResult.error);
      process.exit(EXIT_CODES.INVALID_INPUT);
    }

    const formatResult = validateFormat(options.format);
    if (!formatResult.valid) {
      logger.error(formatResult.error);
      process.exit(EXIT_CODES.INVALID_INPUT);
    }

    const timeoutResult = validateTimeout(options.timeout);
    if (!timeoutResult.valid) {
      logger.error(timeoutResult.error);
      process.exit(EXIT_CODES.INVALID_INPUT);
    }

    // Determine output path
    const outputPath = options.output || getDefaultFilename(url, formatResult.format);
    const absoluteOutputPath = resolve(outputPath);

    // Start audit
    logger.newline();
    spinner.start(`Auditing ${urlResult.url.href} for WCAG ${levelResult.level} compliance...`);

    const auditResult = await runAudit(urlResult.url.href, {
      level: levelResult.level,
      timeout: timeoutResult.timeout,
      verbose: options.verbose
    });

    spinner.stop();

    // Handle auth required
    if (auditResult.requiresAuth) {
      logger.error('This URL is not processable - authentication required');
      logger.plain(`  Reason: ${auditResult.authReason}`);
      await shutdown();
      process.exit(EXIT_CODES.AUTH_REQUIRED);
    }

    // Handle other failures
    if (!auditResult.success) {
      logger.error(`Audit failed: ${auditResult.error}`);
      await shutdown();
      process.exit(EXIT_CODES.UNEXPECTED_ERROR);
    }

    // Generate and save report
    spinner.start('Generating report...');
    const saveResult = await saveReport(auditResult, absoluteOutputPath, formatResult.format);
    spinner.stop();

    if (!saveResult.success) {
      logger.error(`Failed to save report: ${saveResult.error}`);
      await shutdown();
      process.exit(EXIT_CODES.UNEXPECTED_ERROR);
    }

    // Print summary
    printSummary(auditResult, absoluteOutputPath);

    // Cleanup
    await shutdown();

    // Exit with appropriate code
    if (auditResult.summary.violations > 0) {
      process.exit(EXIT_CODES.SUCCESS_WITH_VIOLATIONS);
    } else {
      process.exit(EXIT_CODES.SUCCESS_NO_VIOLATIONS);
    }
  } catch (error) {
    spinner.stop();
    logger.error(`Unexpected error: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    await shutdown();
    process.exit(EXIT_CODES.UNEXPECTED_ERROR);
  }
}

/**
 * Prints the audit summary to console
 * @param {Object} auditResult - Audit result
 * @param {string} outputPath - Where report was saved
 */
function printSummary(auditResult, outputPath) {
  const { summary, violations } = auditResult;

  // Score color
  let scoreColor = COLORS.green;
  if (summary.score < 70) scoreColor = COLORS.yellow;
  if (summary.score < 50) scoreColor = COLORS.red;

  // Violations color
  const violationsColor = summary.violations > 0 ? COLORS.red : COLORS.green;

  logger.summary('Audit Complete', [
    { label: 'Score', value: `${summary.score}%`, color: scoreColor },
    { label: 'Violations', value: summary.violations.toString(), color: violationsColor },
    { label: 'Needs Review', value: summary.incomplete.toString(), color: COLORS.yellow },
    { label: 'Passed', value: summary.passes.toString(), color: COLORS.green }
  ]);

  // Show top to-do items if there are violations
  if (violations.length > 0) {
    const todoList = buildTodoList(violations);
    const topItems = todoList.slice(0, 5);

    logger.plain(`${COLORS.cyan}Top priorities:${COLORS.reset}`);
    for (const item of topItems) {
      const icon = item.category === 'critical' ? '🔴' :
                   item.category === 'high' ? '🟠' :
                   item.category === 'medium' ? '🟡' : '🟢';
      logger.plain(`  ${icon} ${item.task}`);
    }

    if (todoList.length > 5) {
      logger.plain(`  ${COLORS.gray}...and ${todoList.length - 5} more items${COLORS.reset}`);
    }
    logger.newline();
  }

  logger.success(`Report saved to: ${outputPath}`);
}

/**
 * Runs the CLI
 */
export async function run() {
  const program = createProgram();
  await program.parseAsync(process.argv);
}
