import { z } from 'zod';

/**
 * Shared form rules. Every form uses these so the same field is checked the same way everywhere.
 * Rule of thumb: a field is validated for presence (if required), type/characters, then length.
 */

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
export const PHONE_MIN_DIGITS = 8;
export const PHONE_MAX_DIGITS = 15;

/** Email: `required` adds the "enter" message; an optional email may be blank. */
export function emailRule({ required = false, label = 'email address' } = {}) {
  return z
    .string()
    .trim()
    .max(150, 'Email can have at most 150 characters')
    .superRefine((value, ctx) => {
      if (value === '') {
        if (required) ctx.addIssue({ code: 'custom', message: `Enter the ${label}` });
        return;
      }
      if (!EMAIL.test(value)) ctx.addIssue({ code: 'custom', message: 'Enter a valid email address' });
    });
}

/**
 * Phone in international format: "+" then 8-15 digits, nothing else. Each failure has its own
 * message so the user knows what to fix.
 */
export function phoneRule({ required = false, label = 'phone number' } = {}) {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value === '') {
        if (required) ctx.addIssue({ code: 'custom', message: `Enter the ${label}` });
        return;
      }
      if (/[^+\d]/.test(value) || value.indexOf('+', 1) !== -1) {
        ctx.addIssue({ code: 'custom', message: 'Use digits only, with an optional leading +' });
        return;
      }
      if (!value.startsWith('+')) {
        ctx.addIssue({ code: 'custom', message: 'Start with the country code, e.g. +971501234567' });
        return;
      }
      const digits = value.length - 1;
      if (digits < PHONE_MIN_DIGITS) {
        ctx.addIssue({ code: 'custom', message: `Enter at least ${PHONE_MIN_DIGITS} digits after +` });
      } else if (digits > PHONE_MAX_DIGITS) {
        ctx.addIssue({ code: 'custom', message: `Enter at most ${PHONE_MAX_DIGITS} digits after +` });
      } else if (value[1] === '0') {
        ctx.addIssue({ code: 'custom', message: 'The country code cannot start with 0' });
      }
    });
}

/** Optional website: blank, or an http(s) address. */
export const websiteRule = z
  .string()
  .trim()
  .max(255, 'Website can have at most 255 characters')
  .refine((value) => value === '' || /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(value), {
    message: 'Enter a valid website, e.g. https://example.com',
  });

/** Optional percentage: blank, or a number from 0 to 100 with at most two decimals. */
export const percentRule = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d{1,3}(\.\d{1,2})?$/.test(value), {
    message: 'Enter a number with at most two decimals',
  })
  .refine((value) => value === '' || Number(value) <= 100, { message: 'Enter a value up to 100' });

/** Keeps only "+" (first position) and digits as the person types. */
export function sanitizePhone(value) {
  const cleaned = value.replace(/[^\d+]/g, '');
  const plus = cleaned.startsWith('+') ? '+' : '';
  return plus + cleaned.replace(/\+/g, '').slice(0, PHONE_MAX_DIGITS);
}

/**
 * Spread over a phone <input> in place of register(name)'s result:
 * `<input {...phoneProps(register('phone'))} />`. Letters and symbols are dropped while typing.
 */
export function phoneProps(registration) {
  return {
    ...registration,
    type: 'tel',
    inputMode: 'tel',
    autoComplete: 'tel',
    maxLength: PHONE_MAX_DIGITS + 1,
    onChange: (event) => {
      event.target.value = sanitizePhone(event.target.value);
      return registration.onChange(event);
    },
  };
}
