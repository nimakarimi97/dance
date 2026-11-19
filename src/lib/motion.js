// GSAP animations only run when the user has not asked for reduced motion.
export const canAnimate = () =>
  typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Hover tilt only makes sense with a real pointer, not on touch screens.
export const hasHover = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
