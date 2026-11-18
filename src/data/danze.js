/**
 * Dati dell'app. Per aggiungere un video:
 *  - carica il video su YouTube (anche "non in elenco")
 *  - copia l'ID dall'URL (es. youtube.com/watch?v=ABC123xyz -> "ABC123xyz")
 *  - impostalo in youtubeId al posto di null
 */
export const danze = {
  salsa: {
    id: 'salsa',
    nome: 'Salsa',
    descrizione: 'Dal ritmo cubano alla scuola portoricana: figure, giri e incroci.',
    stili: [
      { id: 'cubana', nome: 'Cubana' },
      { id: 'portoricana', nome: 'Portoricana' },
    ],
  },
  bachata: {
    id: 'bachata',
    nome: 'Bachata',
    descrizione: 'Dalla tradizione dominicana alla sensualità e alle linee moderne.',
    stili: [
      { id: 'dominicana', nome: 'Dominicana' },
      { id: 'sensuale', nome: 'Sensuale' },
      { id: 'moderna', nome: 'Moderna' },
    ],
  },
}

// Figure segnaposto: sostituisci nome, stili e youtubeId con i tuoi.
export const figure = [
  { id: 'salsa-70', danza: 'salsa', nome: '70', stili: ['cubana', 'portoricana'], youtubeId: null },
  { id: 'salsa-75', danza: 'salsa', nome: '75', stili: ['cubana', 'portoricana'], youtubeId: null },
  { id: 'salsa-77', danza: 'salsa', nome: '77', stili: ['cubana'], youtubeId: null },
  { id: 'salsa-enchufla', danza: 'salsa', nome: 'Enchufla', stili: ['cubana', 'portoricana'], youtubeId: null },
  { id: 'salsa-enchufla-mista', danza: 'salsa', nome: 'Enchufla mista', stili: ['portoricana'], youtubeId: null },
  { id: 'salsa-dile-que-no', danza: 'salsa', nome: 'Dile que no', stili: ['portoricana'], youtubeId: null },
  { id: 'bachata-sombrero', danza: 'bachata', nome: 'Sombrero', stili: ['dominicana', 'moderna'], youtubeId: null },
  { id: 'bachata-cucaracha', danza: 'bachata', nome: 'Cucaracha', stili: ['dominicana'], youtubeId: null },
  { id: 'bachata-enchufla', danza: 'bachata', nome: 'Enchufla', stili: ['dominicana', 'sensuale'], youtubeId: null },
  { id: 'bachata-sensual-body-roll', danza: 'bachata', nome: 'Body roll', stili: ['sensuale'], youtubeId: null },
  { id: 'bachata-moderna-cruce', danza: 'bachata', nome: 'Cruce moderno', stili: ['moderna'], youtubeId: null },
]

export function trovaDanza(id) {
  return danze[id] ?? null
}

export function figurePerDanza(idDanza) {
  return figure.filter(f => f.danza === idDanza)
}

export function trovaFigura(id) {
  return figure.find(f => f.id === id) ?? null
}
