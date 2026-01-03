/**
 * HTML Formatter - Outputs audit results as styled HTML report
 */

import Handlebars from 'handlebars';
import { buildTodoList, groupTodosByCategory, calculateEffortSummary } from '../todo/builder.js';

// Register Handlebars helpers
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('gt', (a, b) => a > b);
Handlebars.registerHelper('impactClass', (impact) => {
  const classes = {
    critical: 'impact-critical',
    serious: 'impact-serious',
    moderate: 'impact-moderate',
    minor: 'impact-minor'
  };
  return classes[impact] || 'impact-moderate';
});
Handlebars.registerHelper('categoryIcon', (category) => {
  const icons = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢'
  };
  return icons[category] || '⚪';
});
Handlebars.registerHelper('effortBadge', (effort) => {
  const badges = {
    low: '<span class="effort-badge effort-low">Low effort</span>',
    medium: '<span class="effort-badge effort-medium">Medium effort</span>',
    high: '<span class="effort-badge effort-high">High effort</span>'
  };
  return new Handlebars.SafeString(badges[effort] || '');
});
Handlebars.registerHelper('truncate', (str, len) => {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
});
Handlebars.registerHelper('formatDate', (isoString) => {
  return new Date(isoString).toLocaleString();
});
Handlebars.registerHelper('scoreColor', (score) => {
  if (score >= 90) return '#22c55e';
  if (score >= 70) return '#eab308';
  if (score >= 50) return '#f97316';
  return '#ef4444';
});

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Audit Report - {{url}}</title>
  <style>
    :root {
      --color-critical: #ef4444;
      --color-serious: #f97316;
      --color-moderate: #eab308;
      --color-minor: #22c55e;
      --color-bg: #f8fafc;
      --color-card: #ffffff;
      --color-border: #e2e8f0;
      --color-text: #1e293b;
      --color-text-muted: #64748b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--color-bg);
      color: var(--color-text);
      line-height: 1.6;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
    }
    header h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    header .url { color: #94a3b8; word-break: break-all; }
    header .meta { display: flex; gap: 2rem; margin-top: 1rem; font-size: 0.875rem; color: #94a3b8; }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .summary-card {
      background: var(--color-card);
      border-radius: 8px;
      padding: 1.5rem;
      border: 1px solid var(--color-border);
    }
    .summary-card h3 { font-size: 0.875rem; color: var(--color-text-muted); margin-bottom: 0.5rem; }
    .summary-card .value { font-size: 2rem; font-weight: 700; }
    .summary-card.score .value { color: {{scoreColor summary.score}}; }
    .summary-card.violations .value { color: var(--color-critical); }
    .summary-card.incomplete .value { color: var(--color-moderate); }
    .summary-card.passes .value { color: var(--color-minor); }
    
    .section {
      background: var(--color-card);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid var(--color-border);
    }
    .section h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--color-border);
    }
    
    .todo-list { list-style: none; }
    .todo-item {
      padding: 1rem;
      border-bottom: 1px solid var(--color-border);
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 1rem;
      align-items: start;
    }
    .todo-item:last-child { border-bottom: none; }
    .todo-priority {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.875rem;
      background: #f1f5f9;
    }
    .todo-content h4 { margin-bottom: 0.25rem; }
    .todo-content .wcag { font-size: 0.875rem; color: var(--color-text-muted); }
    .todo-content .selectors { font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.5rem; font-family: monospace; }
    .effort-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-weight: 500;
    }
    .effort-low { background: #dcfce7; color: #166534; }
    .effort-medium { background: #fef9c3; color: #854d0e; }
    .effort-high { background: #fee2e2; color: #991b1b; }
    
    .violation-list { list-style: none; }
    .violation-item {
      padding: 1rem;
      border-bottom: 1px solid var(--color-border);
    }
    .violation-item:last-child { border-bottom: none; }
    .violation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .violation-header h4 { display: flex; align-items: center; gap: 0.5rem; }
    .impact-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-weight: 500;
      text-transform: uppercase;
    }
    .impact-critical { background: #fee2e2; color: #991b1b; }
    .impact-serious { background: #ffedd5; color: #9a3412; }
    .impact-moderate { background: #fef9c3; color: #854d0e; }
    .impact-minor { background: #dcfce7; color: #166534; }
    .violation-description { color: var(--color-text-muted); margin-bottom: 0.5rem; }
    .violation-nodes { font-size: 0.875rem; }
    .violation-node {
      background: #f1f5f9;
      padding: 0.5rem;
      border-radius: 4px;
      margin-top: 0.5rem;
      font-family: monospace;
      font-size: 0.75rem;
      overflow-x: auto;
    }
    .violation-help { font-size: 0.875rem; margin-top: 0.5rem; }
    .violation-help a { color: #2563eb; }
    
    .error-box {
      background: #fee2e2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 1.5rem;
      border-radius: 8px;
    }
    .error-box h2 { color: #991b1b; margin-bottom: 0.5rem; }
    
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--color-text-muted);
    }
    .empty-state .icon { font-size: 3rem; margin-bottom: 1rem; }
    
    footer {
      text-align: center;
      padding: 2rem;
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Accessibility Audit Report</h1>
      <div class="url">{{url}}</div>
      <div class="meta">
        <span>📅 {{formatDate timestamp}}</span>
        <span>🎯 WCAG {{level}}</span>
        {{#if metadata.testEngine}}
        <span>🔧 {{metadata.testEngine.name}} v{{metadata.testEngine.version}}</span>
        {{/if}}
      </div>
    </header>

    {{#if success}}
    <div class="summary-grid">
      <div class="summary-card score">
        <h3>Accessibility Score</h3>
        <div class="value">{{summary.score}}%</div>
      </div>
      <div class="summary-card violations">
        <h3>Violations</h3>
        <div class="value">{{summary.violations}}</div>
      </div>
      <div class="summary-card incomplete">
        <h3>Needs Review</h3>
        <div class="value">{{summary.incomplete}}</div>
      </div>
      <div class="summary-card passes">
        <h3>Passed</h3>
        <div class="value">{{summary.passes}}</div>
      </div>
    </div>

    {{#if todoList.length}}
    <section>
      <h2>📋 To-Do List ({{todoList.length}} items)</h2>
      <ul class="todo-list">
        {{#each todoList}}
        <li class="todo-item">
          <div class="todo-priority">{{priority}}</div>
          <div class="todo-content">
            <h4>{{categoryIcon category}} {{task}}</h4>
            <div class="wcag">WCAG {{wcagLevel}} · {{#each wcag}}{{this}}{{#unless @last}}, {{/unless}}{{/each}} · {{wcagDescription}}</div>
            {{#if selectors.length}}
            <div class="selectors">{{#each selectors}}{{this}}{{#unless @last}} | {{/unless}}{{/each}}</div>
            {{/if}}
          </div>
          <div>{{{effortBadge effort}}}</div>
        </li>
        {{/each}}
      </ul>
    </section>
    {{/if}}

    {{#if violations.length}}
    <section>
      <h2>🚨 Violations ({{violations.length}})</h2>
      <ul class="violation-list">
        {{#each violations}}
        <li class="violation-item">
          <div class="violation-header">
            <h4>
              <span class="impact-badge {{impactClass impact}}">{{impact}}</span>
              {{id}}
            </h4>
            <span>{{nodes.length}} element{{#if (gt nodes.length 1)}}s{{/if}}</span>
          </div>
          <p class="violation-description">{{description}}</p>
          <div class="violation-nodes">
            <strong>Affected elements:</strong>
            {{#each nodes}}
            <div class="violation-node">
              <div><strong>Selector:</strong> {{selector}}</div>
              <div><strong>HTML:</strong> {{truncate html 150}}</div>
            </div>
            {{/each}}
          </div>
          <div class="violation-help">
            📖 <a href="{{helpUrl}}" target="_blank" rel="noopener">Learn how to fix this</a>
          </div>
        </li>
        {{/each}}
      </ul>
    </section>
    {{/if}}

    {{#if incomplete.length}}
    <section>
      <h2>⚠️ Needs Manual Review ({{incomplete.length}})</h2>
      <ul class="violation-list">
        {{#each incomplete}}
        <li class="violation-item">
          <div class="violation-header">
            <h4>{{id}}</h4>
            <span>{{nodes.length}} element{{#if (gt nodes.length 1)}}s{{/if}}</span>
          </div>
          <p class="violation-description">{{description}}</p>
          <div class="violation-help">
            📖 <a href="{{helpUrl}}" target="_blank" rel="noopener">Learn more</a>
          </div>
        </li>
        {{/each}}
      </ul>
    </section>
    {{/if}}

    {{#unless violations.length}}
    {{#unless incomplete.length}}
    <section>
      <div class="empty-state">
        <div class="icon">🎉</div>
        <h3>Great job!</h3>
        <p>No accessibility violations detected at WCAG {{level}} level.</p>
      </div>
    </section>
    {{/unless}}
    {{/unless}}

    {{else}}
    <div class="error-box">
      <h2>❌ Audit Failed</h2>
      <p>{{error}}</p>
      {{#if requiresAuth}}
      <p><strong>Reason:</strong> {{authReason}}</p>
      {{/if}}
    </div>
    {{/if}}

    <footer>
      Generated by a11y-audit · WCAG 2.1 Accessibility Auditor
    </footer>
  </div>
</body>
</html>`;

/**
 * Formats audit result as HTML
 * @param {Object} auditResult - Raw audit result from orchestrator
 * @returns {string} Formatted HTML string
 */
export function formatHtml(auditResult) {
  const template = Handlebars.compile(HTML_TEMPLATE);

  let data = {
    ...auditResult,
    todoList: []
  };

  if (auditResult.success && auditResult.violations) {
    data.todoList = buildTodoList(auditResult.violations);
  }

  return template(data);
}
