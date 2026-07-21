import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ChatInput } from '../../../components/ChatInput/ChatInput';
import { ChatMessage } from '../../../components/ChatMessage/ChatMessage';
import { aiApi } from '../../../services/aiApi';
import { chatApi } from '../../../services/chatApi';
import type { MessageResponse } from '../../../types/message.types';

interface AiAssistantTabProps {
  applicationId: string;
}

export function AiAssistantTab({ applicationId }: AiAssistantTabProps): JSX.Element {
  const queryClient = useQueryClient();
  const queryKey = ['chat', applicationId];
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Более старые сообщения, подгруженные кнопкой "Показать более ранние" —
  // отдельно от основного запроса (Этап 12.2): при 1000+ сообщениях в
  // диалоге изначальный запрос отдаёт только последние limit (см.
  // QueryChatMessagesDto), дальнейшая история подгружается курсором `before`.
  const [olderMessages, setOlderMessages] = useState<MessageResponse[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const {
    data: chat,
    isLoading,
    isError,
  } = useQuery({
    queryKey,
    queryFn: () => chatApi.getByApplication(applicationId),
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) => aiApi.sendMessage(applicationId, message),
    onSuccess: () => {
      shouldAutoScroll.current = true;
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось получить ответ от AI-ассистента'),
  });

  const allMessages = [...olderMessages, ...(chat?.messages ?? [])];

  const loadOlderMessages = async (): Promise<void> => {
    if (allMessages.length === 0) {
      return;
    }

    setIsLoadingOlder(true);
    shouldAutoScroll.current = false;

    try {
      const oldestMessageId = allMessages[0].id;
      const olderChat = await chatApi.getByApplication(applicationId, 50, oldestMessageId);

      if (olderChat.messages.length === 0) {
        setHasMoreOlder(false);
      } else {
        setOlderMessages((prev) => [...olderChat.messages, ...prev]);
      }
    } catch {
      toast.error('Не удалось загрузить более ранние сообщения');
    } finally {
      setIsLoadingOlder(false);
    }
  };

  // Автопрокрутка к последнему сообщению — только при первичной загрузке и
  // после отправки нового вопроса. При подгрузке старых сообщений НЕ
  // прокручиваем вниз — пользователь читает историю, а не ждёт новый ответ.
  useEffect(() => {
    if (shouldAutoScroll.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chat?.messages.length]);

  if (isLoading) {
    return <p className="text-ink-500">Загрузка...</p>;
  }

  if (isError || !chat) {
    return <p className="text-danger">Не удалось загрузить чат.</p>;
  }

  return (
    <div className="flex h-[600px] flex-col rounded border border-ink-100">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {allMessages.length === 0 && (
          <p className="pt-10 text-center text-sm text-ink-500">
            Задайте первый вопрос AI-ассистенту о поступлении.
          </p>
        )}

        {allMessages.length > 0 && hasMoreOlder && (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={() => void loadOlderMessages()}
              disabled={isLoadingOlder}
              className="text-xs text-ink-500 hover:text-ink-900"
            >
              {isLoadingOlder ? 'Загрузка...' : 'Показать более ранние сообщения'}
            </button>
          </div>
        )}

        {allMessages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {sendMutation.isPending && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-500">
              Печатает...
            </div>
          </div>
        )}
      </div>

      <ChatInput
        onSend={(content) => sendMutation.mutate(content)}
        disabled={sendMutation.isPending}
      />
    </div>
  );
}
