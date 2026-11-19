import { ID, Query } from 'appwrite'
import { appwriteConfig, client, storage, tablesDB } from './appwrite.js'

const table = () => ({
  databaseId: appwriteConfig.databaseId,
  tableId: appwriteConfig.figuresTableId,
})

export async function listFigures() {
  const rows = []
  let page
  do {
    page = await tablesDB.listRows({
      ...table(),
      queries: [Query.limit(100), Query.orderAsc('$sequence'), ...(rows.length ? [Query.cursorAfter(rows.at(-1).$id)] : [])],
    })
    rows.push(...page.rows)
  } while (page.rows.length === 100)
  return rows.map(row => ({ ...row, id: row.$id }))
}

export const MAX_MEDIA_SIZE = 50_000_000
export const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov']
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

function validateFile(file, extensions) {
  if (!file) return
  if (!file.size || file.size > MAX_MEDIA_SIZE) throw new Error('Ogni file deve essere tra 1 byte e 50 MB.')
  if (!extensions.includes(file.name.split('.').pop().toLowerCase())) {
    throw new Error(`Formato non supportato. Usa: ${extensions.join(', ')}.`)
  }
}

export async function saveFigure({ id, data, video, image }) {
  validateFile(video, VIDEO_EXTENSIONS)
  validateFile(image, IMAGE_EXTENSIONS)
  const uploaded = []
  try {
    for (const [file, key] of [[video, 'videoFileId'], [image, 'imageFileId']]) {
      if (!file) continue
      const result = await storage.createFile({
        bucketId: appwriteConfig.mediaBucketId, fileId: ID.unique(), file, permissions: [],
      })
      uploaded.push(result.$id)
      data = { ...data, [key]: result.$id }
    }
    return id
      ? await tablesDB.updateRow({ ...table(), rowId: id, data })
      : await tablesDB.createRow({ ...table(), rowId: ID.unique(), data, permissions: [] })
  } catch (error) {
    const cleanup = await Promise.allSettled(uploaded.map(fileId =>
      storage.deleteFile({ bucketId: appwriteConfig.mediaBucketId, fileId }),
    ))
    const failures = cleanup.filter(result => result.status === 'rejected')
    if (failures.length) {
      console.error('Media rollback failed', failures)
      throw new Error(`${error.message} Alcuni file caricati non sono stati rimossi: controlla il bucket Appwrite.`, { cause: error })
    }
    throw error
  }
}

export async function loadMedia(fileId) {
  const params = { bucketId: appwriteConfig.mediaBucketId, fileId }
  const metadata = await storage.getFile(params)
  // SDK requests include fallback session headers when third-party cookies are blocked.
  const bytes = await client.call('get', new URL(storage.getFileView(params)), {}, {}, 'arrayBuffer')
  return new Blob([bytes], { type: metadata.mimeType })
}
