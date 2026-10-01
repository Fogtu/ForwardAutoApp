import Logo from '../Logo/Logo.jsx'
import './Footer.css'

// Замените на реальную ссылку вашего сообщества
const VK_COMMUNITY_URL = 'https://vk.com/forwardautorent'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__row">
        <div>
          <Logo />
          <p className="footer__tagline">Прокат транспорта на MTA Province #6</p>
        </div>

        <a href={VK_COMMUNITY_URL} target="_blank" rel="noreferrer" className="footer__vk">
          Сообщество ВКонтакте →
        </a>
      </div>
    </footer>
  )
}
