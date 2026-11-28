export function sortByNewestSaved(items, timestampKey = '$updatedAt') {
  return [...items].sort((a, b) => {
    const savedAtA = a[timestampKey] || a.$updatedAt || a.$createdAt || a.savedAt || ''
    const savedAtB = b[timestampKey] || b.$updatedAt || b.$createdAt || b.savedAt || ''
    return savedAtB.localeCompare(savedAtA) || String(a.id ?? a.$id ?? '').localeCompare(String(b.id ?? b.$id ?? ''), 'en', { numeric: true })
  })
}
