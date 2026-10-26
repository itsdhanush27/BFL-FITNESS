import { z } from 'zod';
import { 
  FirestoreDataConverter, 
  QueryDocumentSnapshot, 
  SnapshotOptions, 
  serverTimestamp 
} from 'firebase/firestore';

// ─── 1. Zod Validation Schemas ───────────────────────────────────────────────

export const CompletedSessionSchema = z.object({
  id: z.string(),
  clientId: z.string().min(1, 'Client ID is required'),
  title: z.string().min(1, 'Workout title is required'),
  description: z.string().default(''),
  assignedDate: z.string().optional(),
  completedDate: z.string().optional(),
  completedAt: z.string().min(1, 'Completion timestamp is required'),
  durationMinutes: z.number().int().positive().default(45),
  isCompleted: z.literal(true),
  // Strongly typed rating between 1 and 5
  rating: z.number().int().min(1).max(5),
  // Canonical feedback string, with legacy clientGeneralFeedback fallback support
  feedback: z.string().default(''),
  clientGeneralFeedback: z.string().optional(),
  exercises: z.array(z.any()).default([]),
  updatedAt: z.any().optional(),
});

export type CompletedSession = z.infer<typeof CompletedSessionSchema>;

export const CompleteSessionPayloadSchema = z.object({
  workoutId: z.string().min(1),
  clientId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(1000).trim(),
  durationMinutes: z.number().int().min(1).max(300).default(55),
});

export type CompleteSessionPayload = z.infer<typeof CompleteSessionPayloadSchema>;

// ─── 2. Typesafe Firestore Converter ────────────────────────────────────────

export const completedSessionConverter: FirestoreDataConverter<CompletedSession> = {
  toFirestore(session: CompletedSession) {
    return {
      clientId: session.clientId,
      title: session.title,
      description: session.description,
      completedAt: session.completedAt,
      durationMinutes: session.durationMinutes,
      isCompleted: true,
      rating: session.rating,
      feedback: session.feedback,
      // Mirror to clientGeneralFeedback to prevent breaking legacy consumers
      clientGeneralFeedback: session.feedback,
      exercises: session.exercises,
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot, 
    options: SnapshotOptions
  ): CompletedSession {
    const data = snapshot.data(options);
    
    // Normalize rating and feedback (handles legacy documents seamlessly)
    const normalized = {
      id: snapshot.id,
      clientId: data.clientId || '',
      title: data.title || 'Completed Session',
      description: data.description || '',
      assignedDate: data.assignedDate,
      completedAt: data.completedAt || new Date().toISOString(),
      durationMinutes: Number(data.durationMinutes) || 45,
      isCompleted: true as const,
      rating: typeof data.rating === 'number' ? Math.min(Math.max(data.rating, 1), 5) : 5,
      feedback: (data.feedback ?? data.clientGeneralFeedback ?? '').trim(),
      clientGeneralFeedback: data.clientGeneralFeedback,
      exercises: data.exercises || [],
      updatedAt: data.updatedAt,
    };

    return CompletedSessionSchema.parse(normalized);
  }
};
