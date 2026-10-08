import { Link } from 'react-router-dom'
import usePageMeta from '../../hooks/usePageMeta.js'

export default function NotFoundPage({ title = 'Страница не найдена', text = 'Возможно, ссылка устарела или машину убрали из каталога.' }) {
  usePageMeta('Страница не найдена')
  return (
    <section className="container">
      <div className="not-found">
        <span className="not-found__code">404</span>
        <h1>{title}</h1>
        <p>{text}</p>
        <Link to="/" className="btn btn-primary">Перейти к категориям</Link>
      </div>
    </section>
  )
}
