export function createPracticeStore({ db, users, databaseId, figuresTableId, Query, readPermission, uniqueId }) {
  const params = (tableId, rowId) => ({ databaseId, tableId, rowId })
  async function owned(tableId, rowId, owner) {
    const row = await db.getRow(params(tableId, rowId))
    if (row.owner !== owner) throw Object.assign(new Error('Forbidden'), { code: 403 })
    return row
  }
  return {
    getUser: userId => users.get({ userId }),
    getFigure: rowId => db.getRow(params(figuresTableId, rowId)),
    uniqueId,
    owned,
    async list(tableId, owner) {
      const rows = []
      let page
      do {
        page = await db.listRows({
          databaseId, tableId,
          queries: [Query.equal('owner', owner), Query.limit(100), Query.orderAsc('$id'),
            ...(rows.length ? [Query.cursorAfter(rows.at(-1).$id)] : [])],
        })
        rows.push(...page.rows)
      } while (page.rows.length === 100)
      return rows
    },
    async save(tableId, rowId, owner, data) {
      let existing
      try {
        existing = await owned(tableId, rowId, owner)
      } catch (cause) {
        if (cause.code !== 404) throw cause
      }
      const permissions = [readPermission(owner)]
      if (existing) return db.updateRow({ ...params(tableId, rowId), data, permissions })
      try {
        return await db.createRow({ ...params(tableId, rowId), data, permissions })
      } catch (cause) {
        if (cause.code !== 409) throw cause
        await owned(tableId, rowId, owner)
        return db.updateRow({ ...params(tableId, rowId), data, permissions })
      }
    },
    remove: (tableId, rowId) => db.deleteRow(params(tableId, rowId)),
  }
}
