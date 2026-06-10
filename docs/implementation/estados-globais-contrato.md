# Contrato de Estados Globais

## Escopo

Este contrato define os estados globais criados na TAREFA-004 para rotas protegidas do App Router.

## Contrato de loading.tsx

- Deve renderizar `RouteLoadingState` ou skeleton equivalente.
- Deve informar `aria-busy="true"` diretamente ou via componente compartilhado.
- Nao deve importar componente client sem necessidade de interatividade.

## Contrato de error.tsx

- Deve ser client component.
- Deve aceitar `error: Error & { digest?: string }` e `reset: () => void`.
- Deve exibir `correlation_id`, botao de retry e link de suporte.
- Deve chamar `captureException` com `digest`, `route`, `boundary` e `correlation_id`.

## Contrato de not-found.tsx

- Deve oferecer link para o ancestral navegavel mais proximo.
- Deve oferecer link de suporte quando o usuario precisar recuperar acesso ou reportar inconsistencia.
- Nao deve deixar o usuario em deadend.

## Consumers

- TAREFA-007 usa este contrato para detalhes de temas.
- TAREFA-008 usa este contrato para posts e adaptacoes sociais.
- TAREFA-010 usa este contrato para inbox de aprovacao.
- TAREFA-011 usa este contrato para reconciliacao de reunioes.
- TAREFA-012 usa este contrato para analytics e aprendizado.
- TAREFA-013 usa este contrato para detalhes de fontes.
- TAREFA-014 usa este contrato para compliance e scraping auditavel.
- TAREFA-015 usa este contrato para knowledge, pains, patterns e objections.
