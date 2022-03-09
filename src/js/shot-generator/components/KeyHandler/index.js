
import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react'
import { connect } from 'react-redux'
import getGroupAction from '../../../utils/getGroupAction'
import { createSelector } from 'reselect'
import { ipcRenderer} from 'electron'
const remote = require('@electron/remote')
const { dialog } = remote
import KeyCommandsSingleton from './KeyCommandsSingleton'

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
    selectObject,
  
    duplicateObjects,

    getSceneObjects,
    getSelections,
    getActiveCamera,
    cycleShadingMode
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
    selectObject,
    cycleShadingMode
  }
)(
  React.memo(({
    activeCamera,
    selections,
    sceneObjects,
    selectObject,
    _selectedSceneObject,
    duplicateObjects,
    deleteObjects,
    groupObjects,
    ungroupObjects,
    mergeGroups,
    cycleShadingMode
  }) => {
    const [, updateComponent] = useState()
    const keyCommandsInstance = useRef(KeyCommandsSingleton.getInstance())

    useEffect(() => {
      KeyCommandsSingleton.getInstance().updateComponent = updateComponent
      
      return () => {
        KeyCommandsSingleton.getInstance().updateComponent = null
      }
    }, [updateComponent])

    const deleteSelectedObject = useCallback(() => {
        if (selections.length && canDelete(_selectedSceneObject, activeCamera)) {
            dialog.showMessageBox(null, {
              type: 'question',
              buttons: ['Yes', 'No'],
              message: `Deleting ${selections.length} item${selections.length > 1 ? 's' : ''}. Are you sure?`
            })
            .then(({ response }) => {
              if (response === 0) {
                let objectsToDelete = selections.concat()
                for(let i = 0; i < selections.length; i++) {
                  let sceneObject = sceneObjects[selections[i]]
                  if(sceneObject.type === "character") {
                      let attachableIds = Object.values(sceneObjects).filter(obj => obj.attachToId === selections[i]).map(obj => obj.id)
                      objectsToDelete = attachableIds.concat(objectsToDelete)
                  }
                }
          
                deleteObjects(objectsToDelete)
                keyCommandsInstance.current.removeKeyCommand({ key: "removeElement" })
              }
            })
            .catch(err => console.error(err))
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
          let group = groupObjects(groupAction.objectsIds)
          selectObject([group.payload.groupId, ...group.payload.ids])
        } else if (groupAction.shouldUngroup) {
          selectObject(groupAction.objectsIds)
          ungroupObjects(groupAction.groupsIds[0], groupAction.objectsIds)
        } else {
          selectObject(null)
          let group =  mergeGroups(groupAction.groupsIds, groupAction.objectsIds)
          selectObject([group.payload.groupIds[0], ...group.payload.ids])
        }
      }
    }, [selections, sceneObjects])

    useEffect(() => {
      keyCommandsInstance.current.addIPCKeyCommand({ key: "shot-generator:object:duplicate", value: onCommandDuplicate})
      return () => keyCommandsInstance.current.removeIPCKeyCommand({ key: "shot-generator:object:duplicate" }) 
    }, [onCommandDuplicate])

    useEffect(() => {
      keyCommandsInstance.current.addIPCKeyCommand({ key: "shot-generator:object:group", value: onCommandGroup })
      return () => {
        keyCommandsInstance.current.removeIPCKeyCommand({ key: "shot-generator:object:group" })
      } 
    }, [onCommandGroup])

    useEffect(() => {
      keyCommandsInstance.current.addIPCKeyCommand({ key: "shot-generator:view:cycleShadingMode", value: cycleShadingMode })
      return () => {
        keyCommandsInstance.current.removeIPCKeyCommand({ key: "shot-generator:view:cycleShadingMode" })
      } 
    }, [cycleShadingMode])

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
        if(!KeyCommandsSingleton.getInstance().isEnabledKeysEvents) return
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
