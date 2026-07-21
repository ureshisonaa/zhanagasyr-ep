import { useState } from 'react';
import { AdmissionCyclesAdminTab } from './AdmissionCyclesAdminTab';
import { AiPromptsAdminTab } from './AiPromptsAdminTab';
import { ApplicationsFinalStatus } from './ApplicationsFinalStatus/ApplicationsFinalStatus';
import { DocumentsQueue } from './DocumentsQueue/DocumentsQueue';
import { DocumentTypesAdminTab } from './DocumentTypesAdminTab';
import { KnowledgeAdminTab } from './Knowledge/KnowledgeAdminTab';
import { AdminLogs } from './Logs/AdminLogs';
import { ProgramsAdminTab } from './ProgramsAdminTab';
import { UniversitiesAdminTab } from './UniversitiesAdminTab';
import { UsersAdminTab } from './Users/UsersAdminTab';

type AdminTabId =
  | 'users'
  | 'universities'
  | 'programs'
  | 'admissionCycles'
  | 'documentTypes'
  | 'aiPrompts'
  | 'knowledge'
  | 'documentsQueue'
  | 'applicationsFinalStatus'
  | 'logs';

const TABS: { id: AdminTabId; label: string }[] = [
  { id: 'users', label: 'Пользователи' },
  { id: 'universities', label: 'Университеты' },
  { id: 'programs', label: 'Программы' },
  { id: 'admissionCycles', label: 'Циклы поступления' },
  { id: 'documentTypes', label: 'Виды документов' },
  { id: 'aiPrompts', label: 'AI-промпты' },
  { id: 'knowledge', label: 'База знаний' },
  { id: 'documentsQueue', label: 'Очередь документов' },
  { id: 'applicationsFinalStatus', label: 'Финальные статусы' },
  { id: 'logs', label: 'Логи' },
];

/** Доступна только Admin/SuperAdmin — см. App.tsx (ProtectedRoute с allowedRoles). */
export function AdminPanel(): JSX.Element {
  const [activeTab, setActiveTab] = useState<AdminTabId>('users');

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Управление справочниками</h1>

      <div className="flex gap-1 overflow-x-auto border-b border-ink-100">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-ink-900 text-ink-900'
                : 'border-transparent text-ink-500 hover:text-ink-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && <UsersAdminTab />}
      {activeTab === 'universities' && <UniversitiesAdminTab />}
      {activeTab === 'programs' && <ProgramsAdminTab />}
      {activeTab === 'admissionCycles' && <AdmissionCyclesAdminTab />}
      {activeTab === 'documentTypes' && <DocumentTypesAdminTab />}
      {activeTab === 'aiPrompts' && <AiPromptsAdminTab />}
      {activeTab === 'knowledge' && <KnowledgeAdminTab />}
      {activeTab === 'documentsQueue' && <DocumentsQueue />}
      {activeTab === 'applicationsFinalStatus' && <ApplicationsFinalStatus />}
      {activeTab === 'logs' && <AdminLogs />}
    </div>
  );
}
