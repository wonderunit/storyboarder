
import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react'
import { connect } from 'react-redux'
import getGroupAction from '../../../utils/getGroupAction'
import { createSelector } from 'reselect'
import { ipcRenderer, remote} from 'electron'
const { dialog } = remote
import KeyCommandsSingleton from './KeyCommandsSingleton'
import DuplicationCommand from './commands/DuplicateCommand'
import GroupCommand from './commands/GroupCommand'

const canDelete = (sceneObject, activeCamera) =>
  // allow objects
  sceneObject.type === 'object' ||
  // allow characters
  sceneObject.type === 'character' ||
  // allow volumes
  sceneObject.type === 'volume' ||
  // allow lights
  sceneObject.type === 'light' ||
  // allow images
  sceneObject.type === 'image' ||
  // allow cameras which are not the active camera
  (sceneObject.type === 'camera' && sceneObject.id !== activeCamera)

import  {
    deleteObjects,
    groupObjects,
    ungroupObjects,
    mergeGroups,
  
    duplicateObjects,

    getSceneObjects,
    getSelections,
    getActiveCamera,
  } from '../../../shared/reducers/shot-generator'

const getSelectedSceneObject = createSelector(
  [getSceneObjects, getSelections],
  (sceneObjects, selections) => Object.values(sceneObjects).find(o => o.id === selections[0])
)

const KeyHandler = connect(
  state => ({
    activeCamera: getActiveCamera(state),
    selections: getSelections(state),
    sceneObjects: getSceneObjects(state),
    _selectedSceneObject: getSelectedSceneObject(state),
  }),
  {
    duplicateObjects,
    deleteObjects,
    groupObjects,
    ungroupObjects,
    mergeGroups,
  }
)(
  React.memo(({
    activeCamera,
    selections,
    sceneObjects,
    _selectedSceneObject,
    duplicateObjects,
    deleteObjects,
    groupObjects,
    ungroupObjects,
    mergeGroups,
  }) => {
    const [, updateComponent] = useState()
    const keyCommandsInstance = useRef(KeyCommandsSingleton.getInstance())

    useEffect(() => {
      KeyCommandsSingleton.getInstance().updateComponent = updateComponent
    }, [updateComponent])

    const deleteSelectedObject = useCallback(() => {
        if (selections.length && canDelete(_selectedSceneObject, activeCamera)) {
            let choice = dialog.showMessageBox(null, {
              type: 'question',
              buttons: ['Yes', 'No'],
              message: `Deleting ${selections.length} item${selections.length > 1 ? 's' : ''}. Are you sure?`
            })
            if (choice === 0) {
              deleteObjects(selections)
              keyCommandsInstance.current.removeKeyCommand({ key: "removeElement" })
            }
          }
    }, [_selectedSceneObject, activeCamera, selections])


    const onCommandDuplicate = useCallback(() => {
      if (selections) {
        let selected = (_selectedSceneObject.type === 'group') ? [_selectedSceneObject.id] : selections
        // NOTE: this will also select the new duplicates, replacing selection
        duplicateObjects(
          // ids to duplicate
            selected,
          // new ids
            selected.map(THREE.Math.generateUUID)
        )
      }
    }, [selections, _selectedSceneObject])

    const onCommandGroup = useCallback(() => {
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
    }, [selections, sceneObjects])

    useEffect(() => {
      keyCommandsInstance.current.addIPCKeyCommand({ key: "shot-generator:object:duplicate", value: onCommandDuplicate})
      return () => keyCommandsInstance.current.removeIPCKeyCommand({ key: "shot-generator:object:duplicate" }) 
    }, [onCommandDuplicate])
    
    useEffect(() => {
      keyCommandsInstance.current.addIPCKeyCommand({ key: "shot-generator:object:group", value: onCommandGroup })
      return () => keyCommandsInstance.current.removeIPCKeyCommand({ key: "shot-generator:object:group" })
    }, [onCommandGroup])

    useEffect(() => {
        keyCommandsInstance.current.addKeyCommand({
            key: "removeElement",
            keyCustomCheck: (event) => event.key === 'Backspace' || event.key === 'Delete',
            value: deleteSelectedObject
        })
        return () => keyCommandsInstance.current.removeKeyCommand({ key: "removeElement" })
    }, [_selectedSceneObject, activeCamera, selections])


    const bindIpcCommands = () => {
        let ipcCommands = keyCommandsInstance.current.ipcKeyCommands
        for(let i = 0; i < ipcCommands.length; i++) {
            ipcRenderer.on(ipcCommands[i].key, ipcCommands[i].execute)
        }
    }

    const unbindIpcCommands = () => {
        let ipcCommands = keyCommandsInstance.current.ipcKeyCommands
        let removedCommands = keyCommandsInstance.current.removedIpcCommands
        for( let i = 0; i < ipcCommands.length; i++) {
            ipcRenderer.off(ipcCommands[i].key, ipcCommands[i].execute)
        }
        for( let i = removedCommands.length - 1; i > -1; i--) {

            ipcRenderer.off(removedCommands[i].key, removedCommands[i].execute)
            removedCommands.splice(i, 1)
        }
    }

    useEffect(() => {
      const onKeyDown = event => {

        let keyCommands = KeyCommandsSingleton.getInstance().keyCommands
        for(let i = 0; i < keyCommands.length; i ++ ) {
            let keyCommand = keyCommands[i]
            if(event.key === keyCommand.key) {
                keyCommand.execute(event)
            } else if(keyCommand.keyCustomCheck && keyCommand.keyCustomCheck(event)) {
                keyCommand.execute(event)
            }
        }
      }

      window.addEventListener('keydown', onKeyDown)
      return function cleanup () {
          window.removeEventListener('keydown', onKeyDown)
        }
    }, [ KeyCommandsSingleton.getInstance().keyCommands.length ])

    useEffect(() => {
        bindIpcCommands()
        return () => {
          unbindIpcCommands()
        } 
    }, [ KeyCommandsSingleton.getInstance().ipcKeyCommands.length,  KeyCommandsSingleton.getInstance().removedIpcCommands.length ])

    return null
  }
))
export default KeyHandler
