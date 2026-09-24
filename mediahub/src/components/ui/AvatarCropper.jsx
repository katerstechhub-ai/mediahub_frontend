import { useEffect, useRef, useState } from 'react'
import { FiCheck, FiMinus, FiPlus, FiX } from 'react-icons/fi'

const VIEWPORT = 280

export default function AvatarCropper({ file, onCancel, onConfirm }) {
  const [src, setSrc] = useState('')
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const imageRef = useRef(null)
  const dragRef = useRef(null)

  useEffect(() => {
    if (!file) return undefined
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const getBaseScale = () => {
    const image = imageRef.current
    if (!image?.naturalWidth || !image?.naturalHeight) return 1
    return Math.max(VIEWPORT / image.naturalWidth, VIEWPORT / image.naturalHeight)
  }

  const clampOffset = (next, scale = zoom) => {
    const image = imageRef.current
    if (!image?.naturalWidth) return next
    const width = image.naturalWidth * getBaseScale() * scale
    const height = image.naturalHeight * getBaseScale() * scale
    return {
      x: Math.max(-(width - VIEWPORT) / 2, Math.min((width - VIEWPORT) / 2, next.x)),
      y: Math.max(-(height - VIEWPORT) / 2, Math.min((height - VIEWPORT) / 2, next.y)),
    }
  }

  const exportCrop = () => {
    const image = imageRef.current
    if (!image) return
    const scale = getBaseScale() * zoom
    const width = image.naturalWidth * scale
    const height = image.naturalHeight * scale
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, 512, 512)
    const translateX = (VIEWPORT - width) / 2 + offset.x
    const translateY = (VIEWPORT - height) / 2 + offset.y
    const sourceX = Math.max(0, -translateX / scale)
    const sourceY = Math.max(0, -translateY / scale)
    const sourceSize = VIEWPORT / scale
    ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 512, 512)
    canvas.toBlob((blob) => {
      if (!blob) return
      onConfirm(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.9)
  }

  const onPointerDown = (event) => {
    dragRef.current = { x: event.clientX, y: event.clientY, offset }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const onPointerMove = (event) => {
    if (!dragRef.current) return
    setOffset(clampOffset({ x: dragRef.current.offset.x + event.clientX - dragRef.current.x, y: dragRef.current.offset.y + event.clientY - dragRef.current.y }))
  }
  const stopDrag = () => { dragRef.current = null }

  if (!file || !src) return null

  const scale = getBaseScale() * zoom
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-[28px] border p-5 shadow-2xl" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Adjust profile photo</h2>
          <button type="button" onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}><FiX size={16} /></button>
        </div>
        <div className="mx-auto h-[280px] w-[280px] cursor-grab touch-none overflow-hidden rounded-full bg-black active:cursor-grabbing" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
          <img ref={imageRef} src={src} alt="Crop preview" onLoad={() => setOffset({ x: 0, y: 0 })} className="pointer-events-none h-auto max-w-none select-none" style={{ width: imageRef.current ? imageRef.current.naturalWidth * scale : 'auto', transform: `translate(${(VIEWPORT - (imageRef.current?.naturalWidth || VIEWPORT) * scale) / 2 + offset.x}px, ${(VIEWPORT - (imageRef.current?.naturalHeight || VIEWPORT) * scale) / 2 + offset.y}px)` }} draggable={false} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <FiMinus size={15} style={{ color: 'var(--text-muted)' }} />
          <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => { const next = Number(e.target.value); setZoom(next); setOffset(clampOffset(offset, next)) }} className="w-full accent-amber-500" aria-label="Zoom avatar" />
          <FiPlus size={15} style={{ color: 'var(--text-muted)' }} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
          <button type="button" onClick={exportCrop} className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white"><FiCheck size={15} /> Use photo</button>
        </div>
      </div>
    </div>
  )
}
