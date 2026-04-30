// Stub vazio de `server-only` para uso EXCLUSIVO em vitest.perf.config.ts.
// Em produção, `server-only` (next.js) lança erro quando importado em código
// client-side. Em testes de performance que precisam executar a cadeia
// prisma → service em ambiente node puro, esse guard precisa ser neutralizado
// apenas via alias do runner — nunca via setupFiles globais.
//
// NÃO importe este arquivo de outro lugar e NÃO referencie em outros configs.
export {}
