/**
 * WorthBase (家底) - Validation Utilities
 * Input validation helpers for forms across the app.
 */

/** Validate that a string is a valid positive number */
export function isValidPositiveNumber(value: string): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
}

/** Validate that a string is a valid number (including negative, e.g. for liabilities) */
export function isValidNumber(value: string): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num);
}

/** Validate that a string is a valid non-negative number (including zero) */
export function isValidNonNegativeNumber(value: string): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0;
}

/** Validate YYYY-MM-DD date format */
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00');
  return !isNaN(date.getTime());
}

/** Validate YYYY-MM month format */
export function isValidMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const [year, month] = value.split('-').map(Number);
  return year >= 2000 && year <= 2099 && month >= 1 && month <= 12;
}

/** Get validation error message for a price field */
export function validatePrice(value: string, fieldName = '价格'): string | null {
  if (!value.trim()) return `请输入${fieldName}`;
  if (!isValidPositiveNumber(value)) return `${fieldName}必须大于 0`;
  return null;
}

/** Get validation error message for a required field */
export function validateRequired(value: string, fieldName: string): string | null {
  if (!value.trim()) return `请输入${fieldName}`;
  return null;
}

/** Get validation error message for a date field */
export function validateDate(value: string, fieldName = '日期'): string | null {
  if (!value.trim()) return `请选择${fieldName}`;
  if (!isValidDate(value)) return `${fieldName}格式无效`;
  return null;
}
