
import React, { useEffect, useContext, useMemo, useRef} from 'react'
import { connect } from 'react-redux'
import getGroupAction from '../../../utils/getGroupAction'
import { createSelector } from 'reselect'
import { SceneContext } from '../../Components'
import { ipcRenderer } from 'electron'
import KeyCommandsSingleton from './KeyCommandsSingleton'
import DuplicationCommand from './commands/DuplicateCommand'
import GroupCommand from './commands/GroupCommand'

const getCameraSceneObjects = createSelector(
    [getSceneObjects],
    (sceneObjects) => Object.values(sceneObjects).filter(o => o.type === 'camera')
)
const getSelectedSceneObject = createSelector(
  [getSceneObjects, getSelections],
  (sceneObjects, selections) => Object.values(sceneObjects).find(o => o.id === selections[0])
)

import  {
    selectObject,
    updateObject,
    deleteObjects,
    groupObjects,
    ungroupObjects,
    mergeGroups,
  
    duplicateObjects,
  
    setMainViewCamera,
    setActiveCamera,
    updateObjects,
  
    undoGroupStart,
    undoGroupEnd,

    getSceneObjects,
    getSelections,
    getActiveCamera,
  } from '../../../shared/reducers/shot-generator'

const KeyHandler = connect(
  state => ({
    mainViewCamera: state.mainViewCamera,
    activeCamera: getActiveCamera(state),
    selections: getSelections(state),
    sceneObjects: getSceneObjects(state),

    _selectedSceneObject: getSelectedSceneObject(state),

    _cameras: getCameraSceneObjects(state)
  }),
  {
    setMainViewCamera,
    selectObject,
    setActiveCamera,
    duplicateObjects,
    deleteObjects,
    groupObjects,
    ungroupObjects,
    mergeGroups,
    updateObject,
    undoGroupStart,
    undoGroupEnd,
    updateObjects
  }
)(
  ({
    mainViewCamera,
    activeCamera,
    selections,
    sceneObjects,
    _selectedSceneObject,
    _cameras,
    setMainViewCamera,
    selectObject,
    setActiveCamera,
    duplicateObjects,
    deleteObjects,
    groupObjects,
    ungroupObjects,
    mergeGroups,
    updateObject,
    undoGroupStart,
    undoGroupEnd,
    machineState
  }) => {
    const { scene } = useContext(SceneContext)
    const keyCommandsInstance = useRef(KeyCommandsSingleton.getInstance())

    useEffect(() => {
        keyCommandsInstance.current.addIPCKeyCommand(DuplicationCommand(selections, _selectedSceneObject, duplicateObjects))
        return () => keyCommandsInstance.current.removeIPCKeyCommand(DuplicationCommand())
    }, [selections, _selectedSceneObject])
    
    useEffect(() => {
        keyCommandsInstance.current.addIPCKeyCommand(GroupCommand(selections, sceneObjects, getGroupAction, groupObjects, ungroupObjects, mergeGroups))
        return () => keyCommandsInstance.current.removeIPCKeyCommand(GroupCommand())
    }, [sceneObjects, selections])

    const bindIpcCommands = () => {
        let ipcCommands = keyCommandsInstance.current.ipcKeyCommands
        for(let i = 0; i < ipcCommands.length; i++) {
            ipcRenderer.on(ipcCommands[i].key, ipcCommands[i].execute)
        }
    }

    const unbindIpcCommands = () => {
        let ipcCommands = keyCommandsInstance.current.ipcKeyCommands
        let removedCommands = keyCommandsInstance.current.removedIpcCommands
        console.log(removedCommands)
        for( let i = 0; i < ipcCommands.length; i++) {
            ipcRenderer.off(ipcCommands[i].key, ipcCommands[i].execute)
        }
        for( let i = removedCommands.length - 1; i >= 0; i--) {
            ipcRenderer.off(removedCommands[i].key, removedCommands[i].execute)
            removedCommands.splice(i, 1)
        }
    }

    useEffect(() => {
      const onCameraSelectByIndex = index => {
        if (_cameras[index]) {
          let id = _cameras[index].id
          undoGroupStart()
          selectObject(id)
          setActiveCamera(id)
          undoGroupEnd()
        }
      }

      const onKeyDown = event => {
        if(machineState.matches('typing')) return 

        if (event.key === 'Backspace' || event.key === 'Delete') {
          if (selections.length && canDelete(_selectedSceneObject, activeCamera)) {
            let choice = dialog.showMessageBox(null, {
              type: 'question',
              buttons: ['Yes', 'No'],
              message: `Deleting ${selections.length} item${selections.length > 1 ? 's' : ''}. Are you sure?`
            })
            if (choice === 0) {
              deleteObjects(selections)
            }
          }
        }
        if (event.key === 't') {
          setMainViewCamera(mainViewCamera === 'ortho' ? 'live' : 'ortho')
        }
        if (event.key === 'Escape') {
          selectObject(activeCamera)
        }
        if (
          event.key === '1' ||
          event.key === '2' ||
          event.key === '3' ||
          event.key === '4' ||
          event.key === '5' ||
          event.key === '6' ||
          event.key === '7' ||
          event.key === '8' ||
          event.key === '9'
          ) {
            onCameraSelectByIndex(parseInt(event.key, 10) - 1)
          }

        if (
          (event.key === 'z' || event.key === 'x') &&
          !event.shiftKey &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        ) {
          let cameraState = _cameras.find(camera => camera.id === activeCamera)
          let roll = {
            'z': Math.max(cameraState.roll - THREE.Math.DEG2RAD, -45 * THREE.Math.DEG2RAD),
            'x': Math.min(cameraState.roll + THREE.Math.DEG2RAD, 45 * THREE.Math.DEG2RAD)
          }[event.key]

          updateObject(activeCamera, { roll })
        }

        if (event.key === '[' || event.key === ']') {
          let cameraState = _cameras.find(camera => camera.id === activeCamera)

          let mms = [12, 16, 18, 22, 24, 35, 50, 85, 100, 120, 200, 300, 500]

          let camera = scene.children.find(child => child.userData.id === activeCamera)
          let fakeCamera = camera.clone() // TODO reuse a single object
          let fovs = mms.map(mm => {
            fakeCamera.setFocalLength(mm)
            return fakeCamera.fov
          }).sort((a, b) => a - b)
          fakeCamera = null

          let index = indexIn(fovs, cameraState.fov)

          let fov = {
            '[': fovs[Math.min(index + 1, fovs.length)],
            ']': fovs[Math.max(index - 1, 0)]
          }[event.key]

          updateObject(activeCamera, { fov })
        }

        let keyCommands = KeyCommandsSingleton.getInstance().keyCommands
        for(let i = 0; i < keyCommands.length; i ++ ) {
            let keyCommand = keyCommands[i]
            if(event.key === keyCommand.key) {
                keyCommand.execute()
            }
        }
      }

      window.addEventListener('keydown', onKeyDown)
      
      return function cleanup () {
          window.removeEventListener('keydown', onKeyDown)
        }
    }, [mainViewCamera, _cameras, selections, _selectedSceneObject, activeCamera])
    
    useEffect(() => {
        bindIpcCommands()
        console.log("Ipc commands binded")
        return () =>{
            unbindIpcCommands()
            console.log("Ipc commands unbinded")
        } 
    }, [KeyCommandsSingleton.getInstance().ipcKeyCommands.length])

    return null
  }
)
export default KeyHandler
