import { z } from 'zod'

export const CreateCaseSchema = z.object({
  name: z.string().min(3).max(100),
  sector: z.string().min(2).max(100),
  systemType: z.string().min(2).max(100),
  outcome: z.string().min(50),
  hasQuantifiableResult: z.boolean().default(false),
})

export const UpdateCaseSchema = CreateCaseSchema

export const CreatePainSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(20),
  sectors: z.array(z.string().min(2)).min(1).max(5),
})

export const UpdatePainSchema = CreatePainSchema

export const CreateSolutionPatternSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().min(10),
  painId: z.string().uuid(),
  caseId: z.string().uuid(),
})

export const CreateObjectionSchema = z.object({
  content: z.string().min(5),
  type: z.enum(['PRICE', 'TRUST', 'TIMING', 'NEED', 'AUTHORITY']),
})

export const UpdateObjectionSchema = CreateObjectionSchema

export type CreateCaseInput = z.infer<typeof CreateCaseSchema>
export type CreatePainInput = z.infer<typeof CreatePainSchema>
export type CreateSolutionPatternInput = z.infer<typeof CreateSolutionPatternSchema>
export type CreateObjectionInput = z.infer<typeof CreateObjectionSchema>
