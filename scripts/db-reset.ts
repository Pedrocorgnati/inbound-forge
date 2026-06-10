#!/usr/bin/env tsx
/**
 * DB Reset — wipe + reseed para desenvolvimento.
 * TASK-16 ST003 (CL-312)
 *
 * Segurança: aborta em production.
 * Uso: npm run db:reset
 */
import { execSync } from 'child_process'
import * as readline from 'readline'

const env = process.env.NODE_ENV ?? 'development'

if (env === 'production') {
  console.error('❌ db:reset PROIBIDO em production. Abortando.')
  process.exit(1)
}

function ask(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close()
      resolve(ans.trim().toLowerCase() === 's' || ans.trim().toLowerCase() === 'y')
    })
  })
}

async function main() {
  console.log(`\n🔴 DB RESET — ambiente: ${env}`)
  console.log('   Isso apagará TODOS os dados do banco local.\n')

  const confirm = await ask('Confirmar reset? (s/N): ')
  if (!confirm) {
    console.log('Cancelado.')
    process.exit(0)
  }

  console.log('\n1️⃣  Resetando banco (migrate reset)...')
  execSync('npx prisma migrate reset --force --skip-seed', { stdio: 'inherit' })

  console.log('\n2️⃣  Executando seed base...')
  execSync('npx prisma db seed', { stdio: 'inherit' })

  const withDemo = await ask('\n3️⃣  Executar seed demo também? (s/N): ')
  if (withDemo) {
    console.log('   Executando seed demo...')
    execSync('npx tsx prisma/seed-demo.ts', { stdio: 'inherit' })
  }

  console.log('\n✓ DB reset concluído.')
}

main().catch((e) => {
  console.error('❌ db:reset falhou:', e)
  process.exit(1)
})
