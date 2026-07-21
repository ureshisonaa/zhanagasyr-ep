// Приблизительный прокси для ~250-300 токенов — точный токенайзер не
// подключаем ради одной функции чанкинга (KISS); для целей семантического
// поиска приближение по символам достаточно точное.
const MAX_CHUNK_LENGTH = 1000;
const CHUNK_OVERLAP = 100;

/**
 * Разбивает текст на чанки по границам абзацев, объединяя мелкие абзацы
 * вместе и с небольшим перекрытием между чанками (для сохранения контекста
 * на границах). Абзац длиннее MAX_CHUNK_LENGTH * 1.5 разбивается принудительно.
 */
export function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length > MAX_CHUNK_LENGTH && current) {
      chunks.push(current);
      const overlapTail = current.slice(-CHUNK_OVERLAP);
      current = `${overlapTail}\n\n${paragraph}`;
    } else {
      current = candidate;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.flatMap((chunk) =>
    chunk.length > MAX_CHUNK_LENGTH * 1.5 ? hardSplit(chunk) : [chunk],
  );
}

function hardSplit(text: string): string[] {
  const parts: string[] = [];

  for (let i = 0; i < text.length; i += MAX_CHUNK_LENGTH) {
    parts.push(text.slice(i, i + MAX_CHUNK_LENGTH));
  }

  return parts;
}
