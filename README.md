# a11y-audit

A command-line accessibility auditor that checks web pages against WCAG 2.1 standards, generates comprehensive reports, and produces prioritized to-do lists for remediation.

## Features

- **WCAG 2.1 Compliance Testing** - Test against Level A, AA, or AAA
- **Multiple Output Formats** - JSON, HTML, and Markdown reports
- **Prioritized To-Do Lists** - Actionable remediation tasks sorted by impact
- **Auth Detection** - Automatically detects login walls and protected pages
- **CI/CD Ready** - Exit codes for automation pipelines

## Installation

```bash
# Clone and install
git clone <repository>
cd a11y-audit
npm install

# Install Playwright browsers (required)
npx playwright install chromium
```

## Quick Start

```bash
# Basic audit (defaults to WCAG AA, JSON output)
npm start -- https://example.com

# Or if installed globally
a11y-audit https://example.com
```

## Usage

```
a11y-audit <url> [options]

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

### Basic Audit

```bash
# Audit with default settings (AA level, JSON output)
a11y-audit https://example.com
```

### Different WCAG Levels

```bash
# Test only Level A criteria
a11y-audit https://example.com --level A

# Test up to Level AAA
a11y-audit https://example.com --level AAA
```

### Output Formats

```bash
# Generate HTML report
a11y-audit https://example.com --format html

# Generate Markdown report
a11y-audit https://example.com --format md

# Custom output path
a11y-audit https://example.com -f html -o ./reports/audit.html
```

### Verbose Mode

```bash
# See detailed progress
a11y-audit https://example.com --verbose
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success - no violations found |
| 1 | Success - violations found |
| 2 | URL requires authentication |
| 3 | Invalid input (URL, options) |
| 4 | Unexpected error |

### CI/CD Integration

```bash
# In your CI pipeline
a11y-audit https://staging.example.com --format json -o report.json

# Check exit code
if [ $? -eq 1 ]; then
  echo "Accessibility violations found!"
  # Upload report as artifact, notify team, etc.
fi
```

## Report Contents

### Summary

- **Score**: Overall accessibility score (0-100%)
- **Violations**: Number of failed checks
- **Needs Review**: Items requiring manual verification
- **Passed**: Number of passing checks

### To-Do List

Each item includes:
- **Priority**: Ranked by impact and effort
- **Task**: Clear remediation action
- **WCAG Criteria**: Related success criteria
- **Affected Elements**: Count of impacted DOM nodes
- **Effort Estimate**: Low / Medium / High

### Violation Details

- Rule ID and description
- Impact level (critical, serious, moderate, minor)
- WCAG success criteria
- Affected elements with selectors and HTML
- Links to documentation

## WCAG Level Coverage

| Level | Description | Criteria |
|-------|-------------|----------|
| **A** | Minimum accessibility | ~30 criteria |
| **AA** | Standard compliance (recommended) | ~50 criteria |
| **AAA** | Enhanced accessibility | ~78 criteria |

## Programmatic Usage

```javascript
import { runAudit, shutdown } from './src/core/orchestrator.js';
import { generateReport } from './src/reporting/generator.js';
import { buildTodoList } from './src/todo/builder.js';

async function audit() {
  const result = await runAudit('https://example.com', {
    level: 'AA',
    timeout: 30000
  });

  if (result.success) {
    const todoList = buildTodoList(result.violations);
    console.log('To-do items:', todoList.length);

    const htmlReport = generateReport(result, 'html');
    // Save or process report...
  }

  await shutdown();
}

audit();
```

## Development

### Project Structure

```
a11y-audit/
├── src/
│   ├── index.js              # CLI entry point
│   ├── cli.js                # Command definitions
│   ├── core/
│   │   ├── orchestrator.js   # Flow coordination
│   │   ├── renderer.js       # Playwright page loading
│   │   ├── analyzer.js       # axe-core integration
│   │   └── auth-detector.js  # Login detection
│   ├── reporting/
│   │   ├── generator.js      # Report dispatcher
│   │   ├── json-formatter.js
│   │   ├── html-formatter.js
│   │   └── md-formatter.js
│   ├── todo/
│   │   └── builder.js        # To-do list generation
│   └── utils/
│       ├── logger.js
│       └── validators.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── package.json
```

### Running Tests

```bash
# Unit tests
npm test

# With coverage
npm run test:coverage

# Integration tests (requires Playwright)
npm run test:integration

# Watch mode
npm run test:watch
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Limitations

- **JavaScript-rendered content**: Playwright waits for network idle, but highly dynamic SPAs may need longer timeouts
- **Authentication**: Pages requiring login are detected and skipped
- **Automated coverage**: ~50% of WCAG criteria can be fully automated; some require manual review
- **Single page**: Currently audits one URL at a time

## Technology Stack

- **[Playwright](https://playwright.dev/)** - Browser automation
- **[axe-core](https://github.com/dequelabs/axe-core)** - Accessibility testing engine
- **[Commander.js](https://github.com/tj/commander.js/)** - CLI framework
- **[Handlebars](https://handlebarsjs.com/)** - HTML templating
- **[Vitest](https://vitest.dev/)** - Testing framework

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rules](https://dequeuniversity.com/rules/axe/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
