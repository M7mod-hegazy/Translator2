function toSyncPayload(edits) {
  const deletedIds = (edits || []).map(e => String(e._id || e.id));
  const deletedSyntheticIds = deletedIds.map(id => `${id}_rev`);
  return {
    deletedIds,
    deletedSyntheticIds,
    syncToken: Date.now()
  };
}

function pruneEditsByDeletion(edits, payload) {
  const deletedIds = payload?.deletedIds || [];
  const deletedSyntheticIds = payload?.deletedSyntheticIds || [];
  const deletedSet = new Set(deletedIds.concat(deletedSyntheticIds));
  return (edits || []).filter(edit => {
    const id = String(edit.editId || '');
    const baseId = id.endsWith('_rev') ? id.slice(0, -4) : id;
    return !deletedSet.has(id) && !deletedSet.has(baseId) && !deletedSet.has(`${baseId}_rev`);
  });
}

module.exports = {
  toSyncPayload,
  pruneEditsByDeletion
};
