export interface AdminLogEntryResponse {
  id: string;
  adminId: string;
  adminName: string;
  method: string;
  path: string;
  statusCode: number;
  createdAt: string;
}
