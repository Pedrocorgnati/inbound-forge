# Relatorio de usabilidade do cliente final

Workspace escaneado: /home/pedro/Repositórios/systemForge/output/workspace/inbound-forge
Arquivos analisados: 1464
Total de sinais de fricao: 314

## Resumo contavel

- Navegacao sobrecarregada (Miller/Hick): 1
- CTAs concorrentes (Fitts/Von Restorff): 5
- Acao sem feedback (Nielsen H1 / Zero Silencio): 50
- Funcao critica escondida (Nielsen H6 / Progressive Disclosure): 258

## Achados (cada um cruza Arquitetura de Informacao + Hierarquia Visual + Usabilidade)

### 1. Navegacao sobrecarregada

**O que e (linguagem do Sr. Joao da quitanda):** quando um menu ou barra tem itens demais, o cliente nao acha o que quer e desiste. A mente humana segura ~7 opcoes de cada vez (Lei de Miller); passar disso multiplica o tempo de decisao (Lei de Hick).

Este achado e ao mesmo tempo **Arquitetura de Informacao** (a estrutura tem grupos demais no mesmo nivel), **Hierarquia Visual** (nada se destaca quando tudo compete) e **Usabilidade** (o cliente trava ao escolher). Lente Jakob/H8: agrupar e esconder os raros num menu "mais" reduz o peso visual.

- `src/components/blog/BlogManageClient.tsx` — top_level_count=9 (limite 7). Lei: Miller(7+-2) + Hick. Correcao: reduzir itens top-level a <=7; rebaixar raros p/ overflow (Progressive Disclosure), sem deletar.

### 2. CTAs primarios concorrentes

**O que e:** dois ou mais botoes "principais" com o mesmo peso na mesma tela. O cliente nao sabe qual e o caminho certo (Lei de Fitts: o alvo certo deveria ser obvio e facil de acertar; efeito Von Restorff: so o que destoa chama atencao, e se tudo destoa, nada destoa).

Cruza **Hierarquia Visual** (dois botoes gritando igual) e **Usabilidade** (paralisia de decisao). Correcao geral: 1 botao primario por bloco; os outros viram secundarios (ghost/outline).

- `src/app/[locale]/(protected)/approvals/_components/ApprovalCard.tsx` — competing_primary_count=2. Lei: Fitts + Von Restorff + Visual Hierarchy. Correcao: 1 CTA primario por agrupamento; demais em variant neutra (ghost/outline).
- `src/components/knowledge/PainDetailView.tsx` — competing_primary_count=4. Lei: Fitts + Von Restorff + Visual Hierarchy. Correcao: 1 CTA primario por agrupamento; demais em variant neutra (ghost/outline).
- `src/components/consent/CookieConsentBanner.tsx` — competing_primary_count=2. Lei: Fitts + Von Restorff + Visual Hierarchy. Correcao: 1 CTA primario por agrupamento; demais em variant neutra (ghost/outline).
- `src/components/auth/session-expired-banner.tsx` — competing_primary_count=2. Lei: Fitts + Von Restorff + Visual Hierarchy. Correcao: 1 CTA primario por agrupamento; demais em variant neutra (ghost/outline).
- `src/components/ui/ConfirmDialog.tsx` — competing_primary_count=2. Lei: Fitts + Von Restorff + Visual Hierarchy. Correcao: 1 CTA primario por agrupamento; demais em variant neutra (ghost/outline).

### 3. Acao sem feedback (Zero Silencio)

**O que e:** o cliente clica e nada visivel acontece (sem "carregando", sem aviso de sucesso, sem mensagem de erro). Ele fica na duvida se funcionou, clica de novo, ou abandona. Esta e a regra inviolavel **Zero Silencio** (Nielsen H1 - Visibilidade do estado do sistema).

Cruza **Usabilidade** (a acao parece quebrada) e **Hierarquia Visual** (falta o sinal de retorno na tela).

Sao **50** arquivos com handler de acao sem feedback explicito detectavel. Amostra representativa (lista completa em `usability/usability-signals.json`):

- `src/app/global-error.tsx` — handlers=1. Correcao: toda acao precisa de feedback explicito (toast/loading/redirect/erro).
- `src/app/api/v1/posts/[id]/cancel/route.ts` — handlers=1. Correcao: toda acao precisa de feedback explicito (toast/loading/redirect/erro).
- `src/app/[locale]/(protected)/content/error.tsx` — handlers=1. Correcao: toda acao precisa de feedback explicito (toast/loading/redirect/erro).
- `src/app/[locale]/(protected)/knowledge/error.tsx` — handlers=1. Correcao: toda acao precisa de feedback explicito (toast/loading/redirect/erro).
- `src/app/[locale]/(protected)/analytics/error.tsx` — handlers=1. Correcao: toda acao precisa de feedback explicito (toast/loading/redirect/erro).
- `src/app/[locale]/(protected)/themes/[id]/error.tsx` — handlers=1. Correcao: toda acao precisa de feedback explicito (toast/loading/redirect/erro).
- `src/app/[locale]/(protected)/leads/error.tsx` — handlers=1. Correcao: toda acao precisa de feedback explicito (toast/loading/redirect/erro).
- `src/app/[locale]/(protected)/niche-opportunities/page.tsx` — handlers=1. Correcao: toda acao precisa de feedback explicito (toast/loading/redirect/erro).
- `src/app/[locale]/(protected)/dashboard/error.tsx` — handlers=1. Correcao: toda acao precisa de feedback explicito (toast/loading/redirect/erro).
- `src/components/dev/DataTestOverlay.tsx` — handlers=2. Correcao: toda acao precisa de feedback explicito (toast/loading/redirect/erro).
- `src/components/content/CopyToClipboard.tsx` — handlers=1. Correcao: toda acao precisa de feedback explicito (toast/loading/redirect/erro).
- `src/components/blog/BlogSearchInput.tsx` — handlers=1. Correcao: toda acao precisa de feedback explicito (toast/loading/redirect/erro).
- `src/components/sources/SourceAddButton.tsx` — handlers=1. Correcao: toda acao precisa de feedback explicito (toast/loading/redirect/erro).
- `src/components/knowledge/ObjectionCard.tsx` — handlers=4. Correcao: toda acao precisa de feedback explicito (toast/loading/redirect/erro).
- `src/components/knowledge/PatternDetailView.tsx` — handlers=1. Correcao: toda acao precisa de feedback explicito (toast/loading/redirect/erro).
- ... e mais 35 arquivos (ver JSON; nada omitido silenciosamente).

### 4. Funcao critica escondida

**O que e:** uma acao importante esta enterrada fundo demais (3+ niveis a partir da raiz da tarefa). O cliente nao adivinha onde fica e precisa decorar o caminho em vez de reconhece-lo na tela (Nielsen H6 - Reconhecer em vez de lembrar; Progressive Disclosure mal calibrado).

Cruza **Arquitetura de Informacao** (a coisa esta no galho errado da arvore), **Hierarquia Visual** (nao aparece num lugar de destaque) e **Usabilidade** (custa cliques demais). Lente Jakob: caminhos fora do padrao (ex.: logout/acao critica em submenu profundo) quebram a expectativa do cliente.

Sao **258** arquivos com profundidade >=3. Amostra dos mais profundos primeiro (lista completa no JSON):

- `src/app/[locale]/(protected)/knowledge/cases/[id]/edit/page.tsx` — depth=8. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/posts/[id]/publish-assist/_components/PublishAssistWizard.tsx` — depth=8. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/posts/[id]/instagram/_components/InstagramPublisherPanel.tsx` — depth=8. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/posts/[id]/instagram/_components/HashtagsPanel.tsx` — depth=8. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/sources/[id]/_components/SourceDetail.tsx` — depth=7. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/compliance/scraping-audit/_components/ScrapingAuditTable.tsx` — depth=7. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/settings/account/_components/MFAPanel.tsx` — depth=7. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/blog-manage/[slug]/edit/page.tsx` — depth=7. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/blog-manage/[slug]/versions/page.tsx` — depth=7. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/blog-manage/[slug]/review/page.tsx` — depth=7. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/leads/[id]/_components/RevealPIIModal.tsx` — depth=7. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/content/[themeId]/page.tsx` — depth=6. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/themes/[id]/error.tsx` — depth=6. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/themes/[id]/not-found.tsx` — depth=6. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/themes/_components/ThemesTable.tsx` — depth=6. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/themes/_components/ThemesIndex.tsx` — depth=6. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/themes/_components/ThemesFilters.tsx` — depth=6. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/reconciliation/_components/ReconciliationPageClient.tsx` — depth=6. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/approvals/_components/ApprovalCard.tsx` — depth=6. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- `src/app/[locale]/(protected)/approvals/_components/ApprovalsInbox.tsx` — depth=6. Correcao: acao critica deve ser alcancavel em <=2 niveis a partir da raiz da tarefa.
- ... e mais 238 arquivos (ver JSON; nada omitido silenciosamente).

## Como ler este relatorio

Cada item descreve o estado atual do front-end e a correcao sugerida, em linguagem do dia a dia.
Os numeros vem de sinais estaticos contaveis na propria tela - sem nenhum dado de uso.
Profundidade alta (`hidden_functionality`) frequentemente reflete a estrutura `app/[locale]/(grupo)/...` do Next.js; priorize os arquivos onde a acao e de fato uma tarefa do cliente final, nao paginas de erro/layout tecnicas.
