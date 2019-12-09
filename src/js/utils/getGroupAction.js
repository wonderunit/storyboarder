const getGroupAction = (sceneObjects, ids) => {
  let withoutGroup = new Set()
  let objectsIds = new Set()
  let groupsIds = new Set()
  
  /** Collect data */
  for (let id of ids) {
    if (sceneObjects[id] == null) continue
    const groupId = sceneObjects[id].group
    if (groupId) {
      groupsIds.add(groupId)
      objectsIds.add(id)
    } else if (sceneObjects[id].children) {
      groupsIds.add(id)
    } else {
      withoutGroup.add(id)
      objectsIds.add(id)
    }
  }
  
  let shouldUngroup = false
  let shouldGroup = false
  let shouldMerge = false
  
  /** Process data */
  if (groupsIds.size === 1 && withoutGroup.size === 0) {
    /** We selected a single group, we can ungroup the whole group or part of it */
    shouldUngroup = true
  } else if (groupsIds.size === 0 && withoutGroup.size > 0) {
    /** We didn't selected any group, create new one and group items */
    shouldGroup = true
  } else {
    /** We selected more than one group, merge them together */
    shouldMerge = true
  }
  
  return {
    withoutGroup: [...withoutGroup],
    objectsIds: [...objectsIds],
    groupsIds: [...groupsIds],
    shouldGroup,
    shouldMerge,
    shouldUngroup
  }
}

module.exports = getGroupAction
