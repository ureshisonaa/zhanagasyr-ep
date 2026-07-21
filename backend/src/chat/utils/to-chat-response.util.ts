import type { Chat, Message } from '@prisma/client';
import type { ChatResponse } from '../interfaces/chat-response.interface';
import type { MessageResponse } from '../interfaces/message-response.interface';

export function toMessageResponse(message: Message): MessageResponse {
  return {
    id: message.id,
    chatId: message.chatId,
    role: message.role,
    content: message.content,
    tokens: message.tokens,
    createdAt: message.createdAt,
  };
}

export function toChatResponse(chat: Chat, messages: Message[]): ChatResponse {
  return {
    id: chat.id,
    applicationId: chat.applicationId,
    title: chat.title,
    messages: messages.map(toMessageResponse),
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };
}
