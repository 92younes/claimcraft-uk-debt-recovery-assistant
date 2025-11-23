/**
 * Design System Constants
 *
 * Centralized design tokens for consistent styling across the application.
 * Based on analysis comparing ClaimCraft UK with industry standards (garfield.law).
 *
 * Usage:
 * import { BORDER_RADIUS, SHADOWS, SPACING } from '@/constants/design';
 *
 * className={`${BORDER_RADIUS.card} ${SHADOWS.elevated}`}
 */

// ===================================================================
// BORDER RADIUS
// ===================================================================
// Standardized to 3 main sizes + full for consistency
export const BORDER_RADIUS = {
  // Small - Buttons, badges, small UI elements
  sm: 'rounded-lg',      // 0.5rem (8px)

  // Medium - Cards, inputs, most containers (DEFAULT)
  md: 'rounded-xl',      // 0.75rem (12px)

  // Large - Large cards, modals, major containers
  lg: 'rounded-2xl',     // 1rem (16px)

  // Full - Circular elements, pills, avatars
  full: 'rounded-full',

  // Aliases for semantic meaning
  button: 'rounded-lg',
  card: 'rounded-xl',
  modal: 'rounded-2xl',
  input: 'rounded-lg',
  badge: 'rounded-lg',
  pill: 'rounded-full',
  avatar: 'rounded-full'
} as const;

// ===================================================================
// SHADOWS
// ===================================================================
// Reduced from 6+ variations to 3 semantic levels
export const SHADOWS = {
  // Subtle - For subtle elevation (cards at rest)
  subtle: 'shadow-sm',

  // Elevated - For clear elevation (cards on hover, dropdowns)
  elevated: 'shadow-lg',

  // Floating - For maximum elevation (modals, popovers, tooltips)
  floating: 'shadow-2xl',

  // Inner - For inset elements (text areas, pressed buttons)
  inner: 'shadow-inner',

  // None - Explicitly no shadow
  none: 'shadow-none',

  // Aliases for semantic meaning
  card: 'shadow-sm',
  cardHover: 'shadow-lg',
  modal: 'shadow-2xl',
  dropdown: 'shadow-lg',
  tooltip: 'shadow-lg',
  button: 'shadow-sm',
  buttonHover: 'shadow-lg'
} as const;

// ===================================================================
// SPACING
// ===================================================================
// Systematic spacing scale for padding, margins, and gaps
export const SPACING = {
  // Container padding (responsive)
  container: 'p-6 md:p-10',
  containerX: 'px-6 md:px-10',
  containerY: 'py-6 md:py-10',

  // Card padding
  card: 'p-6',
  cardSm: 'p-4',
  cardLg: 'p-8',

  // Section spacing
  section: 'py-10 md:py-16',

  // Gaps between elements
  gapXs: 'gap-2',  // 0.5rem (8px)
  gapSm: 'gap-4',  // 1rem (16px)
  gapMd: 'gap-6',  // 1.5rem (24px)
  gapLg: 'gap-8',  // 2rem (32px)
  gapXl: 'gap-10', // 2.5rem (40px)

  // Semantic aliases
  itemGap: 'gap-4',      // Between related items
  sectionGap: 'gap-8',   // Between sections
  formGap: 'gap-6'       // Between form fields
} as const;

// ===================================================================
// COLORS
// ===================================================================
// Semantic color tokens for consistent theming
// Note: Using Tailwind classes for now, can migrate to CSS custom properties later
export const COLORS = {
  // Primary (Dark theme)
  primary: 'slate-900',
  primaryHover: 'slate-800',
  primaryText: 'white',

  // Secondary
  secondary: 'white',
  secondaryBorder: 'slate-200',
  secondaryHover: 'slate-50',

  // Accent (Blue)
  accent: 'blue-600',
  accentLight: 'blue-50',
  accentDark: 'blue-800',

  // Xero Brand (was hardcoded #13b5ea, now using Tailwind)
  xero: 'sky-500',       // Closest Tailwind color to #13b5ea
  xeroLight: 'sky-50',
  xeroDark: 'sky-700',

  // Success
  success: 'green-600',
  successLight: 'green-50',
  successDark: 'green-700',

  // Warning
  warning: 'amber-500',
  warningLight: 'amber-50',
  warningDark: 'amber-700',

  // Danger
  danger: 'red-600',
  dangerLight: 'red-50',
  dangerDark: 'red-700',

  // Neutral
  background: 'white',
  backgroundAlt: 'slate-50',
  backgroundDark: 'slate-100',

  text: 'slate-900',
  textSecondary: 'slate-600',
  textTertiary: 'slate-400',

  border: 'slate-200',
  borderDark: 'slate-300'
} as const;

// ===================================================================
// TRANSITIONS
// ===================================================================
// Standardized transition timings and easings
export const TRANSITIONS = {
  // Fast - Quick UI responses (hover states)
  fast: 'transition-all duration-150 ease-out',

  // Normal - Standard transitions (most interactions)
  normal: 'transition-all duration-200 ease-out',

  // Slow - Deliberate animations (modals, large movements)
  slow: 'transition-all duration-300 ease-out',

  // Semantic aliases
  hover: 'transition-all duration-150 ease-out',
  fade: 'transition-opacity duration-200 ease-out',
  slide: 'transition-transform duration-200 ease-out',
  all: 'transition-all duration-200 ease-out'
} as const;

// ===================================================================
// FOCUS STATES
// ===================================================================
// Consistent focus indicators for accessibility
export const FOCUS = {
  // Primary focus ring (blue)
  primary: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',

  // Secondary focus ring (slate)
  secondary: 'focus:outline-none focus:ring-2 focus:ring-slate-700 focus:ring-offset-2',

  // Danger focus ring (red)
  danger: 'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',

  // Success focus ring (green)
  success: 'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',

  // Aliases
  button: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  input: 'focus:outline-none focus:ring-2 focus:ring-blue-500',
  buttonPrimary: 'focus:outline-none focus:ring-2 focus:ring-slate-700 focus:ring-offset-2',
  buttonDanger: 'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
} as const;

// ===================================================================
// BUTTON STYLES
// ===================================================================
// Pre-composed button styles for consistency
export const BUTTON_STYLES = {
  // Primary button (dark background)
  primary: `bg-${COLORS.primary} hover:bg-${COLORS.primaryHover} text-${COLORS.primaryText}
    ${BORDER_RADIUS.button} ${SHADOWS.button} hover:${SHADOWS.buttonHover}
    ${TRANSITIONS.hover} ${FOCUS.buttonPrimary}
    font-bold px-8 py-3 flex items-center justify-center gap-2
    disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 active:translate-y-0`,

  // Secondary button (white background, bordered)
  secondary: `bg-${COLORS.secondary} border border-${COLORS.secondaryBorder}
    hover:border-${COLORS.borderDark} text-slate-700
    ${BORDER_RADIUS.button} ${SHADOWS.button}
    ${TRANSITIONS.hover} ${FOCUS.button}
    font-medium px-6 py-3 flex items-center justify-center gap-2
    disabled:opacity-50 disabled:cursor-not-allowed`,

  // Danger button (red)
  danger: `bg-${COLORS.danger} hover:bg-${COLORS.dangerDark} text-white
    ${BORDER_RADIUS.button} ${SHADOWS.button}
    ${TRANSITIONS.hover} ${FOCUS.buttonDanger}
    font-bold px-6 py-3 flex items-center justify-center gap-2
    disabled:opacity-50 disabled:cursor-not-allowed`,

  // Text button (no background)
  text: `text-slate-600 hover:text-slate-900 hover:bg-slate-50
    ${BORDER_RADIUS.button} ${TRANSITIONS.hover} ${FOCUS.button}
    font-medium px-4 py-2 flex items-center gap-2`
} as const;

// ===================================================================
// CARD STYLES
// ===================================================================
// Pre-composed card styles for consistency
export const CARD_STYLES = {
  // Default card
  default: `bg-white ${BORDER_RADIUS.card} ${SHADOWS.card} border border-${COLORS.border} ${SPACING.card}`,

  // Elevated card (hover state)
  elevated: `bg-white ${BORDER_RADIUS.card} ${SHADOWS.elevated} border border-${COLORS.border} ${SPACING.card}`,

  // Interactive card (clickable)
  interactive: `bg-white ${BORDER_RADIUS.card} ${SHADOWS.card} border border-${COLORS.border} ${SPACING.card}
    hover:${SHADOWS.elevated} hover:border-blue-200 ${TRANSITIONS.hover} cursor-pointer`,

  // Small card
  small: `bg-white ${BORDER_RADIUS.card} ${SHADOWS.subtle} border border-${COLORS.border} ${SPACING.cardSm}`,

  // Large card
  large: `bg-white ${BORDER_RADIUS.card} ${SHADOWS.card} border border-${COLORS.border} ${SPACING.cardLg}`
} as const;

// ===================================================================
// EXPORTS
// ===================================================================
export const DESIGN = {
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
  spacing: SPACING,
  colors: COLORS,
  transitions: TRANSITIONS,
  focus: FOCUS,
  buttons: BUTTON_STYLES,
  cards: CARD_STYLES
} as const;

export default DESIGN;
