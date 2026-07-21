import * as bcrypt from 'bcrypt';

/** Единая точка правды — использовалась только в UsersService (Этап 1.3), теперь и в AdminUsersService (Этап 11.1). */
export const BCRYPT_SALT_ROUNDS = 12;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
}
