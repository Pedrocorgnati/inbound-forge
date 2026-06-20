const { chromium } = require('@playwright/test')
const PAGES = ['/pt-BR/dashboard','/pt-BR/content','/pt-BR/themes','/pt-BR/leads','/pt-BR/knowledge','/pt-BR/sources','/pt-BR/analytics','/pt-BR/approvals','/pt-BR/assets','/pt-BR/automations','/pt-BR/blog-manage','/pt-BR/broadcasts','/pt-BR/calendar','/pt-BR/compliance','/pt-BR/fila','/pt-BR/forms','/pt-BR/health','/pt-BR/meetings','/pt-BR/niche-opportunities','/pt-BR/profile','/pt-BR/reconciliation','/pt-BR/sequences','/pt-BR/settings','/pt-BR/subscribers','/pt-BR/utm']
;(async()=>{
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  const bad = {}        // path -> Set of "STATUS url"
  const perr = {}       // path -> Set of pageerror text
  let current = ''
  page.on('response', r=>{ const s=r.status(); if(s>=400){ (bad[current]=bad[current]||new Set()).add(`${s} ${r.url().replace('http://localhost:3000','').replace(/\?.*/,'')}`) } })
  page.on('pageerror', e=>{ (perr[current]=perr[current]||new Set()).add(String(e.message).split('\n')[0].slice(0,110)) })

  // login
  await page.goto('http://localhost:3000/pt-BR/login', {waitUntil:'networkidle'})
  await page.waitForTimeout(1000)
  await page.fill('input[type=email]','pedro@corgnati.com')
  await page.fill('input[type=password]','Inbound2026!')
  const tk = page.waitForResponse(r=>r.url().includes('/auth/v1/token'),{timeout:15000}).catch(()=>null)
  await page.click('button[type=submit]')
  await tk
  await page.waitForURL(u=>!u.toString().includes('/login'),{timeout:15000}).catch(()=>{})
  await page.waitForTimeout(1500)

  for(const p of PAGES){
    current = p
    try { await page.goto('http://localhost:3000'+p, {waitUntil:'domcontentloaded', timeout:25000}) }
    catch(e){ (perr[p]=perr[p]||new Set()).add('GOTO_FAIL '+e.message.slice(0,60)) }
    await page.waitForTimeout(2200) // let client fetches fire
  }
  console.log('==== RESULTS ====')
  for(const p of PAGES){
    const b = bad[p]? [...bad[p]] : []
    const e = perr[p]? [...perr[p]] : []
    if(b.length||e.length){ console.log('\n'+p); b.forEach(x=>console.log('  HTTP '+x)); e.forEach(x=>console.log('  ERR  '+x)) }
    else console.log('OK  '+p)
  }
  await browser.close()
})().catch(e=>console.log('FATAL',e.message))
