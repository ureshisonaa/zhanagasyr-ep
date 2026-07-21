import { useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '../Button/Button';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

const MAX_MESSAGE_LENGTH = 10000;

export function ChatInput({ onSend, disabled }: ChatInputProps): JSX.Element {
  const [value, setValue] = useState('');

  const submit = (): void => {
    const trimmed = value.trim();

    if (trimmed && !disabled) {
      onSend(trimmed);
      setValue('');
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-ink-100 p-4">
      <textarea
        value={value}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Задайте вопрос AI-ассистенту... (Enter — отправить, Shift+Enter — новая строка)"
        rows={3}
        maxLength={MAX_MESSAGE_LENGTH}
        disabled={disabled}
        className="flex-1 resize-none rounded border border-ink-200 px-4 py-3 text-base outline-none focus:border-ink-900 disabled:opacity-50"
      />
      <Button type="submit" disabled={disabled || !value.trim()}>
        Отправить
      </Button>
    </form>
  );
}
