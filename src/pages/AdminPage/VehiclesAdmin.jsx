import { useEffect, useState } from 'react'
import { callAdminApi } from '../../api/admin.js'
import SkeletonTableRows from '../../components/SkeletonTableRows/SkeletonTableRows.jsx'
import ImageUploader from '../../components/ImageUploader/ImageUploader.jsx'

const EXTRA_CATEGORIES = ['Баланс', 'Скорость', 'Управление']
const COLUMNS = 6

const EMPTY = {
  id: '', category_id: '', brand: '', model: '', class: '',
  price_day: '', price_week: '', deposit: '0', seats: '', top_speed: '', trunk_capacity: '',
  rating: '5', rents: '0', location: '', badge: '',
  featuresText: '', images: [],
  stageCount: '0', slot2: 'Баланс', slot3: 'Баланс', slot4: 'Баланс',
  priceTiers: [],
}

export default function VehiclesAdmin() {
  const [vehicles, setVehicles] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const [v, c] = await Promise.all([
        callAdminApi('vehicles', 'list'),
        callAdminApi('categories', 'list'),
      ])
      setVehicles(v)
      setCategories(c)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function startEdit(v) {
    setEditingId(v.id)
    const stages = (v.vehicle_stages || []).slice().sort((a, b) => a.position - b.position)
    const tiers = (v.vehicle_price_tiers || []).slice().sort((a, b) => a.min_days - b.min_days)
    setForm({
      id: v.id,
      category_id: v.category_id,
      brand: v.brand,
      model: v.model,
      class: v.class || '',
      price_day: v.price_day ?? '',
      price_week: v.price_week ?? '',
      deposit: v.deposit ?? '0',
      seats: v.seats ?? '',
      top_speed: v.top_speed ?? '',
      trunk_capacity: v.trunk_capacity ?? '',
      rating: v.rating ?? '5',
      rents: v.rents ?? '0',
      location: v.location || '',
      badge: v.badge || '',
      featuresText: (v.features || []).join(', '),
      images: v.images || [],
      stageCount: String(stages.length),
      slot2: stages[1]?.category || 'Баланс',
      slot3: stages[2]?.category || 'Баланс',
      slot4: stages[3]?.category || 'Баланс',
      priceTiers: tiers.map((t) => ({
        minDays: String(t.min_days),
        maxDays: t.max_days == null ? '' : String(t.max_days),
        pricePerDay: String(t.price_per_day),
      })),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY)
  }

  function addTier() {
    setForm((f) => ({ ...f, priceTiers: [...f.priceTiers, { minDays: '', maxDays: '', pricePerDay: '' }] }))
  }

  function updateTier(i, field, value) {
    setForm((f) => {
      const priceTiers = f.priceTiers.slice()
      priceTiers[i] = { ...priceTiers[i], [field]: value }
      return { ...f, priceTiers }
    })
  }

  function removeTier(i) {
    setForm((f) => ({ ...f, priceTiers: f.priceTiers.filter((_, idx) => idx !== i) }))
  }

  // Стейджи: 0 — стоковая; иначе непрерывно 1–4. Слот 1 всегда "База",
  // слоты 2+ — любая из Баланс/Скорость/Управление.
  function buildStagesPayload() {
    const count = Number(form.stageCount)
    if (count === 0) return []
    const stages = [{ position: 1, category: 'База' }]
    if (count >= 2) stages.push({ position: 2, category: form.slot2 })
    if (count >= 3) stages.push({ position: 3, category: form.slot3 })
    if (count >= 4) stages.push({ position: 4, category: form.slot4 })
    return stages
  }

  // Тарифы: пропускаем незаполненные строки (пустое "от" или цену).
  function buildPriceTiersPayload() {
    return form.priceTiers
      .filter((t) => t.minDays !== '' && t.pricePerDay !== '')
      .map((t) => ({
        min_days: Number(t.minDays),
        max_days: t.maxDays === '' ? null : Number(t.maxDays),
        price_per_day: Number(t.pricePerDay),
      }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const vehiclePayload = {
      id: form.id,
      category_id: form.category_id,
      brand: form.brand,
      model: form.model,
      class: form.class,
      price_day: Number(form.price_day),
      price_week: form.price_week === '' ? null : Number(form.price_week),
      deposit: form.deposit === '' ? 0 : Number(form.deposit),
      seats: form.seats === '' ? null : Number(form.seats),
      top_speed: form.top_speed === '' ? null : Number(form.top_speed),
      trunk_capacity: form.trunk_capacity === '' ? null : Number(form.trunk_capacity),
      rating: form.rating === '' ? null : Number(form.rating),
      rents: form.rents === '' ? 0 : Number(form.rents),
      location: form.location,
      badge: form.badge || null,
      features: form.featuresText.split(',').map((s) => s.trim()).filter(Boolean),
      images: form.images,
    }

    try {
      const vehicleId = editingId || form.id
      if (editingId) {
        const { id, ...changes } = vehiclePayload
        await callAdminApi('vehicles', 'update', { id: editingId, changes })
      } else {
        await callAdminApi('vehicles', 'create', vehiclePayload)
        // Машина уже создана: если следующие шаги упадут, повторное
        // сохранение должно быть обновлением, а не вторым create (duplicate key).
        setEditingId(vehicleId)
      }
      await callAdminApi('stages', 'replaceForVehicle', { vehicleId, stages: buildStagesPayload() })
      await callAdminApi('priceTiers', 'replaceForVehicle', { vehicleId, tiers: buildPriceTiersPayload() })
      resetForm()
      load()
    } catch (e) {
      setError(e.message)
      load()
    }
  }

  async function handleToggleRented(v) {
    try {
      await callAdminApi('vehicles', 'update', { id: v.id, changes: { is_rented: !v.is_rented } })
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Удалить машину из каталога?')) return
    try {
      await callAdminApi('vehicles', 'delete', { id })
      if (editingId === id) resetForm()
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const stageCount = Number(form.stageCount)

  return (
    <div className="admin-section">
      <form onSubmit={handleSubmit} className="admin-form admin-form--wide">
        <input
          placeholder="ID (латиницей, напр. straton-comet)"
          value={form.id}
          disabled={!!editingId}
          pattern="[a-z0-9\-]+"
          title="Только строчные латинские буквы, цифры и дефис"
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          required
        />
        <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
          <option value="">Категория…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <input placeholder="Бренд" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required />
        <input placeholder="Модель" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
        <input placeholder="Класс" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} />
        <input type="number" min="0" placeholder="Цена / сутки, ₽ (по умолчанию, если нет тарифов)" value={form.price_day} onChange={(e) => setForm({ ...form, price_day: e.target.value })} required />
        <input type="number" min="0" placeholder="Цена / неделя, ₽ (устарело, необязательно)" value={form.price_week} onChange={(e) => setForm({ ...form, price_week: e.target.value })} />
        <input type="number" min="0" placeholder="Залог, ₽ (0 — без залога)" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} />
        <input type="number" min="1" placeholder="Мест в салоне" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
        <input type="number" min="0" placeholder="Макс. скорость, км/ч" value={form.top_speed} onChange={(e) => setForm({ ...form, top_speed: e.target.value })} />
        <input type="number" min="0" placeholder="Слотов под вещи (напр. 5 или 10)" value={form.trunk_capacity} onChange={(e) => setForm({ ...form, trunk_capacity: e.target.value })} />
        <input type="number" step="0.1" min="0" max="5" placeholder="Рейтинг" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
        <input placeholder="Точка выдачи" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <input placeholder="Бейдж (необязательно)" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} />
        <textarea
          placeholder="Оснащение через запятую"
          value={form.featuresText}
          onChange={(e) => setForm({ ...form, featuresText: e.target.value })}
        />
        <div style={{ gridColumn: 'span 2' }}>
          <ImageUploader images={form.images} onChange={(images) => setForm({ ...form, images })} />
        </div>

        <fieldset className="admin-stages">
          <legend>Стейджи</legend>

          <label className="admin-stages__count">
            Количество стейджей
            <select value={form.stageCount} onChange={(e) => setForm({ ...form, stageCount: e.target.value })}>
              <option value="0">Стоковая (0)</option>
              <option value="1">1 (только База)</option>
              <option value="2">2 (База + 1)</option>
              <option value="3">3 (База + 2)</option>
              <option value="4">4 (База + 3)</option>
            </select>
          </label>

          {stageCount >= 1 && (
            <div className="admin-stages__slots">
              <span className="admin-stages__slot-label">1. База</span>

              {stageCount >= 2 && (
                <label className="admin-stages__slot-label">
                  2.
                  <select value={form.slot2} onChange={(e) => setForm({ ...form, slot2: e.target.value })}>
                    {EXTRA_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              )}

              {stageCount >= 3 && (
                <label className="admin-stages__slot-label">
                  3.
                  <select value={form.slot3} onChange={(e) => setForm({ ...form, slot3: e.target.value })}>
                    {EXTRA_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              )}

              {stageCount >= 4 && (
                <label className="admin-stages__slot-label">
                  4.
                  <select value={form.slot4} onChange={(e) => setForm({ ...form, slot4: e.target.value })}>
                    {EXTRA_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}
        </fieldset>

        <fieldset className="admin-stages admin-price-tiers">
          <legend>Тарифы по срокам аренды (необязательно — без них всегда действует «Цена / сутки» выше)</legend>

          <div className="admin-price-tiers__rows">
            {form.priceTiers.map((t, i) => (
              <div key={i} className="admin-price-tiers__row">
                <input
                  type="number"
                  min="1"
                  placeholder="от, дней"
                  value={t.minDays}
                  onChange={(e) => updateTier(i, 'minDays', e.target.value)}
                />
                <input
                  type="number"
                  min="1"
                  placeholder="до, дней (пусто = без ограничения)"
                  value={t.maxDays}
                  onChange={(e) => updateTier(i, 'maxDays', e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="₽ / сутки в этом диапазоне"
                  value={t.pricePerDay}
                  onChange={(e) => updateTier(i, 'pricePerDay', e.target.value)}
                />
                <button type="button" className="btn btn-outline" onClick={() => removeTier(i)}>×</button>
              </div>
            ))}
          </div>

          <button type="button" className="btn btn-outline" onClick={addTier}>+ Добавить тариф</button>
        </fieldset>

        <div className="admin-form__actions">
          <button type="submit" className="btn btn-primary">{editingId ? 'Сохранить' : 'Добавить'}</button>
          {editingId && <button type="button" className="btn btn-outline" onClick={resetForm}>Отмена</button>}
        </div>
      </form>

      {error && <p className="admin-error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Машина</th>
            <th>Категория</th>
            <th>Цена/сутки</th>
            <th>Занята</th>
            <th>Стейджи</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonTableRows columns={COLUMNS} />
          ) : (
            vehicles.map((v) => (
              <tr key={v.id}>
                <td>{v.brand} {v.model}</td>
                <td>{categories.find((c) => c.id === v.category_id)?.label || v.category_id}</td>
                <td className="mono">{v.price_day}</td>
                <td>
                  {v.is_rented ? (
                    <button type="button" className="btn btn-outline" onClick={() => handleToggleRented(v)}>
                      Освободить
                    </button>
                  ) : (
                    'Нет'
                  )}
                </td>
                <td>
                  {(v.vehicle_stages || []).length === 0
                    ? 'Стоковая'
                    : (v.vehicle_stages || [])
                        .slice()
                        .sort((a, b) => a.position - b.position)
                        .map((s) => s.category)
                        .join(' → ')}
                </td>
                <td>
                  <button type="button" className="btn btn-outline" onClick={() => startEdit(v)}>Изменить</button>
                  <button type="button" className="btn btn-outline" onClick={() => handleDelete(v.id)}>Удалить</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
