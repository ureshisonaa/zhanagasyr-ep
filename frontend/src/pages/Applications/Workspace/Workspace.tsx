import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { applicationsApi } from '../../../services/applicationsApi';
import { AiAssistantTab } from './AiAssistantTab';
import { CalendarTab } from './CalendarTab';
import { ChecklistTab } from './ChecklistTab';
import { DocumentsTab } from './DocumentsTab';
import { NotesTab } from './NotesTab';
import { OverviewTab } from './OverviewTab';
import { StatusTab } from './StatusTab';

type TabId = 'overview' | 'ai' | 'documents' | 'checklist' | 'calendar' | 'notes' | 'status';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Обзор' },
  { id: 'ai', label: 'AI-ассистент' },
  { id: 'documents', label: 'Документы' },
  { id: 'checklist', label: 'Чек-лист' },
  { id: 'calendar', label: 'Календарь' },
  { id: 'notes', label: 'Заметки' },
  { id: 'status', label: 'Статус' },
];

export function Workspace(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const {
    data: application,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['applications', id],
    queryFn: () => applicationsApi.getOne(id ?? ''),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <p className="px-6 py-10 text-ink-500">Загрузка...</p>;
  }

  if (isError || !application || !id) {
    return <p className="px-6 py-10 text-danger">Заявка не найдена.</p>;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link to="/" className="text-sm text-ink-500 hover:text-ink-900">
        ← Назад к заявкам
      </Link>

      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{application.title}</h1>
        <span className="mt-1 inline-block rounded-full bg-ink-100 px-2 py-1 text-xs font-medium text-ink-700">
          {application.currentStageLabel}
        </span>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-ink-100">
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

      {activeTab === 'overview' && <OverviewTab application={application} />}
      {activeTab === 'ai' && <AiAssistantTab applicationId={id} />}
      {activeTab === 'documents' && <DocumentsTab applicationId={id} />}
      {activeTab === 'checklist' && <ChecklistTab applicationId={id} />}
      {activeTab === 'calendar' && <CalendarTab applicationId={id} />}
      {activeTab === 'notes' && <NotesTab applicationId={id} />}
      {activeTab === 'status' && <StatusTab application={application} />}
    </div>
  );
}
