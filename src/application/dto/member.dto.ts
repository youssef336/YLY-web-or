import { z } from 'zod';

/**
 * Input DTOs. Every boundary crossing (form -> use case) is validated here.
 * Invalid input never reaches the domain.
 */

export const AddMemberInputSchema = z.object({
  name: z.string().trim().min(1, 'Member name is required').max(100),
});
export type AddMemberInput = z.infer<typeof AddMemberInputSchema>;

export const UpdateMemberNameInputSchema = z.object({
  name: z.string().trim().min(1, 'Member name is required').max(100),
});
export type UpdateMemberNameInput = z.infer<typeof UpdateMemberNameInputSchema>;

export const TechnicalScoreInputSchema = z.object({
  score: z.number().min(0).max(50, 'Technical score must be between 0 and 50'),
});
export type TechnicalScoreInput = z.infer<typeof TechnicalScoreInputSchema>;

/** Interaction / Respect Hierarchy / Bonus — each a direct 0..10 input. */
export const CategoryScoresInputSchema = z.object({
  interaction: z.number().min(0).max(10, 'Interaction must be between 0 and 10'),
  respectHierarchy: z.number().min(0).max(10, 'Respect Hierarchy must be between 0 and 10'),
  bonus: z.number().min(0).max(10, 'Bonus must be between 0 and 10'),
});
export type CategoryScoresInput = z.infer<typeof CategoryScoresInputSchema>;

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

/** Global Field Visit: location/event name + date + shift (independent of members). */
export const GlobalFieldVisitInputSchema = z.object({
  name: z.string().trim().min(1, 'Location / event name is required').max(200),
  date: z.string().regex(isoDate, 'A valid date is required'),
  shift: z.enum(['Day', 'Night'], { message: 'Shift is required' }),
});
export type GlobalFieldVisitInput = z.infer<typeof GlobalFieldVisitInputSchema>;

/** Global Meeting: name + date (independent of members). */
export const GlobalMeetingInputSchema = z.object({
  name: z.string().trim().min(1, 'Meeting name is required').max(200),
  date: z.string().regex(isoDate, 'A valid date is required'),
});
export type GlobalMeetingInput = z.infer<typeof GlobalMeetingInputSchema>;

/** Field Visit entry: references a global event + attendance score. */
export const FieldVisitInputSchema = z.object({
  globalEventId: z.string().min(1, 'Please select a field visit'),
  score: z.union([z.literal(0), z.literal(0.5), z.literal(1)]),
});
export type FieldVisitInput = z.infer<typeof FieldVisitInputSchema>;

/** Meeting entry: references a global event + attendance score. */
export const MeetingInputSchema = z.object({
  globalEventId: z.string().min(1, 'Please select a meeting'),
  score: z.union([z.literal(0), z.literal(0.5), z.literal(1)]),
});
export type MeetingInput = z.infer<typeof MeetingInputSchema>;

/** HR Task input — one task row in the HR committee evaluation. */
export const HrTaskInputSchema = z.object({
  name: z.string().trim().min(1, 'Task name is required').max(100),
  t: z.union([z.literal(0), z.literal(0.25), z.literal(0.5), z.literal(1)]),
  q: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  d: z.union([z.literal(0), z.literal(0.25), z.literal(0.5), z.literal(1)]),
});
export type HrTaskInput = z.infer<typeof HrTaskInputSchema>;

/** Update an existing HR task's scores (name stays the same). */
export const UpdateHrTaskInputSchema = z.object({
  t: z.union([z.literal(0), z.literal(0.25), z.literal(0.5), z.literal(1)]),
  q: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  d: z.union([z.literal(0), z.literal(0.25), z.literal(0.5), z.literal(1)]),
});
export type UpdateHrTaskInput = z.infer<typeof UpdateHrTaskInputSchema>;