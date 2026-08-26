import { z } from 'zod';

export const profileSchema = z.object({
  id: z.uuid(),
  username: z.string().trim().min(1).max(80),
  icon: z
    .string()
    .max(1_500_000)
    .regex(/^data:image\/(?:bmp|jpeg|png);base64,/)
    .optional(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export type Profile = z.infer<typeof profileSchema>;
