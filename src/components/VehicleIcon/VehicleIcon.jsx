// Единый набор силуэтов техники. kind выбирает форму, color — цвет корпуса,
// так каталог остаётся стилистически цельным, но типы техники различимы.
export default function VehicleIcon({ kind = 'car', color = 'var(--cat-legkovoy)', className = '', style }) {
  return (
    <svg viewBox="0 0 240 120" className={className} style={style} role="img" aria-hidden="true">
      <line x1="0" y1="98" x2="240" y2="98" stroke="var(--line-strong)" strokeWidth="1.5" strokeDasharray="8 7" />
      {kind === 'truck' && <TruckShape color={color} />}
      {kind === 'bus' && <BusShape color={color} />}
      {kind === 'moto' && <MotoShape color={color} />}
      {(kind === 'car' || !kind) && <CarShape color={color} />}
    </svg>
  )
}

function CarShape({ color }) {
  return (
    <>
      <path
        d="M18 90 C18 78 26 70 40 68 L58 66 L76 40 C82 32 92 27 103 27 L150 27 C161 27 171 32 178 41 L196 66 C212 68 222 76 222 90 L222 92 C222 96 219 99 215 99 L205 99 C205 90 198 83 189 83 C180 83 173 90 173 99 L83 99 C83 90 76 83 67 83 C58 83 51 90 51 99 L26 99 C21 99 18 95 18 90 Z"
        fill={color}
        stroke="var(--bg)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M92 40 L103 40 C97 40 92 45 90 51 L86 63 L70 63 Z" fill="var(--bg)" opacity="0.28" />
      <path d="M108 40 L150 40 C157 40 163 43 167 49 L174 62 L108 62 Z" fill="var(--bg)" opacity="0.28" />
      <circle cx="67" cy="99" r="16" fill="var(--bg-card)" stroke="var(--line-strong)" strokeWidth="1.5" />
      <circle cx="67" cy="99" r="6" fill="var(--bg)" />
      <circle cx="189" cy="99" r="16" fill="var(--bg-card)" stroke="var(--line-strong)" strokeWidth="1.5" />
      <circle cx="189" cy="99" r="6" fill="var(--bg)" />
    </>
  )
}

function TruckShape({ color }) {
  return (
    <>
      <path
        d="M14 92 L14 58 C14 52 18 48 24 48 L54 48 L70 30 C73 27 77 25 81 25 L98 25 C103 25 106 29 106 34 L106 48 L200 48 C210 48 218 56 218 66 L218 92 L214 92 C214 84 207 78 199 78 C191 78 184 84 184 92 L98 92 C98 84 91 78 83 78 C75 78 68 84 68 92 L14 92 Z"
        fill={color}
        stroke="var(--bg)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="78" y="34" width="22" height="14" rx="2" fill="var(--bg)" opacity="0.3" />
      <circle cx="83" cy="92" r="15" fill="var(--bg-card)" stroke="var(--line-strong)" strokeWidth="1.5" />
      <circle cx="83" cy="92" r="5.5" fill="var(--bg)" />
      <circle cx="199" cy="92" r="15" fill="var(--bg-card)" stroke="var(--line-strong)" strokeWidth="1.5" />
      <circle cx="199" cy="92" r="5.5" fill="var(--bg)" />
    </>
  )
}

function BusShape({ color }) {
  return (
    <>
      <rect x="16" y="34" width="204" height="56" rx="10" fill={color} stroke="var(--bg)" strokeWidth="2" />
      {[36, 66, 96, 126, 156, 186].map((x) => (
        <rect key={x} x={x} y="44" width="20" height="16" rx="2" fill="var(--bg)" opacity="0.28" />
      ))}
      <rect x="16" y="72" width="204" height="6" fill="var(--bg)" opacity="0.16" />
      <circle cx="56" cy="92" r="14" fill="var(--bg-card)" stroke="var(--line-strong)" strokeWidth="1.5" />
      <circle cx="56" cy="92" r="5" fill="var(--bg)" />
      <circle cx="182" cy="92" r="14" fill="var(--bg-card)" stroke="var(--line-strong)" strokeWidth="1.5" />
      <circle cx="182" cy="92" r="5" fill="var(--bg)" />
    </>
  )
}

function MotoShape({ color }) {
  return (
    <>
      <path
        d="M70 70 L108 70 L128 50 L150 50 L158 62 L140 62 L130 76 L108 90 L92 90 C88 78 80 71 70 70 Z"
        fill={color}
        stroke="var(--bg)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="128" y="44" width="26" height="8" rx="3" fill="var(--bg)" opacity="0.3" />
      <circle cx="66" cy="92" r="18" fill="var(--bg-card)" stroke="var(--line-strong)" strokeWidth="1.5" />
      <circle cx="66" cy="92" r="7" fill="var(--bg)" />
      <circle cx="168" cy="92" r="18" fill="var(--bg-card)" stroke="var(--line-strong)" strokeWidth="1.5" />
      <circle cx="168" cy="92" r="7" fill="var(--bg)" />
      <path d="M108 90 L168 90" stroke={color} strokeWidth="4" strokeLinecap="round" />
    </>
  )
}
