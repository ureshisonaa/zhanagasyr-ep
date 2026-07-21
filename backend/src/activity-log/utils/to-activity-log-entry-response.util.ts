import type { ActivityLogEntry } from '@prisma/client';
import type { ActivityLogEntryResponse } from '../interfaces/activity-log-entry-response.interface';

type ActivityLogEntryWithActor = ActivityLogEntry & {
  actor: { firstName: string; lastName: string } | null;
};

export function toActivityLogEntryResponse(
  entry: ActivityLogEntryWithActor,
): ActivityLogEntryResponse {
  return {
    id: entry.id,
    applicationId: entry.applicationId,
    actorId: entry.actorId,
    actorName: entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : null,
    action: entry.action,
    description: entry.description,
    createdAt: entry.createdAt,
  };
}
