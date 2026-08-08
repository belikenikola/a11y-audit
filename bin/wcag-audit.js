#!/usr/bin/env node

/**
 * wcag-audit — WCAG 2.1 Accessibility Auditor
 *
 * CLI entry point. Library API is exposed at the package root —
 * `import { runAudit, generateReport } from '@belikenikola/wcag-audit'`.
 *
 * Usage:
 *   wcag-audit <url> [options]
 *
 * Options:
 *   -l, --level <level>   WCAG level: A, AA, or AAA (default: AA)
 *   -f, --format <format> Output format: json, html, md (default: json)
 *   -o, --output <path>   Output file path
 *   -t, --timeout <ms>    Page load timeout (default: 30000)
 *   -v, --verbose         Enable verbose logging
 *   --help                Show help
 *   --version             Show version
 *
 * Exit codes:
 *   0  No violations found
 *   1  Violations found
 *   2  Authentication required (page not auditable)
 *   3  Invalid input (URL, level, format, or timeout)
 *   4  Unexpected error
 *
 * Examples:
 *   wcag-audit https://example.com
 *   wcag-audit https://example.com -l AAA -f html -o report.html
 */

import { run } from '../src/cli.js';

run();
