import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSearch, FiX, FiGrid } from 'react-icons/fi'
import { usePostStore } from '../store'
import { EmptyState, Avatar } from '../components/ui'

export default function ExplorePage() {
  const { posts, isLoading, fetchPosts } = usePostStore()
  const [filtered, setFiltered] = useState([])
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const inputRef = useRef()

  useEffect(() => {
    fetchPosts()
  }, [])

  useEffect(() => {
    if (!query.trim()) { 
      setFiltered(posts); 
      return 
    }
    const q = query.toLowerCase()
    setFiltered(posts.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.content?.toLowerCase().includes(q) ||
      p.caption?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q)) ||
      p.author?.name?.toLowerCase().includes(q)
    ))
  }, [query, posts])

  const getImageUrl = (post) => {
    if (!post) return null
    if (post.image?.url) return post.image.url
    if (post.image && typeof post.image === 'string') return post.image
    if (post.media && post.media.length > 0) {
      const mediaItem = post.media[0]
      return mediaItem.url || mediaItem || post.media
    }
    if (post.imageUrl) return post.imageUrl
    if (post.thumbnail) return post.thumbnail
    if (post.url) return post.url
    return null
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen fade-in" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Search bar */}
        <div className="relative max-w-2xl mx-auto mb-6">
          <FiSearch 
            size={20} 
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" 
            style={{ color: 'var(--text-muted)', zIndex: 10 }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search posts, tags, people…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full py-3 pl-12 pr-12 text-sm outline-none border-2 focus:border-amber-500 transition-all"
            style={{ 
              background: 'var(--bg-input)', 
              color: 'var(--text-primary)', 
              borderColor: 'var(--border)',
              paddingLeft: '48px',
              paddingRight: '48px'
            }}
          />
          {query && (
            <button 
              onClick={() => setQuery('')} 
              className="absolute right-4 top-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
              style={{ color: 'var(--text-muted)' }}
            >
              <FiX size={18} />
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState 
            icon={FiGrid} 
            title={query ? "No results found" : "No posts yet"} 
            description={query ? `Nothing found for "${query}"` : 'Be the first to share something amazing!'} 
            action={
              !query && (
                <button
                  onClick={() => navigate('/create')}
                  className="text-sm font-semibold transition-colors hover:text-amber-500"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Create Post
                </button>
              )
            }
          />
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {filtered.map((post) => {
              const imageUrl = getImageUrl(post)
              const displayText = post.title || post.content || post.caption || 'Untitled'
              
              return (
                <div
                  key={post._id || post.id}
                  onClick={() => navigate(`/posts/${post._id || post.id}`)}
                  className="break-inside-avoid cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  {imageUrl ? (
                    <div className="relative">
                      <img
                        src={imageUrl}
                        alt={displayText}
                        className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          console.error('Image failed to load:', imageUrl)
                          e.target.style.display = 'none'
                          const parent = e.target.parentElement
                          const fallback = document.createElement('div')
                          fallback.className = 'p-4 min-h-[150px] flex items-center justify-center'
                          fallback.style.cssText = 'background: var(--bg-secondary)'
                          fallback.innerHTML = `<p class="text-sm text-center line-clamp-4" style="color: var(--text-secondary)">${displayText}</p>`
                          parent.appendChild(fallback)
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <p className="text-white text-sm font-medium line-clamp-2">{displayText}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 min-h-[150px] flex items-center justify-center">
                      <p className="text-sm text-center line-clamp-4" style={{ color: 'var(--text-secondary)' }}>
                        {displayText}
                      </p>
                    </div>
                  )}
                  
                  {/* Author info */}
                  <div className="p-3 flex items-center gap-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <Avatar src={post.author?.avatar} name={post.author?.name} size={24} />
                    <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      {post.author?.name || 'Unknown'}
                    </span>
                    {post.likes && post.likes.length > 0 && (
                      <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                        ❤️ {post.likes.length}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}