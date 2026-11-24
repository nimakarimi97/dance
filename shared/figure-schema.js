export const DANCE_STYLES = Object.freeze({
  salsa: ['cubana', 'portoricana'],
  bachata: ['dominicana', 'sensuale', 'moderna'],
})
export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']
export const FIGURE_FIELDS = ['nome', 'danza', 'stili', 'youtubeId', 'videoFileId', 'imageFileId', 'aliases', 'description', 'difficulty']
export const validFigureId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(value)

export class FigureValidationError extends Error {
  constructor(errors) {
    super(errors.map(error => `${error.field}: ${error.message}`).join('; '))
    this.name = 'FigureValidationError'
    this.errors = errors
  }
}

export function normalizeFigureData(data, { partial = false } = {}) {
  const errors = []
  const result = {}
  const invalid = (field, message) => errors.push({ field, message })
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new FigureValidationError([{ field: 'data', message: 'Oggetto figura richiesto.' }])
  }
  for (const key of Object.keys(data)) {
    if (!FIGURE_FIELDS.includes(key)) invalid(key, 'Campo non consentito.')
  }
  for (const field of ['nome', 'danza']) {
    if (!(field in data) && partial) continue
    const value = typeof data[field] === 'string' ? data[field].trim() : ''
    if (!value || value.length > (field === 'nome' ? 255 : 36)) invalid(field, 'Valore obbligatorio o troppo lungo.')
    else result[field] = value
  }
  if ('danza' in result && !Object.hasOwn(DANCE_STYLES, result.danza)) invalid('danza', 'Danza non supportata.')
  if ('stili' in data || !partial) {
    const styles = data.stili
    if (!Array.isArray(styles) || !styles.length || styles.length > 5
      || styles.some(style => typeof style !== 'string' || !Object.values(DANCE_STYLES).flat().includes(style))) {
      invalid('stili', 'Scegli almeno uno stile valido.')
    } else {
      result.stili = [...new Set(styles)]
      if (result.danza && DANCE_STYLES[result.danza] && result.stili.some(style => !DANCE_STYLES[result.danza].includes(style))) {
        invalid('stili', 'Stile incompatibile con la danza.')
      }
    }
  }
  for (const field of ['youtubeId', 'videoFileId', 'imageFileId']) {
    if (!(field in data)) continue
    const value = data[field] === null ? null : typeof data[field] === 'string' ? data[field].trim() : undefined
    if (value === undefined || (value && !(field === 'youtubeId' ? /^[a-zA-Z0-9_-]{11}$/.test(value) : validFigureId(value)))) {
      invalid(field, 'Identificatore non valido.')
    } else result[field] = value
  }
  if ('aliases' in data) {
    if (!Array.isArray(data.aliases) || data.aliases.length > 20 || data.aliases.some(alias => typeof alias !== 'string' || !alias.trim() || alias.trim().length > 100)) {
      invalid('aliases', 'Massimo 20 alias, ciascuno da 1 a 100 caratteri.')
    } else result.aliases = [...new Set(data.aliases.map(alias => alias.trim()))]
  }
  if ('description' in data) {
    if (typeof data.description !== 'string' || data.description.length > 4000) invalid('description', 'Testo di massimo 4000 caratteri.')
    else result.description = data.description.trim()
  }
  if ('difficulty' in data) {
    if (data.difficulty !== null && !DIFFICULTIES.includes(data.difficulty)) invalid('difficulty', 'Difficoltà non valida.')
    else result.difficulty = data.difficulty
  }
  if (partial && !Object.keys(data).length) invalid('data', 'Nessuna modifica.')
  if (errors.length) throw new FigureValidationError(errors)
  return result
}

export function validateFigureRows(rows) {
  const errors = []
  if (!Array.isArray(rows) || !rows.length || rows.length > 50) {
    return { rows: [], errors: [{ index: -1, field: 'rows', message: 'Inserisci da 1 a 50 righe.' }] }
  }
  const ids = new Set()
  const normalized = rows.map((row, index) => {
    try {
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new FigureValidationError([{ field: 'row', message: 'Riga non valida.' }])
      for (const field of Object.keys(row)) {
        if (!['id', 'data', 'expectedUpdatedAt'].includes(field)) throw new FigureValidationError([{ field, message: 'Campo riga non consentito.' }])
      }
      if (row.id !== undefined && (!validFigureId(row.id) || ids.has(row.id))) {
        throw new FigureValidationError([{ field: 'id', message: 'ID non valido o duplicato.' }])
      }
      if (row.expectedUpdatedAt !== undefined && (!row.id || typeof row.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(row.expectedUpdatedAt)))) {
        throw new FigureValidationError([{ field: 'expectedUpdatedAt', message: 'Versione non valida.' }])
      }
      if (row.id) ids.add(row.id)
      return { ...(row.id ? { id: row.id } : {}), data: normalizeFigureData(row.data, { partial: Boolean(row.id) }), ...(row.expectedUpdatedAt ? { expectedUpdatedAt: row.expectedUpdatedAt } : {}) }
    } catch (cause) {
      if (!(cause instanceof FigureValidationError)) throw cause
      errors.push(...cause.errors.map(error => ({ index, ...error })))
      return null
    }
  })
  return { rows: normalized, errors }
}
