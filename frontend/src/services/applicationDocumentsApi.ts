import { api } from './api';
import type { ApplicationDocumentResponse } from '../types/applicationDocument.types';

export interface LinkApplicationDocumentInput {
  applicationId: string;
  documentId: string;
  isShared?: boolean;
}

export const applicationDocumentsApi = {
  link: async (input: LinkApplicationDocumentInput): Promise<ApplicationDocumentResponse> => {
    const response = await api.post<{ success: true; applicationDocument: ApplicationDocumentResponse }>(
      '/application-documents',
      input,
    );
    return response.data.applicationDocument;
  },

  getAllForApplication: async (applicationId: string): Promise<ApplicationDocumentResponse[]> => {
    const response = await api.get<{
      success: true;
      applicationDocuments: ApplicationDocumentResponse[];
    }>(`/application-documents/${applicationId}`);
    return response.data.applicationDocuments;
  },

  unlink: async (id: string): Promise<void> => {
    await api.delete(`/application-documents/${id}`);
  },
};
