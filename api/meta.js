// Vercel Function: отдаёт index.html с мета-тегами конкретной машины
// (title, description, Open Graph), чтобы ссылка красиво выглядела в ВК и мессенджерах —
// их краулеры не выполняют JS и не видят теги, которые ставит React.
// Подключено в vercel.json: /car/:id → /api/meta?id=:id

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function setMeta(html, attr, name, content) {
  const re = new RegExp(`<meta ${attr}="${name}" content="[^"]*"\\s*/?>`)
  const tag = `<meta ${attr}="${name}" content="${esc(content)}" />`
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `    ${tag}\n  </head>`)
}

export default async function handler(req, res) {
  const id = String(req.query.id || '')
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const origin = `${proto}://${req.headers.host}`

  let html
  try {
    html = await (await fetch(`${origin}/index.html`)).text()
  } catch {
    res.status(500).send('Не удалось загрузить страницу')
    return
  }

  try {
    if (SUPABASE_URL && SUPABASE_KEY && /^[a-z0-9-]+$/.test(id)) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/vehicles?id=eq.${encodeURIComponent(id)}&select=brand,model,class,price_day,location,images`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      )
      const [v] = await r.json()
      if (v) {
        const name = `${v.brand} ${v.model}`
        const title = `${name} — аренда | Forward Auto Rent`
        const desc = `${v.class ? v.class + '. ' : ''}Аренда от ${Number(v.price_day).toLocaleString('ru-RU')} ₽ в сутки` +
          `${v.location ? `, выдача: ${v.location}` : ''}. MTA Province #6.`
        const image = v.images && v.images[0] ? v.images[0] : `${origin}/logo.png`

        html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
        html = setMeta(html, 'name', 'description', desc)
        html = setMeta(html, 'property', 'og:title', title)
        html = setMeta(html, 'property', 'og:description', desc)
        html = setMeta(html, 'property', 'og:image', image)
        html = setMeta(html, 'property', 'og:url', `${origin}/car/${id}`)
        html = setMeta(html, 'name', 'twitter:title', title)
        html = setMeta(html, 'name', 'twitter:description', desc)
        html = setMeta(html, 'name', 'twitter:image', image)
      }
    }
  } catch {
    // без мета-данных машины отдаём обычный index.html
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  res.status(200).send(html)
}
