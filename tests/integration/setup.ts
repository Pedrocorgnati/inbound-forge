/**
 * Setup global para testes de integração — Inbound Forge
 *
 * Estratégia de isolamento: TRUNCATE por suite + factory functions por teste.
 * Prisma aponta para banco de teste via DATABASE_URL (sobrescrito pelo env de teste).
 *
 * Importante: cada arquivo de teste é responsável por limpar os dados que criou
 * usando afterEach com deletes por prefixo [TEST-*].
 */

import { PrismaClient } from '@prisma/client'
import { beforeAll, afterAll } from 'vitest'

// O banco de teste é definido pelo env DATABASE_URL no contexto de execução.
// Configure .env.test com DATABASE_URL apontando para o banco de teste.
const prisma = new PrismaClient()

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})
