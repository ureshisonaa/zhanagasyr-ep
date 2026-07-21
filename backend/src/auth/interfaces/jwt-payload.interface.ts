/**
 * Payload access-токена — короткоживущий, без tokenVersion:
 * ревокация отдельных access-токенов не производится, полагаемся на
 * его короткий срок жизни (JWT_ACCESS_EXPIRES_IN).
 */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * Payload refresh-токена. tokenVersion сверяется с User.tokenVersion —
 * это единственный механизм серверной ревокации в текущей архитектуре
 * (см. комментарий к полю tokenVersion в schema.prisma).
 */
export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
}
