#!/usr/bin/env node

/**
 * a11y-audit - WCAG 2.1 Accessibility Auditor
 *
 * CLI tool for auditing web pages against WCAG 2.1 standards
 * Generates comprehensive reports and prioritized to-do lists
 *
 * Usage:
 *   a11y-audit <url> [options]
 *
 * Options:
 *   -l, --level <level>   WCAG level: A, AA, or AAA (default: AA)
 *   -f, --format <format> Output format: json, html, md (default: json)
 *   -o, --output <path>   Output file path
 *   -t, --timeout <ms>    Page load timeout (default: 30000)
 *   -v, --verbose         Enable verbose logging
 *   --help               Show help
 *   --version            Show version
 *
 * Examples:
 *   a11y-audit https://example.com
 *   a11y-audit https://example.com -l AAA -f html -o report.html
 */

import { run } from './cli.js';

// Run the CLI
run();
