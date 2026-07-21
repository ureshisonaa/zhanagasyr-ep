import type { MentorComment } from '@prisma/client';
import type { MentorCommentResponse } from '../interfaces/mentor-comment-response.interface';

type MentorCommentWithAuthor = MentorComment & {
  author: { firstName: string; lastName: string };
};

export function toMentorCommentResponse(comment: MentorCommentWithAuthor): MentorCommentResponse {
  return {
    id: comment.id,
    applicationId: comment.applicationId,
    documentId: comment.documentId,
    authorId: comment.authorId,
    authorName: `${comment.author.firstName} ${comment.author.lastName}`,
    content: comment.content,
    isInternal: comment.isInternal,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}
