import { z } from 'zod';

import { SUPPORTED_PROVIDERS } from '@/lib/ai/defaults';
import { SUBJECTS } from '@/lib/subjects';

const providerEnum = z.enum(SUPPORTED_PROVIDERS as [string, ...string[]]);
const subjectEnum = z.enum(SUBJECTS.map((s) => s.id) as [string, ...string[]]);

const optionalModel = z.string().trim().max(120).optional().or(z.literal('')).transform((v) => (v ? v : undefined));

export const providerTestSchema = z.object({
  provider: providerEnum,
  apiKey: z.string().min(8).max(400),
  model: optionalModel,
});

export const providerSaveSchema = z.object({
  provider: providerEnum,
  apiKey: z.string().min(8).max(400),
  visionModel: optionalModel,
  tutorModel: optionalModel,
  solverModel: optionalModel,
});

export const classroomCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  subjectId: subjectEnum,
  providerCredentialId: z.string().uuid(),
  visionModel: optionalModel,
  tutorModel: optionalModel,
  solverModel: optionalModel,
  guidanceNote: z.string().trim().max(500).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  dailyLimitPerSession: z.number().int().min(1).max(1000).default(30),
  dailyLimitTotal: z.number().int().min(1).max(100000).default(500),
  accessCode: z.string().trim().min(2).max(40).optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  expiresAt: z.string().datetime().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
});

export const classroomUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  subjectId: subjectEnum.optional(),
  providerCredentialId: z.string().uuid().optional(),
  visionModel: z.string().trim().max(120).optional(),
  tutorModel: z.string().trim().max(120).optional(),
  solverModel: z.string().trim().max(120).optional(),
  guidanceNote: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
  dailyLimitPerSession: z.number().int().min(1).max(1000).optional(),
  dailyLimitTotal: z.number().int().min(1).max(100000).optional(),
  // null → 접속 코드 제거, string → 변경, undefined → 유지
  accessCode: z.string().trim().max(40).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const studentSessionSchema = z.object({
  accessCode: z.string().trim().max(40).optional(),
});

export const studentTutorSchema = z.object({
  problemText: z.string().trim().min(1).max(6000),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(6000),
      }),
    )
    .min(1)
    .max(60),
});
