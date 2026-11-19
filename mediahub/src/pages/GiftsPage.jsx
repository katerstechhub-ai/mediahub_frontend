import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowLeft, FiCopy, FiExternalLink, FiGift, FiHeart, FiMail } from 'react-icons/fi'
import {
  MdBlender, MdMicrowave, MdCoffeeMaker, MdBakeryDining, MdKitchen, MdSoupKitchen,
  MdDinnerDining, MdFlatware, MdWineBar, MdBed, MdCurtains, MdTv, MdSpeaker,
  MdTableRestaurant, MdOutlineLightbulb, MdOutlinePhotoLibrary, MdIron, MdAir,
  MdRestaurant, MdLocalLaundryService,
} from 'react-icons/md'
import {
  GiHotMeal, GiToaster, GiRiceCooker, GiTeapot, GiGasStove, GiCookingPot, GiSaucepan,
  GiPillow, GiTowel, GiWashingMachine, GiVacuumCleaner,
} from 'react-icons/gi'
import { FaGlassWater, FaMugHot, FaBath, FaCouch, FaFan, FaBed } from 'react-icons/fa6'
import toast from 'react-hot-toast'

/* ───────────────────────── EDIT THIS SECTION ─────────────────────────
   Everything guests see on this page comes from the values below.
   Change the text, add or remove gifts, save, push. No backend needed. */

const COUPLE = 'Paloma & Kenneth'
const WEDDING_DATE = 'November 21, 2026'

// Optional. Your WhatsApp number with country code, digits only (e.g. '2348012345678').
// When set, every gift gets an "I'll get this" button that opens WhatsApp with a
// ready message, so you can tell guests apart and avoid double gifts.
// Leave as '' to hide those buttons.
const COUPLE_WHATSAPP = ''

// Fill in your real details here.
const CASH_GIFT = {
  title: 'Cash gift',
  note: 'Prefer to contribute towards our new home? You can send it here.',
  bank: 'Bank name',
  accountName: 'Account name',
  accountNumber: '0000000000',
}

/* PHOTOS
   Put a picture in  src/assets/gifts/  named after the gift id, e.g.
   blender.jpg, airfryer.png, sofa.webp. It shows up on that gift's card automatically.
   Gifts without a picture show their icon instead, so you can add photos a few at a time.
   You can also give one gift a full web link: { id: 'sofa', ..., image: 'https://...' }
   Tip: resize pictures to about 600px wide first so the page loads fast on phones. */

// id = picture file name. Icon = the react-icon shown when there is no picture.
const GIFT_GROUPS = [
  {
    title: 'Kitchen appliances',
    Icon: MdKitchen,
    items: [
      { id: 'blender', Icon: MdBlender, name: 'Blender', note: 'For morning smoothies' },
      { id: 'airfryer', Icon: GiHotMeal, name: 'Air fryer', note: 'Quick dinners, fewer dishes' },
      { id: 'microwave', Icon: MdMicrowave, name: 'Microwave', note: 'Warm meals in a minute' },
      { id: 'toaster', Icon: GiToaster, name: 'Toaster', note: 'Golden breakfasts' },
      { id: 'ricecooker', Icon: GiRiceCooker, name: 'Rice cooker', note: 'Perfect rice every time' },
      { id: 'kettle', Icon: GiTeapot, name: 'Electric kettle', note: 'Tea at sunrise' },
      { id: 'coffeemaker', Icon: MdCoffeeMaker, name: 'Coffee maker', note: 'For slow Saturday mornings' },
      { id: 'mixer', Icon: MdBakeryDining, name: 'Stand mixer', note: 'For baking together' },
      { id: 'fridge', Icon: MdKitchen, name: 'Refrigerator', note: 'The heart of the kitchen' },
      { id: 'gascooker', Icon: GiGasStove, name: 'Gas cooker', note: 'Four burners and an oven' },
    ],
  },
  {
    title: 'Cookware and dining',
    Icon: MdRestaurant,
    items: [
      { id: 'potset', Icon: GiCookingPot, name: 'Cooking pot set', note: 'Stainless steel, all sizes' },
      { id: 'panset', Icon: GiSaucepan, name: 'Non-stick pan set', note: 'For everyday cooking' },
      { id: 'pressurecooker', Icon: MdSoupKitchen, name: 'Pressure cooker', note: 'Soups and stews in no time' },
      { id: 'dinnerset', Icon: MdDinnerDining, name: 'Dinner set', note: 'For hosting family and friends' },
      { id: 'cutlery', Icon: MdFlatware, name: 'Cutlery set', note: 'Forks, knives and spoons' },
      { id: 'glassware', Icon: FaGlassWater, name: 'Drinking glass set', note: 'Clear and simple' },
      { id: 'wineglasses', Icon: MdWineBar, name: 'Wine glasses', note: 'For toasting anniversaries' },
      { id: 'mugs', Icon: FaMugHot, name: 'Mug set', note: 'For tea and coffee dates' },
    ],
  },
  {
    title: 'Bedroom and bath',
    Icon: FaBed,
    items: [
      { id: 'bedding', Icon: MdBed, name: 'Bedding set', note: 'Soft, white, king size' },
      { id: 'duvet', Icon: GiPillow, name: 'Duvet and pillows', note: 'For cosy nights' },
      { id: 'curtains', Icon: MdCurtains, name: 'Curtains', note: 'Blackout, for the bedroom' },
      { id: 'towels', Icon: GiTowel, name: 'Luxury towel set', note: 'Starting our home right' },
      { id: 'bathset', Icon: FaBath, name: 'Bathroom set', note: 'Mats, dispensers and more' },
    ],
  },
  {
    title: 'Living room',
    Icon: FaCouch,
    items: [
      { id: 'tv', Icon: MdTv, name: 'Television', note: 'Movie nights at home' },
      { id: 'speaker', Icon: MdSpeaker, name: 'Sound system', note: 'For music and parties' },
      { id: 'sofa', Icon: FaCouch, name: 'Sofa set', note: 'Room for the whole family' },
      { id: 'diningtable', Icon: MdTableRestaurant, name: 'Dining table', note: 'Where we will gather' },
      { id: 'lamp', Icon: MdOutlineLightbulb, name: 'Table lamp', note: 'A warm glow' },
      { id: 'wallart', Icon: MdOutlinePhotoLibrary, name: 'Wall art and frames', note: 'For our memories' },
    ],
  },
  {
    title: 'Home and laundry',
    Icon: MdLocalLaundryService,
    items: [
      { id: 'washer', Icon: GiWashingMachine, name: 'Washing machine', note: 'Laundry made easy' },
      { id: 'iron', Icon: MdIron, name: 'Steam iron', note: 'Crisp shirts and dresses' },
      { id: 'vacuum', Icon: GiVacuumCleaner, name: 'Vacuum cleaner', note: 'A tidy home' },
      { id: 'fan', Icon: FaFan, name: 'Standing fan', note: 'Cool breezes' },
      { id: 'ac', Icon: MdAir, name: 'Air conditioner', note: 'Comfort all year' },
    ],
  },
]

/* ───────────────────────── photos found in src/assets/gifts ───────────────────────── */

const photoModules = import.meta.glob('../assets/gifts/*.{jpg,jpeg,png,webp}', { eager: true })
const PHOTOS = {}
const photoPaths = Object.keys(photoModules)
for (let i = 0; i < photoPaths.length; i++) {
  const path = photoPaths[i]
  const file = path.split('/').pop()
  const id = file.slice(0, file.lastIndexOf('.'))
  const mod = photoModules[path]
  PHOTOS[id] = mod && mod.default ? mod.default : mod
}

/* ───────────────────────── page ───────────────────────── */

const GLASS = {
  background: 'color-mix(in srgb, var(--bg-secondary) 82%, transparent)',
  border: '1px solid color-mix(in srgb, var(--border) 75%, transparent)',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.18)',
  backdropFilter: 'saturate(160%) blur(18px)',
  WebkitBackdropFilter: 'saturate(160%) blur(18px)',
}

const AMBER_BUTTON = {
  background: 'linear-gradient(145deg, #fcd34d, #f59e0b 50%, #ea580c)',
  boxShadow: '0 8px 20px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.45)',
  color: '#fff',
}

const SOFT_BUTTON = {
  background: 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
  border: '1px solid color-mix(in srgb, var(--border) 80%, transparent)',
  color: 'var(--text-primary)',
}

const BUTTON_BASE = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  width: '100%',
  height: 40,
  padding: '0 12px',
  borderRadius: 20,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  textDecoration: 'none',
  border: 'none',
}

const DETAIL_LABEL = {
  margin: 0,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: '#d97706',
}

const ICON_TILE = {
  background: 'linear-gradient(145deg, rgba(252,211,77,0.30), rgba(245,158,11,0.12))',
  border: '1px solid rgba(245,158,11,0.30)',
  color: '#d97706',
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(label + ' copied')
  } catch (err) {
    toast.error('Could not copy. Please copy it by hand.')
  }
}

function whatsappLink(giftName) {
  const text = "Hi! I'd like to get you the " + giftName + ' as a wedding gift.'
  return 'https://wa.me/' + COUPLE_WHATSAPP + '?text=' + encodeURIComponent(text)
}

// Picture if there is one (and it loads), otherwise the gift's react-icon.
function GiftMedia({ gift }) {
  const [failed, setFailed] = useState(false)
  const src = gift.image || PHOTOS[gift.id]
  const Icon = gift.Icon

  return (
    <div
      style={{
        width: '100%', aspectRatio: '4 / 3', borderRadius: 20, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        ...ICON_TILE,
      }}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={gift.name}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Icon size={44} />
      )}
    </div>
  )
}

function GiftCard({ gift, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -30px 0px' }}
      transition={{ duration: 0.35, delay: (index % 4) * 0.05 }}
      style={{ ...GLASS, borderRadius: 26, padding: 8, display: 'flex', flexDirection: 'column' }}
    >
      <GiftMedia gift={gift} />

      <div style={{ padding: '10px 6px 4px', flex: 1 }}>
        <h3 className="font-display" style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '-0.015em', color: 'var(--text-primary)' }}>
          {gift.name}
        </h3>
        {gift.note && (
          <p style={{ margin: '3px 0 0', fontSize: 12, lineHeight: 1.4, color: 'var(--text-muted)' }}>{gift.note}</p>
        )}
      </div>

      {(COUPLE_WHATSAPP || gift.link) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 4px 4px' }}>
          {COUPLE_WHATSAPP && (
            <a
              href={whatsappLink(gift.name)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...BUTTON_BASE, ...AMBER_BUTTON }}
            >
              <FiGift size={15} strokeWidth={2.5} /> I'll get this
            </a>
          )}
          {gift.link && (
            <a
              href={gift.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...BUTTON_BASE, ...SOFT_BUTTON, border: SOFT_BUTTON.border }}
            >
              <FiExternalLink size={15} strokeWidth={2.5} /> View item
            </a>
          )}
        </div>
      )}
    </motion.div>
  )
}

function CashGiftCard({ marginTop = 0, marginBottom = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      style={{
        ...GLASS,
        marginTop, marginBottom, borderRadius: 28, padding: 22,
        border: '1px solid rgba(245,158,11,0.40)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            width: 42, height: 42, borderRadius: 21, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...ICON_TILE,
          }}
        >
          <FiMail size={20} strokeWidth={2.3} />
        </span>
        <h3 className="font-display" style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          {CASH_GIFT.title}
        </h3>
      </div>
      <p style={{ margin: '10px 0 16px', fontSize: 14, color: 'var(--text-muted)' }}>{CASH_GIFT.note}</p>

      <div
        style={{
          display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16, padding: '16px 18px', borderRadius: 20,
          background: 'color-mix(in srgb, var(--text-primary) 5%, transparent)',
          border: '1px solid color-mix(in srgb, var(--border) 75%, transparent)',
        }}
      >
        <div>
          <p style={DETAIL_LABEL}>Bank</p>
          <p style={{ margin: '3px 0 0', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{CASH_GIFT.bank}</p>
        </div>
        <div>
          <p style={DETAIL_LABEL}>Account name</p>
          <p style={{ margin: '3px 0 0', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{CASH_GIFT.accountName}</p>
        </div>
        <div>
          <p style={DETAIL_LABEL}>Account number</p>
          <p style={{ margin: '3px 0 0', fontSize: 26, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
            {CASH_GIFT.accountNumber}
          </p>
        </div>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={() => copyText(CASH_GIFT.accountNumber, 'Account number')}
        style={{ ...BUTTON_BASE, ...AMBER_BUTTON, width: 'auto', height: 44, padding: '0 20px', fontSize: 14 }}
      >
        <FiCopy size={16} strokeWidth={2.5} /> Copy account number
      </motion.button>
    </motion.div>
  )
}

export default function GiftsPage() {
  const navigate = useNavigate()

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  const sections = []
  let counter = 0
  for (let g = 0; g < GIFT_GROUPS.length; g++) {
    const group = GIFT_GROUPS[g]
    const GroupIcon = group.Icon
    const cards = []
    for (let i = 0; i < group.items.length; i++) {
      cards.push(<GiftCard key={group.items[i].id} gift={group.items[i]} index={counter} />)
      counter += 1
    }
    sections.push(
      <section key={group.title} style={{ marginTop: g === 0 ? 0 : 34 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 4px 14px' }}>
          <span
            style={{
              width: 36, height: 36, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...ICON_TILE,
            }}
          >
            <GroupIcon size={18} />
          </span>
          <h2 className="font-display" style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {group.title}
          </h2>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{group.items.length}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {cards}
        </div>
      </section>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        padding: 'max(1rem, env(safe-area-inset-top)) 16px calc(7rem + env(safe-area-inset-bottom))',
        fontFamily: '-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <motion.button
          type="button"
          onClick={goBack}
          whileTap={{ scale: 0.94 }}
          aria-label="Back"
          style={{ ...GLASS, width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer' }}
        >
          <FiArrowLeft size={19} strokeWidth={2.5} />
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{ textAlign: 'center', padding: '28px 8px 32px' }}
        >
          <motion.div
            animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4 }}
            style={{
              width: 76, height: 76, borderRadius: 38, margin: '0 auto 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...AMBER_BUTTON,
            }}
          >
            <FiGift size={34} strokeWidth={2.3} />
          </motion.div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#d97706' }}>
            Wedding gift registry
          </p>
          <h1
            className="font-display"
            style={{ margin: '10px 0 6px', fontSize: 'clamp(2rem, 7vw, 3.2rem)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
          >
            {COUPLE}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>{WEDDING_DATE}</p>
          <p style={{ margin: '16px auto 0', maxWidth: 460, fontSize: 15, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
            Your presence is the greatest gift. If you would like to bless us further, here are a few things we would love.
          </p>
        </motion.div>

        <CashGiftCard marginBottom={34} />

        {sections}

        <CashGiftCard marginTop={40} />

        <p style={{ margin: '28px 0 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          Thank you for celebrating with us <FiHeart size={14} strokeWidth={2.5} style={{ color: '#ef4444' }} />
        </p>
      </div>
    </div>
  )
}