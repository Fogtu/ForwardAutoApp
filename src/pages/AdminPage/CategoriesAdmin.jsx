import { useEffect, useState } from 'react'
import { callAdminApi } from '../../api/admin.js'
import SkeletonTableRows from '../../components/SkeletonTableRows/SkeletonTableRows.jsx'

const EMPTY = { id: '', label: '', kind: 'car', color: '#8CA3C7', description: '' }
const COLUMNS = 5

export default function CategoriesAdmin() {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const data = await callAdminApi('categories', 'list')
      setCategories(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function startEdit(cat) {
    setEditingId(cat.id)
    setForm({
      id: cat.id,
      label: cat.label,
      kind: cat.kind,
      color: cat.color,
      description: cat.description || '',
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      if (editingId) {
        const { id, ...changes } = form
        await callAdminApi('categories', 'update', { id: editingId, changes })
      } else {
        await callAdminApi('categories', 'create', form)
      }
      resetForm()
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Удалить категорию? Все машины внутри тоже нужно будет удалить или перенести заранее.')) return
    try {
      await callAdminApi('categories', 'delete', { id })
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="admin-section">
      <form onSubmit={handleSubmit} className="admin-form">
        <input
          placeholder="ID (латиницей, напр. legkovoy)"
          value={form.id}
          disabled={!!editingId}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          required
        />
        <input
          placeholder="Название"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          required
        />
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
          <option value="car">car</option>
          <option value="truck">truck</option>
          <option value="bus">bus</option>
          <option value="moto">moto</option>
        </select>
        <input
          type="color"
          value={form.color.startsWith('#') ? form.color : '#8CA3C7'}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
        />
        <input
          placeholder="Описание"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="admin-form__actions">
          <button type="submit" className="btn btn-primary">{editingId ? 'Сохранить' : 'Добавить'}</button>
          {editingId && <button type="button" className="btn btn-outline" onClick={resetForm}>Отмена</button>}
        </div>
      </form>

      {error && <p className="admin-error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Название</th>
            <th>Тип</th>
            <th>Цвет</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonTableRows columns={COLUMNS} />
          ) : (
            categories.map((c) => (
              <tr key={c.id}>
                <td className="mono">{c.id}</td>
                <td>{c.label}</td>
                <td>{c.kind}</td>
                <td>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 14,
                      height: 14,
                      background: c.color,
                      borderRadius: 3,
                      verticalAlign: 'middle',
                    }}
                  />
                </td>
                <td>
                  <button type="button" className="btn btn-outline" onClick={() => startEdit(c)}>Изменить</button>
                  <button type="button" className="btn btn-outline" onClick={() => handleDelete(c.id)}>Удалить</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
