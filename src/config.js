// Central app constants. Nothing financial is hardcoded here – only vocabularies and defaults.
export const TZ = 'Asia/Dhaka'
export const CURRENCY = '৳'

export const CATEGORIES = ['Rice', 'Vegetables', 'Fish & Meat', 'Oil & Spices', 'Miscellaneous']
export const PAYMENT_METHODS = ['Cash', 'bKash', 'Nagad', 'Bank', 'Other']
export const BILL_TYPES = ['Maid', 'Gas', 'Electricity', 'Internet', 'Water', 'Other']
export const SPLIT_METHODS = [
  { key: 'equal', label: 'Equal split', hint: 'Total ÷ members present in the month' },
  { key: 'days', label: 'Days present', hint: 'Proportional to days each member lived here' },
]

export const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch', label: 'Lunch', emoji: '☀️' },
  { key: 'dinner', label: 'Dinner', emoji: '🌙' },
]

// Cutoffs are minutes after midnight, Asia/Dhaka time (also enforced in firestore.rules).
export const DEFAULT_CUTOFFS = { breakfast: 9 * 60, lunch: 14 * 60, dinner: 21 * 60 }

export const DEFAULT_GUEST_WEIGHTS = [
  { label: 'Full guest meal', weight: 1 },
  { label: 'Half guest meal', weight: 0.5 },
]

// Phase 3 switches. Rules + schema already exist; flip to true when the UI is built.
export const FEATURES = { audit: true, notifications: true, inventory: true }

export const ENABLE_STORAGE =
  import.meta.env?.VITE_ENABLE_STORAGE !== 'false' && !!import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET
