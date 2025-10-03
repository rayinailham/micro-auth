import { z } from 'zod';

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation - at least 8 characters, contains letters and numbers
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .regex(emailRegex, 'Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must contain at least one letter and one number'),
  displayName: z
    .string()
    .min(1, 'Display name cannot be empty')
    .max(100, 'Display name too long')
    .optional(),
  photoURL: z
    .string()
    .url('Invalid photo URL format')
    .optional()
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .regex(emailRegex, 'Invalid email format'),
  password: z
    .string()
    .min(1, 'Password is required')
});

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required')
});

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Display name cannot be empty')
    .max(100, 'Display name too long')
    .optional(),
  photoURL: z
    .string()
    .url('Invalid photo URL format')
    .optional()
}).refine(
  (data) => data.displayName !== undefined || data.photoURL !== undefined,
  {
    message: 'At least one field (displayName or photoURL) must be provided',
    path: ['root']
  }
);

export const deleteUserSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required for account deletion')
});

export const logoutSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required')
});
