// Feature flags are enabled by default. Set VITE_FEATURE_<NAME>=false to disable one.
const flag = value => value !== 'false'

const auth = flag(import.meta.env.VITE_FEATURE_AUTH)

// Guests can open this many distinct figures before they must sign in.
export const GUEST_PREVIEW_LIMIT = 3

export const features = {
  auth,
  // The dashboard requires authentication.
  dashboard: auth && flag(import.meta.env.VITE_FEATURE_DASHBOARD),
  // Dance and figure pages are visible without signing in.
  publicContent: import.meta.env.VITE_FEATURE_PUBLIC_CONTENT === 'true',
  // Guests see the first figures up to GUEST_PREVIEW_LIMIT, then must sign in. Needs auth.
  guestPreview: auth && import.meta.env.VITE_FEATURE_GUEST_PREVIEW === 'true',
}

export const isFeatureEnabled = name => features[name] === true
