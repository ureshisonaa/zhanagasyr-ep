import { registerAs } from '@nestjs/config';

export interface GoogleDriveConfig {
  clientEmail?: string;
  privateKey?: string;
  rootFolderId?: string;
}

export default registerAs(
  'googleDrive',
  (): GoogleDriveConfig => ({
    clientEmail: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_DRIVE_PRIVATE_KEY,
    rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
  }),
);
