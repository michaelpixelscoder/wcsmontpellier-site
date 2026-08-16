import type { FunctionReturnType } from 'convex/server'
import type { api } from '../../convex/_generated/api'

export type CourseCardData = FunctionReturnType<typeof api.classes.listPublished>[number]
export type EventCardData = FunctionReturnType<typeof api.agenda.listPublished>[number]
