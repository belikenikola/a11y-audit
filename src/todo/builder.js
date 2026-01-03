/**
 * Todo Builder - Generates prioritized remediation to-do lists
 * Converts violations into actionable, prioritized tasks
 */

import { getWcagDescription, IMPACT_ORDER } from '../core/analyzer.js';

/**
 * Effort estimation based on violation type
 */
const EFFORT_MAP = {
  // Low effort - usually quick fixes
  'image-alt': 'low',
  'html-has-lang': 'low',
  'document-title': 'low',
  'meta-viewport': 'low',
  'html-lang-valid': 'low',
  'duplicate-id': 'low',
  'link-name': 'low',
  'button-name': 'low',
  'label': 'low',
  'input-image-alt': 'low',
  'area-alt': 'low',
  'object-alt': 'low',
  'frame-title': 'low',
  'video-caption': 'low',
  'audio-caption': 'low',

  // Medium effort - require more thought
  'color-contrast': 'medium',
  'form-field-multiple-labels': 'medium',
  'select-name': 'medium',
  'heading-order': 'medium',
  'list': 'medium',
  'listitem': 'medium',
  'definition-list': 'medium',
  'dlitem': 'medium',
  'table-duplicate-name': 'medium',
  'td-headers-attr': 'medium',
  'th-has-data-cells': 'medium',
  'valid-lang': 'medium',
  'tabindex': 'medium',
  'aria-allowed-attr': 'medium',
  'aria-hidden-body': 'medium',
  'aria-hidden-focus': 'medium',
  'aria-required-attr': 'medium',
  'aria-required-children': 'medium',
  'aria-required-parent': 'medium',
  'aria-roles': 'medium',
  'aria-valid-attr-value': 'medium',
  'aria-valid-attr': 'medium',

  // High effort - complex fixes
  'bypass': 'high',
  'focus-order-semantics': 'high',
  'landmark-one-main': 'high',
  'page-has-heading-one': 'high',
  'region': 'high',
  'skip-link': 'high',
  'accesskeys': 'high',
  'css-orientation-lock': 'high',
  'focus-trap': 'high',
  'scrollable-region-focusable': 'high'
};

/**
 * Priority weights for scoring
 */
const IMPACT_PRIORITY = {
  critical: 1,
  serious: 2,
  moderate: 3,
  minor: 4
};

const LEVEL_PRIORITY = {
  A: 1,
  AA: 2,
  AAA: 3
};

/**
 * @typedef {Object} TodoItem
 * @property {number} priority - Priority rank (1 = highest)
 * @property {string} category - Priority category (critical/high/medium/low)
 * @property {string} task - Task description
 * @property {string} ruleId - axe-core rule ID
 * @property {string[]} wcag - Related WCAG criteria
 * @property {string} wcagDescription - Human-readable WCAG description
 * @property {string} wcagLevel - WCAG conformance level
 * @property {number} affectedElements - Number of affected elements
 * @property {string} effort - Estimated effort (low/medium/high)
 * @property {string} helpUrl - Link to documentation
 * @property {string[]} selectors - Sample affected selectors
 */

/**
 * Builds a prioritized to-do list from audit violations
 * @param {Object[]} violations - Array of violations from analyzer
 * @returns {TodoItem[]} Prioritized to-do list
 */
export function buildTodoList(violations) {
  if (!violations || violations.length === 0) {
    return [];
  }

  const todos = violations.map(violation => createTodoItem(violation));

  // Sort by priority score
  todos.sort((a, b) => {
    // Primary: priority rank
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // Secondary: affected elements (more = higher priority)
    if (a.affectedElements !== b.affectedElements) {
      return b.affectedElements - a.affectedElements;
    }
    // Tertiary: effort (lower effort = do first)
    const effortOrder = { low: 1, medium: 2, high: 3 };
    return effortOrder[a.effort] - effortOrder[b.effort];
  });

  // Assign final priority ranks
  return todos.map((todo, index) => ({
    ...todo,
    priority: index + 1
  }));
}

/**
 * Creates a single todo item from a violation
 * @param {Object} violation - Single violation object
 * @returns {TodoItem}
 */
function createTodoItem(violation) {
  const wcagCriteria = violation.wcag || [];
  const wcagDescriptions = wcagCriteria
    .map(c => getWcagDescription(c))
    .filter(d => d !== 'Unknown criterion');

  const effort = EFFORT_MAP[violation.id] || 'medium';
  const affectedCount = violation.nodes?.length || 0;

  // Calculate priority score
  const impactScore = IMPACT_PRIORITY[violation.impact] || 3;
  const levelScore = LEVEL_PRIORITY[violation.wcagLevel] || 2;
  const priorityScore = impactScore + levelScore;

  // Determine category
  let category;
  if (violation.impact === 'critical') {
    category = 'critical';
  } else if (violation.impact === 'serious') {
    category = 'high';
  } else if (violation.impact === 'moderate') {
    category = 'medium';
  } else {
    category = 'low';
  }

  // Generate task description
  const task = generateTaskDescription(violation, affectedCount);

  // Get sample selectors (max 3)
  const selectors = violation.nodes
    ?.slice(0, 3)
    .map(n => n.selector)
    .filter(Boolean) || [];

  return {
    priority: priorityScore, // Will be overwritten with rank
    category,
    task,
    ruleId: violation.id,
    wcag: wcagCriteria,
    wcagDescription: wcagDescriptions.join(', ') || violation.help,
    wcagLevel: violation.wcagLevel || 'A',
    affectedElements: affectedCount,
    effort,
    helpUrl: violation.helpUrl,
    selectors
  };
}

/**
 * Generates a human-readable task description
 * @param {Object} violation - Violation object
 * @param {number} count - Number of affected elements
 * @returns {string}
 */
function generateTaskDescription(violation, count) {
  const countText = count === 1 ? '1 element' : `${count} elements`;

  // Custom task descriptions for common violations
  const taskTemplates = {
    'image-alt': `Add descriptive alt text to ${countText} (images)`,
    'color-contrast': `Fix color contrast ratio on ${countText}`,
    'html-has-lang': 'Add lang attribute to <html> element',
    'document-title': 'Add a descriptive <title> to the page',
    'link-name': `Add accessible names to ${countText} (links)`,
    'button-name': `Add accessible names to ${countText} (buttons)`,
    'label': `Associate labels with ${countText} (form inputs)`,
    'heading-order': `Fix heading hierarchy (${countText} affected)`,
    'bypass': 'Add skip navigation link or landmarks',
    'landmark-one-main': 'Add a <main> landmark to the page',
    'region': `Wrap ${countText} in landmark regions`,
    'aria-hidden-focus': `Remove focus from aria-hidden ${countText}`,
    'duplicate-id': `Fix duplicate IDs on ${countText}`,
    'tabindex': `Review tabindex values on ${countText}`,
    'focus-visible': `Ensure focus indicators are visible on ${countText}`,
    'meta-viewport': 'Allow users to zoom by fixing viewport meta'
  };

  if (taskTemplates[violation.id]) {
    return taskTemplates[violation.id];
  }

  // Default: use the violation help text
  return `${violation.help} (${countText} affected)`;
}

/**
 * Groups todo items by category
 * @param {TodoItem[]} todos - Array of todo items
 * @returns {Object} Grouped todos
 */
export function groupTodosByCategory(todos) {
  const groups = {
    critical: [],
    high: [],
    medium: [],
    low: []
  };

  for (const todo of todos) {
    if (groups[todo.category]) {
      groups[todo.category].push(todo);
    }
  }

  return groups;
}

/**
 * Groups todo items by WCAG principle
 * @param {TodoItem[]} todos - Array of todo items
 * @returns {Object} Grouped todos
 */
export function groupTodosByPrinciple(todos) {
  const principles = {
    perceivable: { name: 'Perceivable', prefix: '1.', items: [] },
    operable: { name: 'Operable', prefix: '2.', items: [] },
    understandable: { name: 'Understandable', prefix: '3.', items: [] },
    robust: { name: 'Robust', prefix: '4.', items: [] }
  };

  for (const todo of todos) {
    const criterion = todo.wcag[0];
    if (!criterion) continue;

    if (criterion.startsWith('1.')) {
      principles.perceivable.items.push(todo);
    } else if (criterion.startsWith('2.')) {
      principles.operable.items.push(todo);
    } else if (criterion.startsWith('3.')) {
      principles.understandable.items.push(todo);
    } else if (criterion.startsWith('4.')) {
      principles.robust.items.push(todo);
    }
  }

  return principles;
}

/**
 * Calculates total effort summary
 * @param {TodoItem[]} todos - Array of todo items
 * @returns {Object} Effort summary
 */
export function calculateEffortSummary(todos) {
  const summary = {
    low: 0,
    medium: 0,
    high: 0,
    totalElements: 0
  };

  for (const todo of todos) {
    summary[todo.effort]++;
    summary.totalElements += todo.affectedElements;
  }

  return summary;
}

export { EFFORT_MAP, IMPACT_PRIORITY };
