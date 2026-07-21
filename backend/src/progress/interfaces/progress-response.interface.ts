export interface ProgressResponse {
  documents: number;
  essays: number;
  checklist: number;
  deadlines: number;
  interview: number;
  /** Взвешенная сумма пяти компонентов, округлённая до целого процента. */
  total: number;
}
