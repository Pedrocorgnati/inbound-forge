/**
 * TAREFA-018 ST001: backoff exponencial com full jitter (AWS).
 *
 * Algoritmo canonico (full jitter): `delay = random(0, min(base * factor^n, cap))`.
 * Compartilhado pelo broker (reconexao server-side defensiva) e pelo hook
 * `useSSE` (reconexao do EventSource no cliente), para que a politica de
 * espera seja unica e auditavel (Zero Assumido).
 */

/** Parametros canonicos da subtask ST001. */
export const BACKOFF_BASE_MS = 1_000
export const BACKOFF_FACTOR = 2
export const BACKOFF_CAP_MS = 30_000

/**
 * Retorna o atraso (ms) da tentativa `attempt` (0-based) com full jitter.
 *
 * `attempt = 0` => janela `[0, base)`; cada tentativa dobra a janela ate o teto.
 * O valor e sempre `>= 0` e `< min(base * factor^attempt, cap)`.
 *
 * @param attempt numero da tentativa (0-based); valores negativos sao tratados como 0.
 * @param rng gerador de aleatorio injetavel (default `Math.random`) para teste deterministico.
 */
export function fullJitterDelay(
  attempt: number,
  rng: () => number = Math.random,
): number {
  const n = Number.isFinite(attempt) && attempt > 0 ? Math.floor(attempt) : 0
  const ceiling = Math.min(BACKOFF_BASE_MS * Math.pow(BACKOFF_FACTOR, n), BACKOFF_CAP_MS)
  return Math.floor(rng() * ceiling)
}
