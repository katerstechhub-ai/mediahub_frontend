import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowLeft, FiCompass, FiHome } from 'react-icons/fi'
import ThemeOverlay from '../components/ui/ThemeOverlay'
import africanMemoriesHero from '../assets/african-memories-login.jpg'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10" style={{ background: 'var(--bg-primary)' }}>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${africanMemoriesHero})` }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(18,11,7,0.42), rgba(8,8,9,0.78))' }}
      />

      <ThemeOverlay className="fixed right-4 top-4 z-30 sm:right-6 sm:top-6" />

      <motion.main
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-lg rounded-[34px] border p-7 text-center shadow-2xl backdrop-blur-xl sm:p-10"
        style={{
          background: 'rgba(20,16,14,0.66)',
          borderColor: 'rgba(255,255,255,0.16)',
          boxShadow: '0 24px 90px rgba(0,0,0,0.35)',
        }}
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] border border-amber-300/30 bg-amber-400/15 text-amber-300">
          <FiCompass size={30} strokeWidth={1.7} />
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-300/80">A memory took a detour</p>
        <p className="mt-4 text-8xl font-black leading-none tracking-[-0.08em] text-white sm:text-9xl">404</p>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">This moment is missing</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/65 sm:text-base">
          The page you were looking for is not part of this memory wall. Let’s take you somewhere familiar.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/')}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-amber-500 px-6 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition-colors hover:bg-amber-400"
          >
            <FiHome size={17} /> Back to Feed
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate(-1)}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border px-6 text-sm font-bold text-white/85 transition-colors hover:bg-white/10"
            style={{ borderColor: 'rgba(255,255,255,0.2)' }}
          >
            <FiArrowLeft size={17} /> Go back
          </motion.button>
        </div>
      </motion.main>
    </div>
  )
}
