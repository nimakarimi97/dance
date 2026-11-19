import bachata from './bachata.json'
import salsa from './salsa.json'

/**
 * App data: each dance has its own JSON file (salsa.json, bachata.json).
 * To add a video, set youtubeId to the YouTube video ID
 * (e.g. youtube.com/watch?v=ABC123xyz -> "ABC123xyz") instead of null.
 */
const danceData = [salsa, bachata]

export const dances = Object.fromEntries(
  danceData.map(({ id, nome, descrizione, stili }) => [id, { id, nome, descrizione, stili }]),
)

export const figures = danceData.flatMap(({ id, figure }) => figure.map(figure => ({ ...figure, danza: id })))

export function findDance(id) {
  return dances[id] ?? null
}

export function getFiguresForDance(danceId) {
  return figures.filter(figure => figure.danza === danceId)
}

export function findFigure(id) {
  return figures.find(figure => figure.id === id) ?? null
}
