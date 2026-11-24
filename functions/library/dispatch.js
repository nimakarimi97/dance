export function createLibraryHandler({ figures, practice }) {
  return context => {
    if (context.req.method !== 'POST') {
      return context.res.json({ error: 'Metodo non consentito.' }, 405)
    }
    const service = context.req.bodyJson?.service
    if (service === 'figures') return figures(context)
    if (service === 'practice') return practice(context)
    return context.res.json({ error: 'Servizio non valido.' }, 400)
  }
}
