import './SkeletonTableRows.css'

// columns — число ячеек в ряду таблицы, rows — сколько строк показать
export default function SkeletonTableRows({ columns, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c}>
              <span className="skeleton-row-cell skeleton-shimmer" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
