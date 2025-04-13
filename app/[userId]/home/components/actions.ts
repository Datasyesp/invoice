'use server'

import { z } from 'zod'

const formSchema = z.object({
  pageUrl: z.string().url({ message: "Please enter a valid URL" }),
  title: z.string().min(10, { message: "Title must be at least 10 characters" }).max(60, { message: "Title must not exceed 60 characters" }),
  description: z.string().min(50, { message: "Description must be at least 50 characters" }).max(160, { message: "Description must not exceed 160 characters" }),
  ogType: z.enum(["website", "article", "product"]),
  ogImage: z.string().url({ message: "Please enter a valid image URL" }).optional(),
  noindex: z.boolean(),
  nofollow: z.boolean(),
})

export type FormSchema = z.infer<typeof formSchema>

export async function addSEOData(data: FormSchema) {
  // Here you would typically save the data to your database
  console.log('Saving SEO data:', data)
  // For demonstration purposes, we're just logging the data
  // In a real application, you'd save this to your database
  return { success: true, message: 'SEO data saved successfully' }
}

