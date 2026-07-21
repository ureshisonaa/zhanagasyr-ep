export type KnowledgeCategory =
  | 'Admission'
  | 'Scholarships'
  | 'Housing'
  | 'Visa'
  | 'Requirements'
  | 'Programs'
  | 'Deadlines'
  | 'FinancialAid'
  | 'FAQ'
  | 'Contacts'
  | 'Dormitory';

export interface KnowledgeArticleResponse {
  id: string;
  universityId: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  source: string;
  isIndexed: boolean;
  createdAt: string;
  updatedAt: string;
}
