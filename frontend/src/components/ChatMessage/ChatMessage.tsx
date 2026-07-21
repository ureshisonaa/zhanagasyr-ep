import type { MessageResponse } from '../../types/message.types';

interface ChatMessageProps {
  message: MessageResponse;
}

/**
 * Минималистичный стиль (Часть 4 ТЗ: "большие поля, минимум отвлекающих
 * элементов") — только пузырь с текстом, без аватаров/таймстампов внутри
 * ленты, чтобы не отвлекать от содержания ответа.
 */
export function ChatMessage({ message }: ChatMessageProps): JSX.Element {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-4 py-3 text-sm ${
          isUser ? 'bg-ink-900 text-ink-0' : 'bg-ink-50 text-ink-900'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
