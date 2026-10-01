import { useState } from 'react'
import { uploadImageToCloudinary } from '../../api/cloudinary.js'
import './ImageUploader.css'

// images — массив URL, первый элемент = обложка в галерее/карточке.
// onChange(newImages) вызывается после загрузки, удаления или смены обложки.
export default function ImageUploader({ images, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    setError(null)
    try {
      const uploaded = []
      for (const file of files) {
        uploaded.push(await uploadImageToCloudinary(file))
      }
      onChange([...images, ...uploaded])
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function removeImage(i) {
    onChange(images.filter((_, idx) => idx !== i))
  }

  function makeCover(i) {
    if (i === 0) return
    const next = images.slice()
    const [item] = next.splice(i, 1)
    next.unshift(item)
    onChange(next)
  }

  return (
    <div className="image-uploader">
      <div className="image-uploader__grid">
        {images.map((src, i) => (
          <div key={src} className={`image-uploader__thumb ${i === 0 ? 'is-cover' : ''}`}>
            <img src={src} alt="" />
            {i === 0 && <span className="image-uploader__badge">Обложка</span>}
            <div className="image-uploader__actions">
              {i !== 0 && (
                <button type="button" onClick={() => makeCover(i)} title="Сделать обложкой">★</button>
              )}
              <button type="button" onClick={() => removeImage(i)} title="Удалить">×</button>
            </div>
          </div>
        ))}

        <label className="image-uploader__add">
          {uploading ? 'Загрузка…' : '+ Добавить фото'}
          <input type="file" accept="image/*" multiple hidden onChange={handleFiles} disabled={uploading} />
        </label>
      </div>

      {error && <p className="image-uploader__error">{error}</p>}
    </div>
  )
}