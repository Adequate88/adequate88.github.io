import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string(),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    pinned: z.boolean().default(false),
    readtime: z.string().optional(),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    status: z.enum(['active', 'completed', 'archived']).default('completed'),
    year: z.string().optional(),
    month: z.string().optional(),
    image: z.string().optional(),   // still: social card, Work page cards, video poster
    video: z.string().optional(),   // looping clip shown as the hero instead of the still
    github: z.string().optional(),
  }),
});

export const collections = { blog, projects };
