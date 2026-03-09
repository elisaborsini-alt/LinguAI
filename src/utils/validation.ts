import {z} from 'zod';

// ============================================
// Email Validation
// ============================================

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

export const isValidEmail = (email: string): boolean => {
  return emailSchema.safeParse(email).success;
};

// ============================================
// Password Validation
// ============================================

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const simplePasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters');

export const isValidPassword = (password: string): boolean => {
  return simplePasswordSchema.safeParse(password).success;
};

export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  let strength = 0;

  if (password.length >= 8) {strength++;}
  if (password.length >= 12) {strength++;}
  if (/[A-Z]/.test(password)) {strength++;}
  if (/[a-z]/.test(password)) {strength++;}
  if (/[0-9]/.test(password)) {strength++;}
  if (/[^A-Za-z0-9]/.test(password)) {strength++;}

  if (strength <= 2) {return 'weak';}
  if (strength <= 4) {return 'medium';}
  return 'strong';
};

// ============================================
// Name Validation
// ============================================

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens and apostrophes');

export const isValidName = (name: string): boolean => {
  return nameSchema.safeParse(name).success;
};

// ============================================
// Registration Schema
// ============================================

export const registrationSchema = z.object({
  email: emailSchema,
  password: simplePasswordSchema,
  name: nameSchema,
});

export type RegistrationData = z.infer<typeof registrationSchema>;

export const validateRegistration = (data: unknown): {
  success: boolean;
  data?: RegistrationData;
  errors?: Record<string, string>;
} => {
  const result = registrationSchema.safeParse(data);

  if (result.success) {
    return {success: true, data: result.data};
  }

  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path[0] as string;
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });

  return {success: false, errors};
};

// ============================================
// Login Schema
// ============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginData = z.infer<typeof loginSchema>;

export const validateLogin = (data: unknown): {
  success: boolean;
  data?: LoginData;
  errors?: Record<string, string>;
} => {
  const result = loginSchema.safeParse(data);

  if (result.success) {
    return {success: true, data: result.data};
  }

  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path[0] as string;
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });

  return {success: false, errors};
};

// ============================================
// Message Validation
// ============================================

export const messageSchema = z
  .string()
  .min(1, 'Message cannot be empty')
  .max(1000, 'Message must be less than 1000 characters');

export const isValidMessage = (message: string): boolean => {
  return messageSchema.safeParse(message).success;
};
