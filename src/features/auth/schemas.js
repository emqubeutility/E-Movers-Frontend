import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Enter your user name').max(30, 'User name is too long'),
  password: z.string().min(1, 'Password is required'),
});
