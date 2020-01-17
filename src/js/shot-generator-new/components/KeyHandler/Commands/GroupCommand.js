
const GroupCommand = (selections, sceneObjects, getGroupAction, groupObjects, ungroupObjects, mergeGroups) => {
    return { key: "shot-generator:object:group",
            value: () => onCommandGroup(selections, sceneObjects, getGroupAction, groupObjects, ungroupObjects, mergeGroups) }
} 

const onCommandGroup = (selections, sceneObjects, getGroupAction, groupObjects, ungroupObjects, mergeGroups) => {
    if (selections) {
      const groupAction = getGroupAction(sceneObjects, selections)
      if (groupAction.shouldGroup) {
        groupObjects(groupAction.objectsIds)
      } else if (groupAction.shouldUngroup) {
        ungroupObjects(groupAction.groupsIds[0], groupAction.objectsIds)
      } else {
        mergeGroups(groupAction.groupsIds, groupAction.objectsIds)
      }
    }
}

export default GroupCommand
