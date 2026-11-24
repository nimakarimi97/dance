// Feature flags. Each one can be overridden with VITE_FEATURE_<NAME>=true|false; any other value uses the default.
const flag = (value, defaultValue) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return defaultValue
}

export function resolveFeatures(env) {
  const auth = flag(env.VITE_FEATURE_AUTH, true)

  return {
    auth,
    // The dashboard requires authentication.
    dashboard: auth && flag(env.VITE_FEATURE_DASHBOARD, true),
    // Dance and figure pages are visible without signing in. Requires matching Appwrite permissions.
    publicContent: flag(env.VITE_FEATURE_PUBLIC_CONTENT, false),
    // "La mia pratica": dashboard section and personal panel on figure pages.
    practice: flag(env.VITE_FEATURE_PRACTICE, false),
    // Favorite toggle and the favorites filter inside practice.
    favorites: flag(env.VITE_FEATURE_FAVORITES, true),
    // Offline copies: /offline route and "Salva dettagli offline".
    offline: flag(env.VITE_FEATURE_OFFLINE, true),
    installGuide: flag(env.VITE_FEATURE_INSTALL_GUIDE, true),
    theme: flag(env.VITE_FEATURE_THEME, true),
    // Dashboard catalog section.
    catalog: flag(env.VITE_FEATURE_CATALOG, true),
    // Admin create/edit actions in the catalog.
    figureEditor: flag(env.VITE_FEATURE_FIGURE_EDITOR, true),
    // Admin "Import e audit" section.
    adminOperations: flag(env.VITE_FEATURE_ADMIN_OPERATIONS, true),
    // Admin analytics: dashboard section, snapshot, and event recording.
    analytics: flag(env.VITE_FEATURE_ANALYTICS, true),
    // Superadmin user role management section.
    userRoles: flag(env.VITE_FEATURE_USER_ROLES, true),
  }
}

// Vite replaces import.meta.env at build time; the fallback keeps this module loadable outside Vite.
export const features = resolveFeatures(import.meta.env ?? {})

export const isFeatureEnabled = name => features[name] === true
