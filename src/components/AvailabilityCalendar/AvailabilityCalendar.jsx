import { useMemo, useState } from 'react'
import { expandRange, todayStr } from '../../utils/availability.js'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const pad = (n) => String(n).padStart(2, '0')

function monthCells(year, month) {
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7 // неделя с понедельника
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const cells = Array.from({ length: offset }, () => null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${pad(month + 1)}-${pad(d)}`)
  return cells
}

// busy — [{ start, end }] занятые диапазоны; selected — { start, end } выбранный период (необязательно).
export default function AvailabilityCalendar({ busy = [], selected, months = 2 }) {
  const [offset, setOffset] = useState(0)
  const today = todayStr()
  const busySet = useMemo(() => new Set(busy.flatMap((r) => expandRange(r.start, r.end))), [busy])

  const base = new Date()
  const items = Array.from({ length: months }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth() + offset + i, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  return (
    <div className="calendar">
      <div className="calendar__nav">
        <button type="button" className="calendar__arrow" onClick={() => setOffset((o) => o - 1)} disabled={offset === 0} aria-label="Раньше">‹</button>
        <button type="button" className="calendar__arrow" onClick={() => setOffset((o) => o + 1)} disabled={offset >= 11} aria-label="Позже">›</button>
      </div>

      <div className="calendar__months">
        {items.map(({ year, month }) => (
          <div key={`${year}-${month}`} className="calendar__month">
            <h4>{MONTHS[month]} {year}</h4>
            <div className="calendar__grid">
              {WEEKDAYS.map((w) => <span key={w} className="calendar__wd">{w}</span>)}
              {monthCells(year, month).map((date, i) => {
                if (!date) return <span key={`e${i}`} />
                const cls = ['calendar__day']
                if (date < today) cls.push('is-past')
                if (date === today) cls.push('is-today')
                if (busySet.has(date)) cls.push('is-busy')
                if (selected && date >= selected.start && date <= selected.end) cls.push('is-selected')
                return <span key={date} className={cls.join(' ')}>{Number(date.slice(8))}</span>
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="calendar__legend">
        <span className="calendar__dot is-busy" /> занято
        <span className="calendar__dot is-free" /> свободно
        {selected && (<><span className="calendar__dot is-selected" /> ваш период</>)}
      </p>
    </div>
  )
}
