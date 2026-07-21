export interface ActivityLogEntryResponse {
  id: string;
  applicationId: string;
  actorId: string | null;
  /** null для системных событий (например авто-отметка чек-листа). */
  actorName: string | null;
  action: string;
  description: string;
  createdAt: Date;
}
