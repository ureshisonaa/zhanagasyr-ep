/** Русское склонение слова "день" по числу (1 день / 2 дня / 5 дней). */
export function pluralizeDays(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return 'день';
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return 'дня';
  }

  return 'дней';
}
