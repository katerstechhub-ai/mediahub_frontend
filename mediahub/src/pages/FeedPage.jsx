import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useNavigationType } from 'react-router-dom'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import {
  FiImage, FiHeart, FiMessageCircle, FiPlusSquare, FiGrid, FiList,
  FiCopy, FiSearch, FiX, FiDownload, FiLoader,
  FiCalendar, FiMapPin, FiVolume2, FiVolumeX, FiPlay,
  FiChevronLeft, FiChevronRight, FiExternalLink
} from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa'
import api, { postsAPI, getDownloadUrl } from '../api'
import { useAuthStore } from '../store'
import { feedCache } from '../lib/feedCache'
import { Avatar } from '../components/ui'
import { getMediaItems, MediaSlider, useMediaAspect } from '../components/PostMedia'
import CardSpread from '../components/ui/card-spread'
import Stack from '../components/ui/Stack'
import BounceCards from '../components/ui/BounceCards'
import DepthCarousel from '../components/ui/DepthCarousel'
import DollyGallery from '../components/ui/DollyGallery'
import MemoryVideo from '../components/ui/MemoryVideo'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const APPLE_GLASS = {
  background: 'color-mix(in srgb, var(--bg-primary) 78%, transparent)',
  border: '1px solid color-mix(in srgb, var(--border) 76%, transparent)',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
  backdropFilter: 'saturate(150%) blur(18px)',
  WebkitBackdropFilter: 'saturate(150%) blur(18px)',
}

const APPLE_TOUCH = 'min-h-[44px] min-w-[44px]'

// Grid tiles are clipped to a curved shape (#feed-tile-clip, defined in the return of FeedPage),
// which cuts the corners off. Corner overlays sit further in so they are never clipped.
// Percentages are of the tile, so they scale with it. Raise a number to move the item further in.
const TILE_AVATAR_POS = { top: '8%', left: '9%' }
const TILE_BADGE_POS = { top: '10%', right: '11%' }

import gallery1 from '../assets/gallery-1.jpeg'
import gallery2 from '../assets/gallery-2.jpeg'
// import gallery3 from '../assets/gallery-3.jpeg'
import gallery4 from '../assets/gallery-4.jpeg'
import gallery5 from '../assets/gallery-5.jpeg'
import pamsSolo from '../assets/pams-solo.jpeg'
import bizzerSolo from '../assets/bizzer-solo.jpeg'

/* ─────────── Global sound state (only one video audible at a time) ─────────── */

const SoundBus = (() => {
  let currentId = null
  const listeners = new Set()
  return {
    setActive(id) {
      currentId = id
      listeners.forEach((l) => l(id))
    },
    getActive: () => currentId,
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
})()

/* ─────────── Wedding Hero ───────────
   `position` is a CSS object-position value. Portrait photos in a wide
   16:9 / 21:9 banner get cropped top & bottom by default object-cover
   centering — that's what was slicing off faces. Each slide can now say
   where its focal point (the face) actually is, so cropping happens
   around it instead of through it. Tune these percentages per photo if a
   face still isn't framed the way you want — lower % = crop favors the
   top of the image, higher % = crop favors the bottom. */
const WEDDING_SLIDES = [
  { url: gallery2, caption: 'Two hearts, one journey', position: 'center 15%' },
  { url: gallery1, caption: 'Where forever begins', position: 'center 12%' },
  // { url: gallery3, caption: 'Golden hour, golden vows', position: 'center 20%' },
  { url: gallery4, caption: 'Dancing into forever', position: 'center 18%' },
  { url: gallery5, caption: 'Love', position: 'center 15%' },
  { url: pamsSolo, caption: 'The bride', position: 'center 10%' },
  { url: bizzerSolo, caption: 'The groom', position: 'center 10%' },
]

function WeddingHero() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % WEDDING_SLIDES.length), 5000)
    return () => clearInterval(t)
  }, [])

  const slide = WEDDING_SLIDES[index]

  return (
    <section className="relative w-full">
      <div className="relative overflow-hidden aspect-[16/9] sm:aspect-[21/9]">
        <AnimatePresence mode="sync">
          <motion.img
            key={slide.url}
            src={slide.url}
            alt={slide.caption}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: slide.position || 'center 20%' }}
          />
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/10 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/45 to-transparent pointer-events-none" />

        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-10 md:p-14 pb-16 sm:pb-24 pt-24 sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <span className="inline-block text-[10px] sm:text-xs tracking-[0.3em] uppercase text-amber-300 font-semibold mb-2 sm:mb-3">
              You're invited
            </span>
            <h1
              className="font-display text-white font-extrabold leading-[0.95] tracking-tight"
              style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)' }}
            >
              Paloma <span className="italic font-light text-amber-300">&</span> Kenneth
            </h1>

            <AnimatePresence mode="wait">
              <motion.p
                key={slide.caption}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5 }}
                className="mt-2 sm:mt-3 text-white/85 text-sm sm:text-lg italic max-w-lg"
              >
                “{slide.caption}”
              </motion.p>
            </AnimatePresence>

            <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-3 sm:gap-5 text-white text-xs sm:text-sm">
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md"
                style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <FiCalendar size={14} /> November 21, 2026
              </span>
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md"
                style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <FiMapPin size={14} /> Luxe Lush Park @Riverplate Park, 70 Kur Mohammed Avenue, Wuse 2, Abuja
              </span>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-8 sm:bottom-12 right-4 sm:right-8 flex gap-1.5 z-10">
          {WEDDING_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: i === index ? 28 : 8,
                background: i === index ? '#fbbf24' : 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </div>

        <div
          className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none z-[5]"
          style={{ background: 'linear-gradient(to bottom, transparent 0%, var(--bg-primary) 100%)' }}
        />
      </div>
    </section>
  )
}


/* ─────────── Card Spread — keeps the wedding memories tactile and playful ─────────── */
const MEMORY_CARDS = [
  { src: gallery1, alt: 'Paloma and Kenneth celebrating together', id: 'celebration' },
  { src: gallery2, alt: 'A quiet moment between Paloma and Kenneth', id: 'together' },
  { src: gallery4, alt: 'Dancing into forever', id: 'dancing' },
  { src: gallery5, alt: 'A joyful wedding memory', id: 'joy' },
  { src: pamsSolo, alt: 'Portrait of the bride', id: 'bride' },
  { src: bizzerSolo, alt: 'Portrait of the groom', id: 'groom' },
]

function MemoryCardSpread() {
  return (
    <section
      className="relative overflow-visible px-2 py-4 sm:px-4 sm:py-6"
    >
      <div className="relative z-30 mb-1 flex justify-end px-2 sm:px-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-600/90">
          Memories
        </span>
      </div>

      <div className="relative z-10 mx-auto h-[280px] w-full max-w-5xl sm:h-[340px]">
        <CardSpread
          cards={MEMORY_CARDS}
          cardWidth={150}
          cardHeight={225}
          cardRadius={14}
          radius={390}
          arc={76}
          cardColor="#fffdf8"
          cardPadding={5}
          borderColor="rgba(245, 158, 11, 0.22)"
          shadow={0.24}
          lift={30}
          push={4}
          pushReach={2}
          restOpacity={0.96}
          stiffness={170}
          damping={18}
          stagger={0.07}
          fit
          maxScale={1}
          interactive
          className="h-full w-full"
        />
      </div>
    </section>
  )
}

function MemoryDollyGallery() {
  return (
    <section className="relative isolate mt-12 mb-16 overflow-hidden py-8 sm:mt-16 sm:mb-24 sm:py-12">
      <div className="relative z-[200] flex justify-end px-5 pt-4 sm:px-7 sm:pt-5">
        <span className="hidden text-[10px] font-bold uppercase tracking-[0.24em] text-amber-600/90 sm:inline">Memories</span>
      </div>
      <DollyGallery
        images={MEMORY_CARDS}
        itemWidth={250}
        aspectRatio={0.78}
        borderRadius={24}
        spacing={640}
        spread={0.42}
        revealRange={2}
        passRange={1}
        grayscale={0.04}
        autoScroll={2400}
        className="mt-4 sm:mt-6 [&_*]:!border-0 [&_*]:!shadow-none"
      />
    </section>
  )
}

/* ─────────── shared media helpers ─────────── */

function isVideoItem(item) {
  if (!item) return false
  if (item.type === 'video') return true
  if (item.resourceType === 'video') return true
  return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(item.url || '')
}

function MultiImageBadge({ count, style }) {
  if (!count || count < 2) return null
  return (
    <div style={style} className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold leading-none shadow">
      {/* thin "stack of photos" glyph — stroke 1.8 keeps it fine at this size */}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3.5" y="8" width="12.5" height="12.5" rx="3.2" />
        <path d="M8 4.5h8.5A3.5 3.5 0 0 1 20 8v8.5" />
      </svg>
      {count}
    </div>
  )
}

function isVideoMedia(item) {
  if (!item) return false
  if (item.type === 'video' || item.resourceType === 'video') return true
  return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(item.url || '')
}

function MultiMediaShowcase({ items, postId, onOpen, compact = false, contain = false, bare = false, badgeStyle }) {
  const visibleItems = items.slice(0, 6).map((item) => ({
    type: isVideoMedia(item) ? 'video' : 'image',
    src: item.url,
    poster: item.thumbnail || item.url,
    alt: 'Memory',
  }))

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className={`relative block w-full overflow-hidden ${bare ? '' : 'rounded-3xl border border-black/[0.06] shadow-[0_12px_30px_rgba(15,23,42,0.08)]'} bg-[var(--bg-secondary)] p-0 text-left ${compact ? 'h-full min-h-[190px]' : 'h-[360px] sm:h-[440px]'}`}
      aria-label="Open multiple memories"
    >
      <DepthCarousel
        items={visibleItems}
        cardWidth={contain ? 330 : compact ? 250 : 360}
        cardHeight={contain ? 300 : compact ? 300 : 430}
        radius={22}
        depth={contain ? 120 : compact ? 150 : 220}
        spread={contain ? 42 : compact ? 48 : 72}
        tilt={contain ? 12 : 18}
        visibleCards={contain ? 3 : 4}
        autoplay
        autoplayDelay={3500}
        loop
        showControls={false}
        showIndicators={false}
        fill
        contain={contain}
        className="h-full w-full"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[125] h-20 bg-gradient-to-t from-black/25 to-transparent" />
      <MultiImageBadge count={items.length} style={badgeStyle} />
    </div>
  )
}

/* Deterministic rotation from post id so tiles don't jump on re-render */
function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/* ─────────── Boomerang video (muted, ping-pong) ─────────── */

// `isActive`: true when this is the slide currently showing inside a
// multi-media post's MediaSlider (always true for single-media posts).
// The component also tracks real viewport visibility itself, the same way
// FeedVideo does below. Both gates must be true before anything plays.
//
// Previously this autoplayed — and kept running its own requestAnimationFrame
// reverse-playback loop — the instant it mounted, regardless of whether it
// was on screen or the active slide in its post's slider. With several
// video posts in the feed (or several videos inside one post), that meant
// many videos decoding and many rAF loops running simultaneously, which is
// exactly what made dragging through a slider and scrolling the feed feel
// slow. Now a tile only animates while it's both visible and active.
function BoomerangVideo({ src, poster, className, style, onClick, isActive = true }) {
  const videoRef = useRef(null)
  const wrapRef = useRef(null)
  const rafRef = useRef(null)
  const lastTimeRef = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const shouldPlay = isActive && inView

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    if (!shouldPlay) {
      video.pause()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastTimeRef.current = null
      return
    }

    let cancelled = false

    const stepReverse = (timestamp) => {
      if (cancelled || !videoRef.current) return
      const v = videoRef.current
      if (lastTimeRef.current == null) lastTimeRef.current = timestamp
      const delta = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp

      const next = v.currentTime - delta
      if (next <= 0) {
        v.currentTime = 0
        lastTimeRef.current = null
        v.play().catch(() => { })
      } else {
        v.currentTime = next
        rafRef.current = requestAnimationFrame(stepReverse)
      }
    }

    const handleEnded = () => {
      if (cancelled) return
      lastTimeRef.current = null
      rafRef.current = requestAnimationFrame(stepReverse)
    }

    video.addEventListener('ended', handleEnded)
    video.currentTime = 0
    video.play().catch(() => { })

    return () => {
      cancelled = true
      video.removeEventListener('ended', handleEnded)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [src, shouldPlay])

  return (
    <div ref={wrapRef} className="w-full h-full">
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        className={className}
        style={style}
        muted
        playsInline
        loop={false}
        preload={shouldPlay ? 'auto' : 'metadata'}
        onClick={onClick}
        onError={(e) => { e.target.style.display = 'none' }}
      />
    </div>
  )
}

/* ─────────── Scrapbook collage — MODAL ONLY, used for multi-media posts
   when the lightbox opens. Grid tiles keep the slider (unchanged). Photo
   items render as polaroids; video items render as a looping boomerang clip
   inside the same polaroid frame so videos actually play in the collage. */

function ScrapbookCollage({ post, items }) {
  const shown = items.slice(0, Math.min(3, items.length))
  const seed = hashStr(post._id || 'x')

  // Preset layouts for 2 & 3 items: position %, size %, rotation deg
  const layouts = {
    2: [
      { top: '8%', left: '6%', w: '58%', rot: -6 },
      { top: '30%', left: '38%', w: '58%', rot: 5 },
    ],
    3: [
      { top: '4%', left: '4%', w: '52%', rot: -7 },
      { top: '10%', left: '48%', w: '48%', rot: 6 },
      { top: '48%', left: '20%', w: '58%', rot: -3 },
    ],
  }
  const layout = layouts[shown.length] || layouts[3]

  // Tape colors
  const tapes = ['#8FA5D9', '#F5C542', '#8FA5D9']

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#fdfaf3' }}>
      {/* Yellow scribble decorations */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M8 92 Q12 85 16 92 T24 92" stroke="#F5C542" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        <path d="M82 12 L88 8 M85 6 L91 12" stroke="#F5C542" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        <circle cx="90" cy="88" r="1.5" fill="none" stroke="#F5C542" strokeWidth="0.6" />
        <path d="M6 40 Q9 38 12 40" stroke="#F5C542" strokeWidth="0.7" fill="none" strokeLinecap="round" />
        <path d="M78 55 l3 -3 M78 52 l3 3" stroke="#F5C542" strokeWidth="0.7" strokeLinecap="round" />
      </svg>

      {shown.map((it, i) => {
        const l = layout[i]
        const rot = l.rot + ((seed >> (i * 3)) % 5) - 2
        const tape = tapes[i % tapes.length]
        const itemIsVideo = isVideoItem(it)
        return (
          <div
            key={i}
            className="absolute"
            style={{
              top: l.top,
              left: l.left,
              width: l.w,
              transform: `rotate(${rot}deg)`,
              zIndex: i + 1,
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.18))',
            }}
          >
            {/* Blue/gold tape strip */}
            <div
              className="absolute left-1/2 -translate-x-1/2 -top-2 z-10"
              style={{
                width: '38%',
                height: 10,
                background: tape,
                opacity: 0.75,
                boxShadow: 'inset 0 0 6px rgba(0,0,0,0.08)',
              }}
            />
            {/* Photo / video (polaroid) */}
            <div
              className="w-full bg-white p-[3px] pb-[10px]"
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}
            >
              <div className="w-full aspect-square overflow-hidden bg-neutral-200 relative">
                {itemIsVideo ? (
                  <BoomerangVideo src={it.url} poster={it.thumbnail} className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={it.url}
                    alt=""
                    className="w-full h-full object-cover"
                    draggable={false}
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                )}
                {itemIsVideo && (
                  <span className="absolute bottom-1 left-1 flex items-center gap-0.5 px-1 rounded"
                    style={{ background: 'rgba(0,0,0,0.55)' }}>
                    <FiPlay size={9} fill="white" color="white" />
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────── Fullscreen photo/video lightbox ─────────── */

function PhotoLightbox({ post, onClose, navigate }) {
  const items = post ? getMediaItems(post) : []
  const isMulti = items.length > 1
  const item = items[0]
  const videoMode = isVideoItem(item)

  useEffect(() => {
    if (!post) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [post, onClose])

  useEffect(() => {
    if (!post) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [post])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {post && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)', zIndex: 99999 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <FiX size={20} />
          </button>

          {isMulti ? (
            <motion.div
              key={`card-spread-modal-${post._id}`}
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              className="relative z-0 overflow-hidden rounded-3xl border border-amber-200/60 bg-[#fdfaf3] shadow-2xl"
              style={{ width: 'min(94vw, 760px)', height: 'min(78vh, 560px)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="absolute right-4 top-3 z-20 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-700/75">
                Memory
              </span>
              <CardSpread
                cards={items.map((media, index) => ({
                  src: isVideoItem(media) ? (media.thumbnail || media.url) : media.url,
                  alt: post.title ? `${post.title} — memory ${index + 1}` : `Memory ${index + 1}`,
                  id: media.id || media.url || index,
                })).filter((card) => card.src)}
                cardWidth={156}
                cardHeight={234}
                cardRadius={14}
                radius={420}
                arc={82}
                cardColor="#fffdf8"
                cardPadding={5}
                borderColor="rgba(245, 158, 11, 0.24)"
                shadow={0.28}
                lift={34}
                push={4}
                pushReach={2}
                restOpacity={0.96}
                stiffness={170}
                damping={18}
                stagger={0.06}
                fit
                maxScale={1}
                interactive
                className="h-full w-full"
              />
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {videoMode ? (
                <motion.video
                  key={item?.url}
                  src={item?.url}
                  poster={item?.thumbnail}
                  controls
                  autoPlay
                  playsInline
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <motion.img
                  key={item?.url}
                  src={item?.url}
                  alt={post.title || 'Photo'}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </AnimatePresence>
          )}

          {/* ─── Bottom bar – plain orange text link ─── */}
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {post.title && (
              <span className="text-white/70 text-xs font-medium truncate max-w-[40vw]">{post.title}</span>
            )}
            <motion.button
              onClick={() => navigate(`/posts/${post._id}`)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 text-amber-400 font-bold text-sm hover:underline transition"
            >
              <FiExternalLink size={13} strokeWidth={2.5} /> View post
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

/* ─────────── List video (SOUND enabled, one-at-a-time) ─────────── */

// `isActive`: true when this is the slide currently showing inside a
// multi-media post's MediaSlider (always true for single-media posts).
// Playback now requires both `inView` (existing viewport check) AND
// `isActive`, so a post with several videos doesn't play all of them at
// once — only the one you're actually looking at.
function FeedVideo({ src, poster, postId, className, style, isActive = true }) {
  const videoRef = useRef(null)
  const wrapRef = useRef(null)
  const [muted, setMuted] = useState(true)
  const [inView, setInView] = useState(false)
  const [needsTap, setNeedsTap] = useState(false)

  const isActiveSound = SoundBus.getActive() === postId

  useEffect(() => {
    return SoundBus.subscribe((activeId) => {
      const v = videoRef.current
      if (!v) return
      if (activeId !== postId) {
        v.muted = true
        setMuted(true)
      }
    })
  }, [postId])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio > 0.5),
      { threshold: [0, 0.5, 1] }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (inView && isActive) {
      v.play().catch(() => { })
    } else {
      v.pause()
      if (SoundBus.getActive() === postId) SoundBus.setActive(null)
    }
  }, [inView, isActive, postId])

  const toggleSound = (e) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    if (muted) {
      SoundBus.setActive(postId)
      v.muted = false
      setMuted(false)
      v.play()
        .then(() => setNeedsTap(false))
        .catch(() => {
          v.muted = true
          setMuted(true)
          setNeedsTap(true)
        })
    } else {
      v.muted = true
      setMuted(true)
      if (SoundBus.getActive() === postId) SoundBus.setActive(null)
    }
  }

  return (
    <div ref={wrapRef} className={`relative ${className || ''}`} style={style}>
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        className="w-full h-full object-cover bg-black"
        muted
        playsInline
        loop
        preload={isActive ? 'auto' : 'metadata'}
      />

      <button
        onClick={toggleSound}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className="absolute bottom-3 right-3 z-10 h-9 w-9 rounded-full flex items-center justify-center bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition"
      >
        {muted ? <FiVolumeX size={17} strokeWidth={2.4} /> : <FiVolume2 size={17} strokeWidth={2.4} />}
      </button>

      {needsTap && (
        <button
          onClick={toggleSound}
          className="absolute inset-0 z-[5] flex items-center justify-center bg-black/30"
        >
          <span className="h-14 w-14 rounded-full bg-white/90 text-black flex items-center justify-center shadow-xl">
            <FiPlay size={22} />
          </span>
        </button>
      )}

      {isActiveSound && !muted && (
        <span className="absolute top-3 left-3 z-10 text-[10px] tracking-widest uppercase font-bold px-2 py-1 rounded-full bg-amber-500 text-white shadow">
          Live sound
        </span>
      )}
    </div>
  )
}

/* ─────────── Group posts: weekly for the current month, monthly for finished months ───────────
   While a month is still running, its posts are split into weeks (Mon–Sun),
   labelled "This week" / "Last week" / "Oct 5 – Oct 11". Once the month is over
   (we're in a later month), those posts collapse into one "September 2026" group. */

function groupPostsByMonth(posts) {
  const now = new Date()
  const currentMonthKey = now.getFullYear() * 12 + now.getMonth()
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000

  const weekStartOf = (date) => {
    const s = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    s.setDate(s.getDate() - ((s.getDay() + 6) % 7)) // back to Monday
    return s
  }
  const fmtDay = (date) => date.toLocaleString('en-US', { month: 'short', day: 'numeric' })
  const thisWeekStart = weekStartOf(now).getTime()

  const groups = new Map()
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    const d = post.createdAt ? new Date(post.createdAt) : new Date()
    const monthKey = d.getFullYear() * 12 + d.getMonth()
    let key
    let label
    let sortKey

    if (monthKey >= currentMonthKey) {
      // current (still running) month → weekly groups
      const ws = weekStartOf(d)
      const we = new Date(ws)
      we.setDate(ws.getDate() + 6)
      const diffWeeks = Math.round((thisWeekStart - ws.getTime()) / WEEK_MS)
      key = `w-${ws.getTime()}`
      sortKey = ws.getTime()
      if (diffWeeks <= 0) label = 'This week'
      else if (diffWeeks === 1) label = 'Last week'
      else label = `${fmtDay(ws)} – ${fmtDay(we)}`
    } else {
      // finished month → one monthly group
      key = `m-${d.getFullYear()}-${d.getMonth()}`
      sortKey = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
      label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    }

    if (!groups.has(key)) groups.set(key, { key, label, sortKey, posts: [] })
    groups.get(key).posts.push(post)
  }
  return Array.from(groups.values()).sort((a, b) => b.sortKey - a.sortKey)
}

/* ─────────── List-view post card ───────────
   No inline comments and no modal: the comment pill takes you to the post
   detail page. Like / Comment use the same pill style as the Explore page. */

function PostListItem({
  post, user, gridItem, navigate,
  handleLike, handleDoubleTap, goToProfile, HeartAnimation,
  downloadingMap, handleDownload,
}) {
  const mediaItems = getMediaItems(post)
  const mediaRatio = useMediaAspect(mediaItems)
  const myId = user?._id || user?.id
  const isLiked = !!myId && Array.isArray(post.likes) && post.likes.some((l) => String(l) === String(myId))
  const commentCount = post.commentCount ?? 0
  const isDownloading = downloadingMap[post._id] || false
  const downloadTarget = mediaItems[0]?.url

  return (
    <motion.article
      layoutId={`post-${post._id}`}
      variants={gridItem}
      className="group relative overflow-hidden rounded-3xl border"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--bg-secondary)',
        boxShadow: 'none',
      }}
    >
      {mediaItems.length > 0 && (
        <div
          className="relative w-full cursor-pointer overflow-hidden"
          style={{
            background: 'var(--bg-secondary)',
            aspectRatio: mediaRatio,
            maxHeight: mediaItems.length > 1 ? 380 : 560,
            height: mediaItems.length > 1 ? 'clamp(270px, 66vw, 380px)' : undefined,
          }}
        >
          {mediaItems.length > 1 ? (
            <MultiMediaShowcase
              items={mediaItems}
              postId={post._id}
              compact
              contain
              onOpen={(e) => handleDoubleTap(e || { stopPropagation() {} }, post._id, () => navigate(`/posts/${post._id}`))}
            />
          ) : (
            <MediaSlider
              items={mediaItems}
              title={post.title}
              postId={post._id}
              onDoubleTap={(e) => handleDoubleTap(e, post._id, () => navigate(`/posts/${post._id}`))}
              rounded=""
              className="w-full h-full"
              hideDots
              fit="cover"
              renderVideo={(item, isActive) => (
                <FeedVideo
                  src={item.url}
                  poster={item.thumbnail}
                  postId={post._id}
                  className="w-full h-full"
                  isActive={isActive}
                />
              )}
            />
          )}
          <HeartAnimation postId={post._id} />

          <div
            className="absolute top-3 left-3 z-10 flex items-center gap-2 pl-1 pr-3 py-1 rounded-full backdrop-blur-md cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.15)' }}
            onClick={(e) => goToProfile(e, post.author)}
          >
            <Avatar src={post.author?.avatar} name={post.author?.name} size={26} />
            <div className="text-white leading-tight">
              <p className="text-xs font-bold truncate max-w-[140px]">{post.author?.name || 'Unknown'}</p>
              <p className="text-[10px] opacity-80">{post.createdAt ? dayjs(post.createdAt).fromNow() : 'Just now'}</p>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              if (!downloadTarget) return
              const ext = downloadTarget.split('.').pop() || 'jpg'
              const filename = post.title ? `${post.title}.${ext}` : `download.${ext}`
              handleDownload(post._id, downloadTarget, filename)
            }}
            disabled={isDownloading}
            className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full flex items-center justify-center bg-white/85 backdrop-blur-sm text-gray-900 hover:bg-white shadow-md transition disabled:opacity-50"
            aria-label="Download media"
          >
            {isDownloading
              ? <FiLoader size={17} className="animate-spin" strokeWidth={2.5} />
              : <FiDownload size={17} strokeWidth={2.5} />}
          </button>
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/posts/${post._id}`)}>
            {post.title && (
              <h3 className="font-extrabold font-display text-lg leading-tight tracking-tight"
                style={{ color: 'var(--text-primary)' }}>
                {post.title}
              </h3>
            )}
            {post.content && post.content.trim() !== '' && post.content !== post.title && (
              <p className="text-sm mt-1 line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
                {post.content}
              </p>
            )}
            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {post.tags.slice(0, 4).map(tag => (
                  <span key={tag}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,191,36,0.04))',
                      color: '#b45309',
                      border: '1px solid rgba(251,191,36,0.25)'
                    }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <motion.button
            type="button"
            onClick={(e) => handleLike(e, post._id)}
            whileTap={{ scale: 0.93 }}
            aria-label={isLiked ? 'Unlike' : 'Like'}
            className="flex items-center gap-2"
            style={{
              height: 42,
              padding: '0 18px',
              borderRadius: 999,
              border: '1px solid var(--border)',
              fontSize: 13,
              fontWeight: 800,
              background: isLiked ? 'rgba(239,68,68,0.16)' : 'var(--bg-secondary)',
              color: isLiked ? '#ef4444' : 'var(--text-primary)',
            }}
          >
            {isLiked ? <FaHeart size={17} color="#ef4444" /> : <FiHeart size={18} strokeWidth={2.5} />}
            <span>{post.likes?.length || 0}</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/posts/${post._id}`) }}
            whileTap={{ scale: 0.93 }}
            aria-label="View comments"
            className="flex items-center gap-2"
            style={{
              height: 42,
              padding: '0 18px',
              borderRadius: 999,
              border: '1px solid var(--border)',
              fontSize: 13,
              fontWeight: 800,
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          >
            <FiMessageCircle size={18} strokeWidth={2.5} />
            <span>{commentCount}</span>
          </motion.button>
        </div>
      </div>
    </motion.article>
  )
}

/* ─────────── Main FeedPage ─────────── */

export default function FeedPage() {
  const navigationType = useNavigationType()
  // Back/forward (POP) with a saved feed => restore it instead of refetching
  const restoringRef = useRef(navigationType === 'POP' && Array.isArray(feedCache.posts) && feedCache.posts.length > 0)
  const restoredFromCache = restoringRef.current

  const [posts, setPosts] = useState(() => (restoredFromCache ? feedCache.posts : []))
  const [loading, setLoading] = useState(!restoredFromCache)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState(() => (restoredFromCache ? feedCache.nextCursor : null))
  const [hasMore, setHasMore] = useState(() => (restoredFromCache ? feedCache.hasMore : false))
  const [viewMode, setViewMode] = useState(() => (restoredFromCache ? feedCache.viewMode : 'grid'))
  const [query, setQuery] = useState(() => (restoredFromCache ? feedCache.query : ''))
  const [showHeartAnimation, setShowHeartAnimation] = useState(null)
  const [downloadingMap, setDownloadingMap] = useState({})
  const [scrolled, setScrolled] = useState(false)
  const [lightboxPost, setLightboxPost] = useState(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const lastTapRef = useRef({})
  const sentinelRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => {
    if (restoredFromCache) return
    feedCache.scrollY = 0
    fetchPosts(true)
  }, [])

  // Keep the cache in sync so it's ready when we leave the page
  useEffect(() => {
    if (loading) return
    feedCache.posts = posts
    feedCache.nextCursor = nextCursor
    feedCache.hasMore = hasMore
    feedCache.viewMode = viewMode
    feedCache.query = query
  }, [loading, posts, nextCursor, hasMore, viewMode, query])

  // Put the scroll position back. Images/cards settle in after first paint,
  // so retry a few times until the page is tall enough to reach the target.
  useEffect(() => {
    if (!restoringRef.current) return undefined
    const target = feedCache.scrollY
    let tries = 0
    let timer = null
    const tick = () => {
      window.scrollTo(0, target)
      if (Math.abs(window.scrollY - target) > 2 && tries < 20) {
        tries += 1
        timer = setTimeout(tick, 80)
      } else {
        restoringRef.current = false
      }
    }
    tick()
    return () => { if (timer) clearTimeout(timer) }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60)
      if (!restoringRef.current) feedCache.scrollY = window.scrollY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Infinite scroll: load the next page once the sentinel div near the
  // bottom of the grid comes into view. Skipped while a search query is
  // active — search filters the already-loaded pages client-side rather
  // than hitting the backend, so there's no "next page" to fetch for it.
  useEffect(() => {
    if (query.trim()) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) fetchPosts(false)
    }, { rootMargin: '600px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [query, hasMore, loadingMore, nextCursor])

  const extractPage = (data) => {
    let arr = []
    if (data?.data?.posts) arr = data.data.posts
    else if (data?.posts) arr = data.posts
    else if (Array.isArray(data?.data)) arr = data.data
    else if (Array.isArray(data)) arr = data
    return { arr, nextCursor: data?.nextCursor ?? null, hasMore: !!data?.hasMore }
  }

  // reset=true: initial load / refresh (replaces the list).
  // reset=false: load the next page (appends, using nextCursor as `before`).
  const fetchPosts = async (reset) => {
    if (!reset && (!hasMore || loadingMore)) return
    if (reset) setLoading(true)
    else setLoadingMore(true)
    try {
      const params = reset ? {} : (nextCursor ? { before: nextCursor } : {})
      const response = await postsAPI.getAll(params)
      const { arr, nextCursor: cursor, hasMore: more } = extractPage(response.data)
      setPosts(prev => reset ? arr : [...prev, ...arr])
      setNextCursor(cursor)
      setHasMore(more)
    } catch (err) {
      console.error('Failed to fetch posts:', err)
      if (reset) setPosts([])
    } finally {
      if (reset) setLoading(false)
      setLoadingMore(false)
    }
  }

  // Optimistic: the UI updates instantly, the request runs in the background,
  // and we roll back only if it fails. `onlyLike` (used by double-tap) never
  // un-likes a post that's already liked.
  const handleLike = async (e, postId, onlyLike = false) => {
    e?.stopPropagation?.()
    if (!user) { toast.error('Log in to like posts'); navigate('/login'); return }
    const myId = user._id || user.id
    const current = posts.find((p) => p._id === postId)
    const currentLikes = Array.isArray(current?.likes) ? current.likes : []
    const alreadyLiked = currentLikes.some((l) => String(l) === String(myId))
    if (onlyLike && alreadyLiked) return

    const toggle = (p) => {
      const likes = Array.isArray(p.likes) ? p.likes : []
      const has = likes.some((l) => String(l) === String(myId))
      return { ...p, likes: has ? likes.filter((l) => String(l) !== String(myId)) : [...likes, myId] }
    }
    setPosts((prev) => prev.map((p) => (p._id === postId ? toggle(p) : p)))
    try {
      await postsAPI.like(postId)
    } catch (err) {
      console.error('Like failed:', err)
      setPosts((prev) => prev.map((p) => (p._id === postId ? toggle(p) : p)))
      toast.error('Could not update like')
    }
  }

  const openLightbox = (post) => {
    setLightboxPost(post)
  }

  const handleDoubleTap = (e, postId, onSingleTap) => {
    e.stopPropagation()
    const now = Date.now()
    const lastTap = lastTapRef.current[postId] || 0
    if (now - lastTap < 300) {
      handleLike(e, postId, true)
      setShowHeartAnimation(postId)
      setTimeout(() => setShowHeartAnimation(null), 800)
      lastTapRef.current[postId] = 0
    } else {
      lastTapRef.current[postId] = now
      if (typeof onSingleTap === 'function') {
        setTimeout(() => {
          if (lastTapRef.current[postId] === now) onSingleTap()
        }, 300)
      }
    }
  }

  const goToProfile = (e, author) => {
    e?.stopPropagation()
    const authorId = author?._id || author?.id || author
    if (!authorId) return
    const myId = user?._id || user?.id
    if (String(authorId) === String(myId)) navigate('/profile')
    else navigate(`/users/${authorId}`)
  }

  const HeartAnimation = ({ postId }) => (
    <AnimatePresence>
      {showHeartAnimation === postId && (
        <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          initial={{ scale: 0.5, opacity: 1 }} animate={{ scale: 1.4, opacity: 1 }}
          exit={{ scale: 1.8, opacity: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
          <FaHeart size={80} color="#ef4444" />
        </motion.div>
      )}
    </AnimatePresence>
  )

  const handleDownload = async (postId, url, filename) => {
    if (!url) return
    setDownloadingMap(prev => ({ ...prev, [postId]: true }))
    const toastId = toast.loading('Downloading…')
    try {
      const proxyUrl = getDownloadUrl(url, filename)
      const response = await api.get(proxyUrl, { responseType: 'blob' })
      const blob = new Blob([response.data])
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(link.href)
      toast.success('Download complete', { id: toastId })
    } catch (err) {
      console.error('Download failed:', err)
      toast.error('Download failed', { id: toastId })
    } finally {
      setDownloadingMap(prev => ({ ...prev, [postId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <motion.div className="flex flex-col items-center justify-center h-screen text-center px-4"
        style={{ background: 'var(--bg-primary)' }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-5" style={{ background: 'var(--bg-secondary)' }}>
          <FiImage size={40} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
        </div>
        <h3 className="text-2xl font-extrabold font-display" style={{ color: 'var(--text-primary)' }}>No posts yet</h3>
        <p className="text-sm mt-2 mb-6" style={{ color: 'var(--text-muted)' }}>Share something with the world</p>
        <motion.button onClick={() => navigate('/create')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-7 py-3.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-full text-sm shadow-lg shadow-amber-500/30">
          <FiPlusSquare size={20} strokeWidth={2.5} /> Create Post
        </motion.button>
      </motion.div>
    )
  }

  const q = query.trim().toLowerCase()
  const searchedPosts = q
    ? posts.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.content?.toLowerCase().includes(q) ||
      p.caption?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q)) ||
      p.author?.name?.toLowerCase().includes(q)
    )
    : posts

  const visiblePosts = searchedPosts

  const gridContainer = { animate: { transition: { staggerChildren: 0.03 } } }
  const gridItem = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.22 } } }
  const monthGroups = groupPostsByMonth(visiblePosts)
  // "+" while more pages are still waiting to load
  const countLabel = q
    ? `${visiblePosts.length} found`
    : `${visiblePosts.length}${hasMore ? '+' : ''} ${visiblePosts.length === 1 && !hasMore ? 'moment' : 'moments'}`

  const renderGridTile = (post) => {
    const mediaItems = getMediaItems(post)
    return (
      <motion.div
        key={post._id}
        layoutId={`post-${post._id}`}
        variants={gridItem}
        whileHover={{ scale: 1.02 }}
        transition={{ layout: { type: 'spring', stiffness: 350, damping: 32 } }}
        className="relative group cursor-pointer rounded-2xl overflow-hidden aspect-[11/11] shadow-none"
        style={{
          background: 'var(--bg-secondary)',
          // CURVED SIDES: shape is defined once in the <svg> clipPath near the top of the return (#feed-tile-clip)
          clipPath: 'url(#feed-tile-clip)',
          WebkitClipPath: 'url(#feed-tile-clip)',
        }}
      >
        {mediaItems.length > 0 ? (
          mediaItems.length > 1 ? (
            <MultiMediaShowcase
              items={mediaItems}
              postId={post._id}
              compact
              bare
              badgeStyle={TILE_BADGE_POS}
              onOpen={() => openLightbox(post)}
            />
          ) : (
            <MediaSlider
              items={mediaItems}
              title={post.title}
              postId={post._id}
              onDoubleTap={(e) => handleDoubleTap(e, post._id, () => openLightbox(post))}
              rounded=""
              className="w-full h-full"
              hideDots
              peek
              renderVideo={(item, isActive) => (
                <BoomerangVideo src={item.url} poster={item.thumbnail} className="w-full h-full object-cover" isActive={isActive} />
              )}
            />
          )
        ) : (
          <div onClick={(e) => handleDoubleTap(e, post._id, () => openLightbox(post))} className="w-full h-full flex items-center justify-center">
            <FiImage size={22} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
          </div>
        )}

        {/* avatar position comes from TILE_AVATAR_POS (top of file) so the curved clip never hides it */}
        <div onClick={(e) => goToProfile(e, post.author)} className="absolute cursor-pointer z-10" style={TILE_AVATAR_POS}>
          <Avatar src={post.author?.avatar} name={post.author?.name} size={22} className="ring-2 ring-white/70 shadow" />
        </div>

        <HeartAnimation postId={post._id} />
      </motion.div>
    )
  }

  return (
    <>
      {/* Clip shape for grid tiles (shape "D"): corners tucked in at top and bottom,
          left/right sides bow outward, top/bottom edges arch gently.
          Units are 0-1 of each tile, so it scales with any tile size.
          Edge arch depth = the 0.03 / -0.03 (top) and 0.97 / 1.03 (bottom) numbers.
          Corner tuck = 0.94 / 0.06 (how far the sides pull in at the corners) and 0.2 / 0.8 (where the flat part ends). */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="feed-tile-clip" clipPathUnits="objectBoundingBox">
            <path d="M0.2,0.03 Q0.5,-0.03 0.8,0.03 Q0.9013,0.0503 0.94,0.16 Q1,0.33 1,0.5 Q1,0.67 0.94,0.84 Q0.9013,0.9497 0.8,0.97 Q0.5,1.03 0.2,0.97 Q0.0987,0.9497 0.06,0.84 Q0,0.67 0,0.5 Q0,0.33 0.06,0.16 Q0.0987,0.0503 0.2,0.03 Z" />
          </clipPath>
        </defs>
      </svg>
      <div className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))]" style={{ background: 'var(--bg-primary)', fontFamily: '-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif' }}>

        {/* ─── Top nav ───────────────────────────────────────────────────────────
            Sticky liquid-glass bar. Concentric geometry: every control inside is 44px tall with a
            fully round 22px corner; bar radius 29 = 22 + 6 padding + 1 border, so the curves nest.
            Order: title · search · grid/list toggle · New. Title hides on phones to give search room. */}
        <div
          className="sticky top-0 z-30 px-3 sm:px-5 pb-2"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <div
            className="relative max-w-7xl mx-auto flex items-center gap-2 sm:gap-3"
            style={{
              height: 58,
              padding: 6,
              borderRadius: 29,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 60%), color-mix(in srgb, var(--bg-primary) 68%, transparent)',
              border: '1px solid color-mix(in srgb, var(--border) 65%, transparent)',
              boxShadow: scrolled
                ? '0 20px 44px rgba(15,23,42,0.20), 0 2px 6px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.30)'
                : '0 10px 28px rgba(15,23,42,0.09), 0 1px 3px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.24)',
              backdropFilter: 'saturate(180%) blur(24px)',
              WebkitBackdropFilter: 'saturate(180%) blur(24px)',
              transition: 'box-shadow 0.3s ease',
            }}
          >
            {/* soft amber glint along the bottom edge */}
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', left: '18%', right: '18%', bottom: -1, height: 1, pointerEvents: 'none',
                background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.6), transparent)',
                opacity: scrolled ? 1 : 0.55, transition: 'opacity 0.3s ease',
              }}
            />

            {/* Title */}
            <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
              <div
                style={{
                  width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff',
                  background: 'linear-gradient(145deg, #fcd34d, #f59e0b 50%, #ea580c)',
                  boxShadow: '0 6px 16px rgba(245,158,11,0.40), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.12)',
                }}
              >
                <FiImage size={20} strokeWidth={2.3} />
              </div>
              <div style={{ lineHeight: 1.15, paddingRight: 6 }}>
                <p className="font-display" style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-0.022em', color: 'var(--text-primary)' }}>
                  Memories
                </p>
                <p style={{ margin: 0, marginTop: 2, fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
                  {countLabel}
                </p>
              </div>
            </div>

            {/* Search — inline styles so padding and icon clearance are exact */}
            <div className="relative flex-1 min-w-0 max-w-xl mx-auto">
              <FiSearch
                size={16}
                strokeWidth={2.4}
                style={{
                  position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
                  color: searchFocused ? '#f59e0b' : 'var(--text-muted)', transition: 'color 0.2s ease',
                }}
              />
              <input
                type="text"
                placeholder="Search memories"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{
                  width: '100%', height: 44, borderRadius: 22, outline: 'none',
                  padding: '0 44px 0 44px', fontSize: 14, fontWeight: 500,
                  color: 'var(--text-primary)',
                  background: 'color-mix(in srgb, var(--bg-secondary) 70%, transparent)',
                  border: searchFocused ? '1px solid rgba(245,158,11,0.65)' : '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
                  boxShadow: searchFocused ? '0 0 0 4px rgba(245,158,11,0.16)' : 'inset 0 1px 2px rgba(15,23,42,0.06)',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
              />
              <AnimatePresence>
                {query && (
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    style={{
                      position: 'absolute', right: 6, top: '50%', marginTop: -16, width: 32, height: 32, borderRadius: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-primary)',
                      background: 'color-mix(in srgb, var(--text-primary) 12%, transparent)',
                    }}
                  >
                    <FiX size={14} strokeWidth={2.5} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Grid / list toggle — track radius 22, 3px padding + 1px border, so the thumb is 36px / radius 18 */}
            <div
              className="relative grid grid-cols-2 flex-shrink-0"
              style={{
                width: 92, height: 44, padding: 3, borderRadius: 22,
                background: 'color-mix(in srgb, var(--bg-secondary) 70%, transparent)',
                border: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
                boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.06)',
              }}
            >
              <motion.div
                className="absolute"
                style={{
                  top: 3, bottom: 3, left: 3, width: 'calc(50% - 3px)', borderRadius: 18,
                  background: 'linear-gradient(145deg, #fcd34d, #f59e0b)',
                  boxShadow: '0 4px 12px rgba(245,158,11,0.42), inset 0 1px 0 rgba(255,255,255,0.45)',
                }}
                animate={{ x: viewMode === 'grid' ? 0 : '100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              />
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className="relative z-10 flex items-center justify-center"
                style={{ height: 36, borderRadius: 18, color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)', transition: 'color 0.2s ease' }}
              >
                <FiGrid size={17} strokeWidth={2.4} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className="relative z-10 flex items-center justify-center"
                style={{ height: 36, borderRadius: 18, color: viewMode === 'list' ? '#fff' : 'var(--text-muted)', transition: 'color 0.2s ease' }}
              >
                <FiList size={17} strokeWidth={2.4} />
              </button>
            </div>

            {/* New */}
            <motion.button
              onClick={() => navigate('/create')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              aria-label="Create post"
              className="flex items-center justify-center gap-2 flex-shrink-0 text-white font-bold"
              style={{
                height: 44, minWidth: 44, padding: '0 16px', borderRadius: 22, fontSize: 14,
                background: 'linear-gradient(145deg, #fcd34d, #f59e0b 50%, #ea580c)',
                boxShadow: '0 8px 20px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.45)',
              }}
            >
              <FiPlusSquare size={19} strokeWidth={2.5} />
              <span className="hidden sm:inline">New</span>
            </motion.button>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-3 sm:px-5 pt-8 sm:pt-10">
          <MemoryDollyGallery />

        <div className="max-w-7xl mx-auto px-3 sm:px-5 pt-4 sm:pt-8">
          {monthGroups.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center text-center px-4 pt-20">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--bg-secondary)' }}>
                <FiSearch size={28} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3 className="text-lg font-extrabold font-display" style={{ color: 'var(--text-primary)' }}>No results</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>No posts match "{query}"</p>
            </motion.div>
          ) : (
            <LayoutGroup>
              {monthGroups.map((group, groupIndex) => (
                <div
                  key={group.key}
                  className="relative flex flex-col"
                  style={{
                    // SPACING: marginTop = space between one month's last row and the next
                    // month heading (24 = Tailwind 6). gap = heading-to-cards (12 = gap-3).
                    marginTop: groupIndex > 0 ? 24 : 0,
                    gap: 12,
                  }}
                >
                  <div style={{ position: 'relative', zIndex: 10, padding: '0 4px' }}>
                    <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)', margin: 0 }}>
                      {group.label}
                    </h2>
                  </div>

                  {viewMode === 'grid' ? (
                    <motion.div
                      className="relative z-0 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 sm:gap-6"
                      variants={gridContainer} initial="initial" animate="animate"
                    >
                      {group.posts.map((post) => renderGridTile(post))}
                    </motion.div>
                  ) : (
                    <motion.div
                      className="relative z-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-16 sm:gap-y-20"
                      variants={gridContainer} initial="initial" animate="animate"
                    >
                      {group.posts.map((post) => (
                        <PostListItem
                          key={post._id}
                          post={post}
                          user={user}
                          gridItem={gridItem}
                          navigate={navigate}
                          handleLike={handleLike}
                          handleDoubleTap={handleDoubleTap}
                          goToProfile={goToProfile}
                          HeartAnimation={HeartAnimation}
                          downloadingMap={downloadingMap}
                          handleDownload={handleDownload}
                        />
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}
            </LayoutGroup>
          )}

          {/* Infinite-scroll trigger + spinner. Hidden during search since
              search only filters posts already loaded on this page. */}
          {!query.trim() && hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              {loadingMore && (
                <div className="animate-spin rounded-full h-6 w-6 border-4 border-amber-500 border-t-transparent" />
              )}
            </div>
          )}
        </div>
        </main>
      </div>

      <PhotoLightbox
        post={lightboxPost}
        onClose={() => setLightboxPost(null)}
        navigate={navigate}
      />
    </>
  )
}