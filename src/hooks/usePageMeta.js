import { useEffect } from 'react'

// Ставит title и description страницы (для вкладки браузера и поисковиков, исполняющих JS).
// Для превью ссылок в ВК используется api/meta.js на стороне Vercel.
export default function usePageMeta(title, description) {
  useEffect(() => {
    const prevTitle = document.title
    const meta = document.querySelector('meta[name="description"]')
    const prevDesc = meta ? meta.getAttribute('content') : null

    if (title) document.title = `${title} | Forward Auto Rent`
    if (description && meta) meta.setAttribute('content', description)

    return () => {
      document.title = prevTitle
      if (meta && prevDesc != null) meta.setAttribute('content', prevDesc)
    }
  }, [title, description])
}
