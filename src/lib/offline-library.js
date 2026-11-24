export const OFFLINE_KEY = 'dance.offline.v1'
const detailKeys = ['id', 'nome', 'danza', 'stili', 'aliases', 'description', 'difficulty', '$updatedAt']

export function createOfflineLibrary(storage) {
  function read() {
    const raw = storage.getItem(OFFLINE_KEY)
    if (!raw) return { owner: '', figures: [] }
    const data = JSON.parse(raw)
    if (typeof data.owner !== 'string' || !Array.isArray(data.figures)) {
      throw new Error('Archivio offline non valido. Elimina le copie locali e riprova.')
    }
    return data
  }
  function write(data) {
    storage.setItem(OFFLINE_KEY, JSON.stringify(data))
  }
  return {
    read,
    activate(owner) {
      if (!owner) throw new Error('Accedi prima di salvare offline.')
      if (read().owner !== owner) write({ owner, figures: [] })
    },
    save(owner, figure) {
      const data = read()
      if (!owner || data.owner !== owner) throw new Error('Account cambiato. Riapri la pagina.')
      if (!figure?.id || !figure.nome) throw new Error('Dettagli della figura non validi.')
      const details = Object.fromEntries(detailKeys.filter(key => figure[key] !== undefined).map(key => [key, figure[key]]))
      const snapshot = { ...details, savedAt: new Date().toISOString() }
      write({ owner, figures: [...data.figures.filter(item => item.id !== figure.id), snapshot] })
      return snapshot
    },
    remove(owner, id) {
      const data = read()
      if (data.owner !== owner) throw new Error('Account cambiato. Riapri la pagina.')
      write({ ...data, figures: data.figures.filter(item => item.id !== id) })
    },
    clear() { storage.removeItem(OFFLINE_KEY) },
  }
}

export function browserOfflineLibrary() {
  return createOfflineLibrary(window.localStorage)
}
