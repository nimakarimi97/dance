// Feature flags are enabled by default. Set VITE_FEATURE_<NAME>=false to disable one.
const flag = value => value !== 'false'

const auth = flag(import.meta.env.VITE_FEATURE_AUTH)

export const features = {
  auth,
  // The dashboard requires authentication.
  dashboard: auth && flag(import.meta.env.VITE_FEATURE_DASHBOARD),
  // Dance and figure pages are visible without signing in.
  publicContent: flag(import.meta.env.VITE_FEATURE_PUBLIC_CONTENT),
}

export const isFeatureEnabled = name => features[name] === true
