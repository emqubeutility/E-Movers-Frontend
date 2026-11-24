import { z } from 'zod';

const ROLE_CODE = /^[A-Z][A-Z0-9_]{1,39}$/;

/** The code is immutable once the role exists, so it is only validated when creating. */
export function buildRoleSchema(editing) {
  return z.object({
    code: editing
      ? z.string()
      : z
          .string()
          .trim()
          .min(2, 'Enter a role code')
          .transform((value) => value.toUpperCase())
          .refine(
            (value) => ROLE_CODE.test(value),
            'Use a letter, then letters, numbers or underscores (max 40)',
          ),
    name: z.string().trim().min(2, 'Enter the role name').max(150),
    level: z
      .string()
      .trim()
      .min(1, 'Enter a level')
      .refine((value) => /^\d{1,2}$/.test(value), 'Enter a level between 0 and 99'),
    isActive: z.boolean(),
  });
}

/**
 * Builds the API body. The code is only sent on create and the status only on edit, because the
 * create and update schemas deliberately accept different fields.
 */
export function toRolePayload(values, permissions, editing) {
  return {
    ...(editing ? { isActive: values.isActive } : { code: values.code }),
    name: values.name,
    level: Number(values.level),
    permissions: permissions.map(({ menuItemId, create, edit, delete: remove }) => ({
      menuItemId,
      create,
      edit,
      delete: remove,
    })),
  };
}
