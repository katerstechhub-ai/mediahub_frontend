import { create } from 'zustand'

// Holds the BottomNav's real rendered height (footprint, in px, including its
// own bottom offset) so scrollable content can reserve exactly that much
// space — instead of a hardcoded pb-[...] guess that can silently drift out
// of sync whenever the nav's own size changes.
export const useUIStore = create((set) => ({
  bottomNavHeight: 0,
  setBottomNavHeight: (height) => set({ bottomNavHeight: height }),
}))