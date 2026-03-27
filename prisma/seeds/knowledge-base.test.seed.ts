/**
 * Seed de Testes — Knowledge Base (module-5)
 * Criado por: auto-flow execute (module-5/TASK-0/ST002)
 *
 * IDs determinísticos para uso em assertions de testes.
 * Idempotente via upsert.
 * NÃO usar em produção.
 */
import type { PrismaClient } from '@prisma/client'

// IDs fixos e determinísticos para fixtures de teste
export const TEST_IDS = {
  cases: {
    case1: 'test-case-kb-001',
    case2: 'test-case-kb-002',
    case3: 'test-case-kb-003',
  },
  pains: {
    pain1: 'test-pain-kb-001',
    pain2: 'test-pain-kb-002',
    pain3: 'test-pain-kb-003',
  },
  patterns: {
    pattern1: 'test-pattern-kb-001',
    pattern2: 'test-pattern-kb-002',
  },
  objections: {
    obj1: 'test-obj-kb-001',
    obj2: 'test-obj-kb-002',
    obj3: 'test-obj-kb-003',
    obj4: 'test-obj-kb-004',
    obj5: 'test-obj-kb-005',
  },
} as const

export async function seedKnowledgeBaseTest(prisma: PrismaClient) {
  console.log('🧪 [TEST] Iniciando seed de teste da Knowledge Base...')

  // PainLibraryEntries (3 fixtures)
  await Promise.all([
    prisma.painLibraryEntry.upsert({
      where: { id: TEST_IDS.pains.pain1 },
      update: {},
      create: {
        id: TEST_IDS.pains.pain1,
        title: '[TEST] Dor de teste 1 — Falta de visibilidade',
        description: 'Descrição determinística para testes de integração da knowledge base',
        sectors: ['test-sector-A'],
        status: 'VALIDATED',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: TEST_IDS.pains.pain2 },
      update: {},
      create: {
        id: TEST_IDS.pains.pain2,
        title: '[TEST] Dor de teste 2 — CAC elevado',
        description: 'Segunda dor de teste com category diferente',
        sectors: ['test-sector-B'],
        status: 'DRAFT',
      },
    }),
    prisma.painLibraryEntry.upsert({
      where: { id: TEST_IDS.pains.pain3 },
      update: {},
      create: {
        id: TEST_IDS.pains.pain3,
        title: '[TEST] Dor de teste 3 — Ciclo longo',
        description: 'Terceira dor para testes de filtro e paginação',
        sectors: ['test-sector-A', 'test-sector-B'],
        status: 'VALIDATED',
      },
    }),
  ])
  console.log('  ✓ PainLibraryEntries (test): 3')

  // CaseLibraryEntries (3 fixtures) — com isDraft para testes de autosave
  await Promise.all([
    prisma.caseLibraryEntry.upsert({
      where: { id: TEST_IDS.cases.case1 },
      update: {},
      create: {
        id: TEST_IDS.cases.case1,
        name: '[TEST] Case 1 — Resultado >= 50 chars publicado e verificado aqui',
        sector: 'test-sector-A',
        systemType: 'inbound-test',
        outcome: '[TEST] Resultado publicado com pelo menos cinquenta caracteres para validação do critério de aceite',
        hasQuantifiableResult: true,
        isDraft: false,
        status: 'VALIDATED',
      },
    }),
    prisma.caseLibraryEntry.upsert({
      where: { id: TEST_IDS.cases.case2 },
      update: {},
      create: {
        id: TEST_IDS.cases.case2,
        name: '[TEST] Case 2 — Rascunho em edição',
        sector: 'test-sector-B',
        systemType: 'inbound-test',
        outcome: '[TEST] Resultado em rascunho ainda sendo editado pelo operador',
        hasQuantifiableResult: false,
        isDraft: true,
        status: 'DRAFT',
      },
    }),
    prisma.caseLibraryEntry.upsert({
      where: { id: TEST_IDS.cases.case3 },
      update: {},
      create: {
        id: TEST_IDS.cases.case3,
        name: '[TEST] Case 3 — Para teste de ownership e delete',
        sector: 'test-sector-A',
        systemType: 'inbound-test',
        outcome: '[TEST] Este case é usado nos testes de delete com confirmação e audit log',
        hasQuantifiableResult: true,
        isDraft: false,
        status: 'VALIDATED',
      },
    }),
  ])
  console.log('  ✓ CaseLibraryEntries (test): 3')

  // CasePain links — pain1 → case1 e case2
  await Promise.all([
    prisma.casePain.upsert({
      where: { caseId_painId: { caseId: TEST_IDS.cases.case1, painId: TEST_IDS.pains.pain1 } },
      update: {},
      create: { caseId: TEST_IDS.cases.case1, painId: TEST_IDS.pains.pain1 },
    }),
    prisma.casePain.upsert({
      where: { caseId_painId: { caseId: TEST_IDS.cases.case2, painId: TEST_IDS.pains.pain1 } },
      update: {},
      create: { caseId: TEST_IDS.cases.case2, painId: TEST_IDS.pains.pain1 },
    }),
  ])
  console.log('  ✓ CasePain links (test): 2')

  // SolutionPatterns (2 fixtures)
  await Promise.all([
    prisma.solutionPattern.upsert({
      where: { id: TEST_IDS.patterns.pattern1 },
      update: {},
      create: {
        id: TEST_IDS.patterns.pattern1,
        name: '[TEST] Padrão 1 — Blog SEO',
        description: 'Padrão de teste referenciando pain1 e case1',
        painId: TEST_IDS.pains.pain1,
        caseId: TEST_IDS.cases.case1,
      },
    }),
    prisma.solutionPattern.upsert({
      where: { id: TEST_IDS.patterns.pattern2 },
      update: {},
      create: {
        id: TEST_IDS.patterns.pattern2,
        name: '[TEST] Padrão 2 — LinkedIn',
        description: 'Padrão de teste referenciando pain2 e case2',
        painId: TEST_IDS.pains.pain2,
        caseId: TEST_IDS.cases.case2,
      },
    }),
  ])
  console.log('  ✓ SolutionPatterns (test): 2')

  // Objections (5 fixtures — tipos variados)
  await Promise.all([
    prisma.objection.upsert({
      where: { id: TEST_IDS.objections.obj1 },
      update: {},
      create: { id: TEST_IDS.objections.obj1, content: '[TEST] Objeção 1 — Preço muito alto', type: 'PRICE', status: 'VALIDATED' },
    }),
    prisma.objection.upsert({
      where: { id: TEST_IDS.objections.obj2 },
      update: {},
      create: { id: TEST_IDS.objections.obj2, content: '[TEST] Objeção 2 — Não confio no resultado', type: 'TRUST', status: 'VALIDATED' },
    }),
    prisma.objection.upsert({
      where: { id: TEST_IDS.objections.obj3 },
      update: {},
      create: { id: TEST_IDS.objections.obj3, content: '[TEST] Objeção 3 — Não é o momento', type: 'TIMING', status: 'DRAFT' },
    }),
    prisma.objection.upsert({
      where: { id: TEST_IDS.objections.obj4 },
      update: {},
      create: { id: TEST_IDS.objections.obj4, content: '[TEST] Objeção 4 — Não precisamos disso', type: 'NEED', status: 'VALIDATED' },
    }),
    prisma.objection.upsert({
      where: { id: TEST_IDS.objections.obj5 },
      update: {},
      create: { id: TEST_IDS.objections.obj5, content: '[TEST] Objeção 5 — Não sou o decisor', type: 'AUTHORITY', status: 'VALIDATED' },
    }),
  ])
  console.log('  ✓ Objections (test): 5')

  console.log('✅ [TEST] Seed de teste da Knowledge Base concluído!')
}
