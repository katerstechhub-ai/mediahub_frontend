// Same helpers the Feed page uses, so profile pages never show a blank video tile.

// Still frame generated from a Cloudinary video, used when a post has no saved thumbnail.
export function autoPoster(url, width = 480) {
  if (!url || typeof url !== 'string') return undefined
  if (!url.includes('res.cloudinary.com') || !url.includes('/video/upload/')) return undefined
  const after = url.split('/video/upload/')[1] || ''
  if (!/^v\d+\//.test(after)) return undefined
  return url
    .replace('/video/upload/', `/video/upload/so_0,f_jpg,q_auto,w_${width}/`)
    .replace(/\.\w+(\?.*)?$/, '.jpg')
}

export function isVideoMedia(item) {
  if (!item) return false
  if (item.type === 'video' || item.resourceType === 'video') return true
  return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(item.url || '')
}