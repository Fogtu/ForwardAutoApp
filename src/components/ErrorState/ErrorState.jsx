// Состояние ошибки загрузки с кнопкой «Повторить» — вместо молчаливого редиректа.
export default function ErrorState({ title = 'Не удалось загрузить данные', text = 'Проверьте соединение и попробуйте ещё раз.', onRetry }) {
  return (
    <div className="error-state" role="alert">
      <h3>{title}</h3>
      <p>{text}</p>
      {onRetry && (
        <button type="button" className="btn btn-outline" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  )
}
