import { describe, expect, it } from 'vitest';
import { emailRule, percentRule, phoneRule, sanitizePhone, websiteRule } from './validation.js';

const message = (rule, value) => {
  const result = rule.safeParse(value);
  return result.success ? null : result.error.issues[0].message;
};

describe('phone rule', () => {
  const rule = phoneRule();
  it('accepts blank when optional and a valid international number', () => {
    expect(message(rule, '')).toBeNull();
    expect(message(rule, '+971501234567')).toBeNull();
  });
  it('requires a value when required', () => {
    expect(message(phoneRule({ required: true }), '')).toMatch(/Enter the phone number/);
  });
  it('rejects letters, short, long and missing country code', () => {
    expect(message(rule, '+97150abc')).toMatch(/digits only/);
    expect(message(rule, '+1234567')).toMatch(/at least 8/);
    expect(message(rule, '+1234567890123456')).toMatch(/at most 15/);
    expect(message(rule, '0501234567')).toMatch(/country code/);
  });
  it('strips letters and symbols while typing', () => {
    expect(sanitizePhone('+97a1 50-12')).toBe('+9715012');
    expect(sanitizePhone('12+3')).toBe('123');
  });
});

describe('email rule', () => {
  it('validates the shape', () => {
    expect(message(emailRule({ required: true }), '')).toMatch(/Enter the email/);
    expect(message(emailRule(), '')).toBeNull();
    expect(message(emailRule(), 'a@b')).toMatch(/valid email/);
    expect(message(emailRule(), 'a b@c.com')).toMatch(/valid email/);
    expect(message(emailRule(), 'sara@example.com')).toBeNull();
  });
});

describe('website and percent rules', () => {
  it('check their formats', () => {
    expect(message(websiteRule, 'example')).toMatch(/valid website/);
    expect(message(websiteRule, 'https://example.com')).toBeNull();
    expect(message(percentRule, '101')).toMatch(/up to 100/);
    expect(message(percentRule, '7.555')).toMatch(/two decimals/);
    expect(message(percentRule, '7.5')).toBeNull();
  });
});
