/**
 * JSON Formatter - Outputs audit results as formatted JSON
 */

import { buildTodoList, calculateEffortSummary } from '../todo/builder.js';

/**
 * Formats audit result as JSON
 * @param {Object} auditResult - Raw audit result from orchestrator
 * @returns {string} Formatted JSON string
 */
export function formatJson(auditResult) {
  const report = buildReport(auditResult);
  return JSON.stringify(report, null, 2);
}

/**
 * Builds the full report object
 * @param {Object} auditResult - Raw audit result
 * @returns {Object} Complete report object
 */
export function buildReport(auditResult) {
  if (!auditResult.success) {
    return {
      success: false,
      url: auditResult.url,
      timestamp: auditResult.timestamp,
      level: auditResult.level,
      error: auditResult.error,
      requiresAuth: auditResult.requiresAuth || false,
      authReason: auditResult.authReason
    };
  }

  const todoList = buildTodoList(auditResult.violations);
  const effortSummary = calculateEffortSummary(todoList);

  return {
    success: true,
    url: auditResult.url,
    timestamp: auditResult.timestamp,
    level: auditResult.level,
    summary: {
      ...auditResult.summary,
      effortBreakdown: effortSummary
    },
    violations: auditResult.violations,
    incomplete: auditResult.incomplete,
    passes: auditResult.passes.map(p => ({
      id: p.id,
      description: p.description
    })),
    todoList,
    metadata: {
      testEngine: auditResult.testEngine,
      testEnvironment: auditResult.testEnvironment
    }
  };
}
