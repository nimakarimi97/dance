import bachata from './bachata.json'
import salsa from './salsa.json'

/**
 * Dati dell'app: ogni danza ha il suo file JSON (salsa.json, bachata.json).
 * Per aggiungere un video, imposta youtubeId con l'ID del video YouTube
 * (es. youtube.com/watch?v=ABC123xyz -> "ABC123xyz") al posto di null.
 */
const danzeJson = [salsa, bachata]

export const danze = Object.fromEntries(
  danzeJson.map(({ id, nome, descrizione, stili }) => [id, { id, nome, descrizione, stili }]),
)

export const figure = danzeJson.flatMap(({ id, figure }) => figure.map(f => ({ ...f, danza: id })))

export function trovaDanza(id) {
  return danze[id] ?? null
}

export function figurePerDanza(idDanza) {
  return figure.filter(f => f.danza === idDanza)
}

export function trovaFigura(id) {
  return figure.find(f => f.id === id) ?? null
}
