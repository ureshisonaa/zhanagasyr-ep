export interface ActivityLogEntryResponse {
  id: string;
  applicationId: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  description: string;
  createdAt: string;
}
