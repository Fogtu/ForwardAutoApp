import Logo from '../Logo/Logo.jsx'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__row">
        <div>
          <Logo />
          <p className="footer__tagline">Прокат транспорта на MTA Province #6</p>
        </div>

        <div className="footer__col">
          <h5>Сервер</h5>
          <ul>
            <li><a href="#" onClick={(e) => e.preventDefault()}>Правила</a></li>
            <li><a href="#" onClick={(e) => e.preventDefault()}>Discord</a></li>
            <li><a href="#" onClick={(e) => e.preventDefault()}>Форум</a></li>
          </ul>
        </div>

        <div className="footer__col">
          <h5>Поддержка</h5>
          <ul>
            <li><span className="mono">/report</span> в игре</li>
            <li><a href="#" onClick={(e) => e.preventDefault()}>Тикет-система</a></li>
          </ul>
        </div>
      </div>

      <div className="container footer__bottom">
        <p>Forward Auto Rent — вымышленный сервис для игрового сервера MTA. Все машины и бренды не являются реальными.</p>
      </div>
    </footer>
  )
}
