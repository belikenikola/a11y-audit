/**
 * Markdown Formatter - Outputs audit results as Markdown report
 */

import { buildTodoList, groupTodosByCategory, calculateEffortSummary } from '../todo/builder.js';

/**
 * Formats audit result as Markdown
 * @param {Object} auditResult - Raw audit result from orchestrator
 * @returns {string} Formatted Markdown string
 */
export function formatMarkdown(auditResult) {
  const lines = [];

  // Header
  lines.push('# Accessibility Audit Report');
  lines.push('');
  lines.push(`**URL:** ${auditResult.url}`);
  lines.push(`**Date:** ${formatDate(auditResult.timestamp)}`);
  lines.push(`**WCAG Level:** ${auditResult.level}`);
  lines.push('');

  if (!auditResult.success) {
    lines.push('## ❌ Audit Failed');
    lines.push('');
    lines.push(`**Error:** ${auditResult.error}`);
    if (auditResult.requiresAuth) {
      lines.push(`**Reason:** ${auditResult.authReason}`);
    }
    return lines.join('\n');
  }

  // Summary
  lines.push('---');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| **Score** | ${auditResult.summary.score}% |`);
  lines.push(`| **Violations** | ${auditResult.summary.violations} |`);
  lines.push(`| **Needs Review** | ${auditResult.summary.incomplete} |`);
  lines.push(`| **Passed** | ${auditResult.summary.passes} |`);
  lines.push('');

  // To-Do List
  if (auditResult.violations?.length > 0) {
    const todoList = buildTodoList(auditResult.violations);
    const grouped = groupTodosByCategory(todoList);
    const effortSummary = calculateEffortSummary(todoList);

    lines.push('---');
    lines.push('');
    lines.push('## 📋 To-Do List');
    lines.push('');
    lines.push(`> **${todoList.length} items** to address`);
    lines.push(`> Effort breakdown: ${effortSummary.low} low, ${effortSummary.medium} medium, ${effortSummary.high} high`);
    lines.push('');

    // Critical items
    if (grouped.critical.length > 0) {
      lines.push('### 🔴 Critical Priority');
      lines.push('');
      for (const todo of grouped.critical) {
        lines.push(formatTodoItem(todo));
      }
      lines.push('');
    }

    // High items
    if (grouped.high.length > 0) {
      lines.push('### 🟠 High Priority');
      lines.push('');
      for (const todo of grouped.high) {
        lines.push(formatTodoItem(todo));
      }
      lines.push('');
    }

    // Medium items
    if (grouped.medium.length > 0) {
      lines.push('### 🟡 Medium Priority');
      lines.push('');
      for (const todo of grouped.medium) {
        lines.push(formatTodoItem(todo));
      }
      lines.push('');
    }

    // Low items
    if (grouped.low.length > 0) {
      lines.push('### 🟢 Low Priority');
      lines.push('');
      for (const todo of grouped.low) {
        lines.push(formatTodoItem(todo));
      }
      lines.push('');
    }

    // Violations Detail
    lines.push('---');
    lines.push('');
    lines.push('## 🚨 Violation Details');
    lines.push('');

    for (const violation of auditResult.violations) {
      lines.push(`### ${getImpactEmoji(violation.impact)} ${violation.id}`);
      lines.push('');
      lines.push(`**Impact:** ${violation.impact} | **WCAG:** ${violation.wcag.join(', ')} (Level ${violation.wcagLevel})`);
      lines.push('');
      lines.push(`> ${violation.description}`);
      lines.push('');
      lines.push(`**Affected Elements:** ${violation.nodes.length}`);
      lines.push('');

      // Show first 3 affected elements
      const nodesToShow = violation.nodes.slice(0, 3);
      for (const node of nodesToShow) {
        lines.push('<details>');
        lines.push(`<summary><code>${escapeHtml(node.selector)}</code></summary>`);
        lines.push('');
        lines.push('```html');
        lines.push(node.html);
        lines.push('```');
        lines.push('');
        if (node.failureSummary) {
          lines.push(`**Issue:** ${node.failureSummary}`);
          lines.push('');
        }
        lines.push('</details>');
        lines.push('');
      }

      if (violation.nodes.length > 3) {
        lines.push(`*...and ${violation.nodes.length - 3} more elements*`);
        lines.push('');
      }

      lines.push(`📖 [Learn how to fix this](${violation.helpUrl})`);
      lines.push('');
    }
  }

  // Incomplete (Needs Review)
  if (auditResult.incomplete?.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## ⚠️ Needs Manual Review');
    lines.push('');

    for (const item of auditResult.incomplete) {
      lines.push(`- **${item.id}**: ${item.description} (${item.nodes.length} elements)`);
    }
    lines.push('');
  }

  // Passes
  if (auditResult.passes?.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## ✅ Passed Checks');
    lines.push('');
    lines.push(`<details>`);
    lines.push(`<summary>${auditResult.passes.length} checks passed</summary>`);
    lines.push('');

    for (const pass of auditResult.passes) {
      lines.push(`- **${pass.id}**: ${pass.description}`);
    }

    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`*Generated by a11y-audit · WCAG 2.1 Accessibility Auditor*`);
  if (auditResult.testEngine) {
    lines.push(`*Engine: ${auditResult.testEngine.name} v${auditResult.testEngine.version}*`);
  }

  return lines.join('\n');
}

/**
 * Formats a single to-do item
 */
function formatTodoItem(todo) {
  const effortBadge = {
    low: '`Low effort`',
    medium: '`Medium effort`',
    high: '`High effort`'
  };

  return `- [ ] **#${todo.priority}** ${todo.task}\n  - WCAG ${todo.wcag.join(', ')} · ${effortBadge[todo.effort]} · [Docs](${todo.helpUrl})`;
}

/**
 * Gets emoji for impact level
 */
function getImpactEmoji(impact) {
  const emojis = {
    critical: '🔴',
    serious: '🟠',
    moderate: '🟡',
    minor: '🟢'
  };
  return emojis[impact] || '⚪';
}

/**
 * Formats ISO date string
 */
function formatDate(isoString) {
  return new Date(isoString).toLocaleString();
}

/**
 * Escapes HTML entities
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
