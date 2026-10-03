import { z } from 'zod';

export const listingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be greater than or equal to 0'),
  rooms: z.number().int().min(1, 'At least 1 room is required'),
  propertyType: z.string().optional(),
  location: z.string().optional(),
});
