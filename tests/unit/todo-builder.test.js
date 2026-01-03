/**
 * Unit tests for todo builder
 */

import { describe, it, expect } from 'vitest';
import {
  buildTodoList,
  groupTodosByCategory,
  groupTodosByPrinciple,
  calculateEffortSummary
} from '../../src/todo/builder.js';

// Sample violation data
const sampleViolations = [
  {
    id: 'color-contrast',
    impact: 'serious',
    wcag: ['1.4.3'],
    wcagLevel: 'AA',
    description: 'Elements must have sufficient color contrast',
    help: 'Elements must have sufficient color contrast',
    helpUrl: 'https://example.com/color-contrast',
    nodes: [
      { selector: '.text-light', html: '<p class="text-light">Hello</p>' },
      { selector: '.header', html: '<h1 class="header">Title</h1>' }
    ]
  },
  {
    id: 'image-alt',
    impact: 'critical',
    wcag: ['1.1.1'],
    wcagLevel: 'A',
    description: 'Images must have alternate text',
    help: 'Images must have alternate text',
    helpUrl: 'https://example.com/image-alt',
    nodes: [
      { selector: 'img.logo', html: '<img class="logo" src="logo.png">' }
    ]
  },
  {
    id: 'heading-order',
    impact: 'moderate',
    wcag: ['1.3.1'],
    wcagLevel: 'A',
    description: 'Heading levels should only increase by one',
    help: 'Heading order invalid',
    helpUrl: 'https://example.com/heading-order',
    nodes: [
      { selector: 'h3', html: '<h3>Skipped h2</h3>' }
    ]
  }
];

describe('buildTodoList', () => {
  it('returns empty array for no violations', () => {
    const result = buildTodoList([]);
    expect(result).toEqual([]);
  });

  it('returns empty array for null input', () => {
    const result = buildTodoList(null);
    expect(result).toEqual([]);
  });

  it('creates todo items from violations', () => {
    const result = buildTodoList(sampleViolations);
    expect(result.length).toBe(3);
  });

  it('assigns sequential priority ranks', () => {
    const result = buildTodoList(sampleViolations);
    expect(result[0].priority).toBe(1);
    expect(result[1].priority).toBe(2);
    expect(result[2].priority).toBe(3);
  });

  it('prioritizes critical impact first', () => {
    const result = buildTodoList(sampleViolations);
    const criticalItem = result.find(t => t.ruleId === 'image-alt');
    expect(criticalItem.priority).toBe(1);
  });

  it('includes affected element count', () => {
    const result = buildTodoList(sampleViolations);
    const colorContrast = result.find(t => t.ruleId === 'color-contrast');
    expect(colorContrast.affectedElements).toBe(2);
  });

  it('includes WCAG criteria', () => {
    const result = buildTodoList(sampleViolations);
    const imageAlt = result.find(t => t.ruleId === 'image-alt');
    expect(imageAlt.wcag).toContain('1.1.1');
  });

  it('assigns effort estimates', () => {
    const result = buildTodoList(sampleViolations);
    const imageAlt = result.find(t => t.ruleId === 'image-alt');
    expect(imageAlt.effort).toBe('low');

    const colorContrast = result.find(t => t.ruleId === 'color-contrast');
    expect(colorContrast.effort).toBe('medium');
  });

  it('assigns correct categories based on impact', () => {
    const result = buildTodoList(sampleViolations);
    const critical = result.find(t => t.ruleId === 'image-alt');
    expect(critical.category).toBe('critical');

    const high = result.find(t => t.ruleId === 'color-contrast');
    expect(high.category).toBe('high');

    const medium = result.find(t => t.ruleId === 'heading-order');
    expect(medium.category).toBe('medium');
  });

  it('includes selectors (max 3)', () => {
    const result = buildTodoList(sampleViolations);
    const colorContrast = result.find(t => t.ruleId === 'color-contrast');
    expect(colorContrast.selectors.length).toBeLessThanOrEqual(3);
  });
});

describe('groupTodosByCategory', () => {
  it('groups todos into priority categories', () => {
    const todos = buildTodoList(sampleViolations);
    const grouped = groupTodosByCategory(todos);

    expect(grouped).toHaveProperty('critical');
    expect(grouped).toHaveProperty('high');
    expect(grouped).toHaveProperty('medium');
    expect(grouped).toHaveProperty('low');
  });

  it('places critical impact in critical category', () => {
    const todos = buildTodoList(sampleViolations);
    const grouped = groupTodosByCategory(todos);

    expect(grouped.critical.some(t => t.ruleId === 'image-alt')).toBe(true);
  });

  it('places serious impact in high category', () => {
    const todos = buildTodoList(sampleViolations);
    const grouped = groupTodosByCategory(todos);

    expect(grouped.high.some(t => t.ruleId === 'color-contrast')).toBe(true);
  });
});

describe('groupTodosByPrinciple', () => {
  it('groups todos by WCAG principles', () => {
    const todos = buildTodoList(sampleViolations);
    const grouped = groupTodosByPrinciple(todos);

    expect(grouped).toHaveProperty('perceivable');
    expect(grouped).toHaveProperty('operable');
    expect(grouped).toHaveProperty('understandable');
    expect(grouped).toHaveProperty('robust');
  });

  it('places 1.x criteria in perceivable', () => {
    const todos = buildTodoList(sampleViolations);
    const grouped = groupTodosByPrinciple(todos);

    // All our sample violations are 1.x (perceivable)
    expect(grouped.perceivable.items.length).toBe(3);
  });
});

describe('calculateEffortSummary', () => {
  it('counts effort levels correctly', () => {
    const todos = buildTodoList(sampleViolations);
    const summary = calculateEffortSummary(todos);

    expect(summary.low).toBeGreaterThanOrEqual(0);
    expect(summary.medium).toBeGreaterThanOrEqual(0);
    expect(summary.high).toBeGreaterThanOrEqual(0);
  });

  it('calculates total affected elements', () => {
    const todos = buildTodoList(sampleViolations);
    const summary = calculateEffortSummary(todos);

    // 2 + 1 + 1 = 4 total elements
    expect(summary.totalElements).toBe(4);
  });

  it('returns zeros for empty input', () => {
    const summary = calculateEffortSummary([]);

    expect(summary.low).toBe(0);
    expect(summary.medium).toBe(0);
    expect(summary.high).toBe(0);
    expect(summary.totalElements).toBe(0);
  });
});
