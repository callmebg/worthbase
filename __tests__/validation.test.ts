/// <reference types="jest" />

/**
 * WorthBase (家底) - Validation Utility Tests
 * Tests for isValidNumber, isValidPositiveNumber, and related validators.
 */

import {
  isValidPositiveNumber,
  isValidNonNegativeNumber,
  isValidNumber,
  isValidDate,
  isValidMonth,
  validatePrice,
  validateRequired,
  validateDate,
} from '@/utils/validation';

describe('isValidNumber', () => {
  test('accepts positive integers', () => {
    expect(isValidNumber('123')).toBe(true);
    expect(isValidNumber('1')).toBe(true);
  });

  test('accepts positive decimals', () => {
    expect(isValidNumber('12.50')).toBe(true);
    expect(isValidNumber('0.99')).toBe(true);
  });

  test('accepts negative integers', () => {
    expect(isValidNumber('-5000')).toBe(true);
    expect(isValidNumber('-1')).toBe(true);
  });

  test('accepts negative decimals', () => {
    expect(isValidNumber('-5000.50')).toBe(true);
    expect(isValidNumber('-0.01')).toBe(true);
  });

  test('accepts zero', () => {
    expect(isValidNumber('0')).toBe(true);
    expect(isValidNumber('0.00')).toBe(true);
  });

  test('rejects empty string', () => {
    expect(isValidNumber('')).toBe(false);
  });

  test('rejects non-numeric strings', () => {
    expect(isValidNumber('abc')).toBe(false);
    expect(isValidNumber('hello')).toBe(false);
  });

  test('parseFloat behavior: leading digits are parsed', () => {
    // parseFloat('12abc') returns 12 — this is expected JS behavior
    expect(isValidNumber('12abc')).toBe(true);
  });

  test('rejects NaN-producing strings', () => {
    expect(isValidNumber('NaN')).toBe(false);
  });

  test('rejects Infinity', () => {
    expect(isValidNumber('Infinity')).toBe(false);
    expect(isValidNumber('-Infinity')).toBe(false);
  });
});

describe('isValidPositiveNumber', () => {
  test('accepts positive numbers', () => {
    expect(isValidPositiveNumber('100')).toBe(true);
    expect(isValidPositiveNumber('0.01')).toBe(true);
  });

  test('rejects zero', () => {
    expect(isValidPositiveNumber('0')).toBe(false);
  });

  test('rejects negative numbers', () => {
    expect(isValidPositiveNumber('-100')).toBe(false);
  });
});

describe('isValidNonNegativeNumber', () => {
  test('accepts zero and positive', () => {
    expect(isValidNonNegativeNumber('0')).toBe(true);
    expect(isValidNonNegativeNumber('100')).toBe(true);
  });

  test('rejects negative', () => {
    expect(isValidNonNegativeNumber('-1')).toBe(false);
  });
});

describe('isValidDate', () => {
  test('accepts valid ISO dates', () => {
    expect(isValidDate('2025-01-15')).toBe(true);
    expect(isValidDate('2026-12-31')).toBe(true);
  });

  test('rejects invalid dates', () => {
    expect(isValidDate('')).toBe(false);
    expect(isValidDate('2025-13-01')).toBe(false);
    expect(isValidDate('not-a-date')).toBe(false);
  });
});

describe('isValidMonth', () => {
  test('accepts valid months', () => {
    expect(isValidMonth('2025-01')).toBe(true);
    expect(isValidMonth('2025-12')).toBe(true);
  });

  test('rejects invalid months', () => {
    expect(isValidMonth('2025-00')).toBe(false);
    expect(isValidMonth('2025-13')).toBe(false);
    expect(isValidMonth('')).toBe(false);
  });
});

describe('validatePrice', () => {
  test('returns null for valid price', () => {
    expect(validatePrice('100')).toBeNull();
    expect(validatePrice('0.01')).toBeNull();
  });

  test('returns error for empty', () => {
    expect(validatePrice('')).toBe('请输入价格');
  });

  test('returns error for non-positive', () => {
    expect(validatePrice('0')).toBe('价格必须大于 0');
    expect(validatePrice('-5')).toBe('价格必须大于 0');
  });
});

describe('validateRequired', () => {
  test('returns null for non-empty', () => {
    expect(validateRequired('hello', '名称')).toBeNull();
  });

  test('returns error for empty', () => {
    expect(validateRequired('', '名称')).toBe('请输入名称');
    expect(validateRequired('   ', '名称')).toBe('请输入名称');
  });
});

describe('validateDate', () => {
  test('returns null for valid date', () => {
    expect(validateDate('2025-01-15')).toBeNull();
  });

  test('returns error for empty', () => {
    expect(validateDate('')).toBe('请选择日期');
  });

  test('returns error for invalid format', () => {
    expect(validateDate('not-a-date')).toBe('日期格式无效');
  });
});
