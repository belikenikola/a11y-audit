# wcag-audit

[![npm](https://img.shields.io/npm/v/@belikenikola/wcag-audit.svg)](https://www.npmjs.com/package/@belikenikola/wcag-audit)

A WCAG 2.1 accessibility auditor — **CLI and library**. Checks web pages against WCAG 2.1 (A/AA/AAA), generates JSON/HTML/Markdown reports, and produces prioritized to-do lists for remediation. Powered by [axe-core](https://github.com/dequelabs/axe-core) and [Playwright](https://playwright.dev/).

## Features

- **WCAG 2.1 Compliance Testing** — Test against Level A, AA, or AAA
- **Multiple Output Formats** — JSON, HTML, and Markdown reports
- **Prioritized To-Do Lists** — Actionable remediation tasks sorted by impact
- **Auth Detection** — Automatically detects login walls and protected pages
- **CI/CD Ready** — Exit codes for automation pipelines
- **Library API** — Import `runAudit`/`generateReport` into your own tooling, with a pluggable browser launcher for serverless

## Installation

```bash
npm install -g @belikenikola/wcag-audit

# Playwright's Chromium is required at runtime (one-time, ~150–300MB)
npx playwright install chromium
```

Or run without installing:

```bash
npx @belikenikola/wcag-audit https://example.com
```

> **Note:** No `postinstall` hook is bundled (that would be user-hostile for a library dependency). Install the Chromium binary yourself once with `npx playwright install chromium`.

## Quick Start

```bash
# Basic audit (defaults to WCAG AA, JSON output)
wcag-audit https://example.com
```

## Usage

```
wcag-audit <url> [options]

Arguments:
  url                  URL to audit

Options:
  -l, --level <level>  WCAG conformance level: A, AA, or AAA (default: "AA")
  -f, --format <fmt>   Output format: json, html, or md (default: "json")
  -o, --output <path>  Output file path (default: auto-generated)
  -t, --timeout <ms>   Page load timeout in milliseconds (default: "30000")
  -v, --verbose        Enable verbose logging (default: false)
  -h, --help           Display help
  --version            Display version
```

## Examples

```bash
# Different WCAG levels
wcag-audit https://example.com --level A
wcag-audit https://example.com --level AAA

# Output formats
wcag-audit https://example.com --format html
wcag-audit https://example.com -f html -o ./reports/audit.html

# Verbose progress
wcag-audit https://example.com --verbose
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success — no violations found |
| 1 | Success — violations found |
| 2 | URL requires authentication |
| 3 | Invalid input (URL, options) |
| 4 | Unexpected error |

### CI/CD Integration

```bash
wcag-audit https://staging.example.com --format json -o report.json

if [ $? -eq 1 ]; then
  echo "Accessibility violations found!"
  # Upload report as artifact, notify team, etc.
fi
```

## Report Contents

**Summary** — accessibility score (0–100%), violation count, items needing manual review, and passing checks.

**To-Do List** — each item includes a priority (ranked by impact and effort), a clear remediation task, related WCAG success criteria, the count of affected DOM nodes, and an effort estimate (Low / Medium / High).

**Violation Details** — rule ID and description, impact level (critical / serious / moderate / minor), WCAG success criteria, affected elements with selectors and HTML, and links to documentation.

## WCAG Level Coverage

| Level | Description | Criteria |
|-------|-------------|----------|
| **A** | Minimum accessibility | ~30 criteria |
| **AA** | Standard compliance (recommended) | ~50 criteria |
| **AAA** | Enhanced accessibility | ~78 criteria |

## Programmatic Usage

The package root exposes the public library API:

```javascript
import { runAudit, generateReport, saveReport, buildTodoList, shutdown } from '@belikenikola/wcag-audit';

const result = await runAudit('https://example.com', { level: 'AA', timeout: 30000 });

if (result.success) {
  const todos = buildTodoList(result.violations);
  console.log('To-do items:', todos.length);

  const html = generateReport(result, 'html');
  await saveReport(result, 'report.html', 'html');
}

await shutdown();
```

### Serverless / custom Chromium

Inject your own browser launcher (e.g. `playwright-core` + `@sparticuz/chromium` on Vercel/Lambda) so you don't have to ship full Playwright:

```javascript
import { setBrowserLauncher, runAudit, shutdown } from '@belikenikola/wcag-audit';
import { chromium } from 'playwright-core';
import chromiumBin from '@sparticuz/chromium';

setBrowserLauncher(async () => chromium.launch({
  args: chromiumBin.args,
  executablePath: await chromiumBin.executablePath(),
  headless: true,
}));

const result = await runAudit('https://example.com');
await shutdown();
```

## Limitations

- **JavaScript-rendered content**: Playwright waits for network idle, but highly dynamic SPAs may need longer timeouts.
- **Authentication**: Pages requiring login are detected and skipped.
- **Automated coverage**: ~50% of WCAG criteria can be fully automated; some require manual review.
- **Single page**: Currently audits one URL at a time.

## Technology Stack

- **[Playwright](https://playwright.dev/)** — Browser automation
- **[axe-core](https://github.com/dequelabs/axe-core)** — Accessibility testing engine
- **[Commander.js](https://github.com/tj/commander.js/)** — CLI framework
- **[Handlebars](https://handlebarsjs.com/)** — HTML templating
- **[Vitest](https://vitest.dev/)** — Testing framework

## Development

```bash
git clone https://github.com/belikenikola/a11y-audit.git
cd a11y-audit
npm install
npx playwright install chromium

npm test                  # unit tests
npm run test:coverage     # with coverage
npm run test:integration  # integration tests (requires Playwright)
npm run lint
```

## License

MIT — see [LICENSE](./LICENSE).

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rules](https://dequeuniversity.com/rules/axe/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
