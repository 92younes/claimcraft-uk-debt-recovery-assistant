import { z } from 'zod';

export const recipientSchema = z.object({
  name: z.string().min(1, "Recipient name is required"),
  title: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  address1: z.string().min(1, "Address line 1 is required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  postcode: z.string().min(1, "Postcode is required").regex(/^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i, "Invalid UK Postcode format"),
  country: z.string().default('GB')
});

export const mailSendSchema = z.object({
  recipient: recipientSchema,
  html: z.string().min(1, "HTML content is required"),
  test: z.boolean().optional().default(true)
});

export const createSessionSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  userEmail: z.string().email("Invalid email").optional(),
  allowedIntegrations: z.array(z.string()).optional()
});

export const anthropicMessageSchema = z.object({
  model: z.string().min(1),
  max_tokens: z.number().int().positive(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })),
  temperature: z.number().optional(),
  system: z.string().optional()
});

export const geminiSchema = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1),
  files: z.array(z.object({
    data: z.string(),
    mimeType: z.string()
  })).optional(),
  config: z.any().optional()
});


