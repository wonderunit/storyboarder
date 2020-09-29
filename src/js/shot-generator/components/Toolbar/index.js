import { connect } from 'react-redux'
import React, { useMemo, useRef, useCallback }  from 'react'
import {
  // action creators
  selectObject,
  undoGroupStart,
  undoGroupEnd,
  setActiveCamera,

  // selectors
  getWorld,
  getSceneObjects,
  getActiveCamera
} from '../../../shared/reducers/shot-generator'

import SceneObjectCreators from '../../../shared/actions/scene-object-creators'

import Icon from '../Icon'
import useTooltip from '../../../hooks/use-tooltip'

import {useServerConnect, SERVER_STATUS} from '../../../xr/server'

// because webpack
const { shell } = require('electron')

// TODO DRY
const preventDefault = (fn, ...args) => e => {
  e.preventDefault()
  fn(e, ...args)
}

const Toolbar = connect(
    state => ({
      room: getWorld(state).room,
      server: state.server
    }),
    {
      selectObject,
      undoGroupStart,
      undoGroupEnd,
      setActiveCamera,

      createCamera: SceneObjectCreators.createCamera,
      createModelObject: SceneObjectCreators.createModelObject,
      createCharacter: SceneObjectCreators.createCharacter,
      createLight: SceneObjectCreators.createLight,
      createVolume: SceneObjectCreators.createVolume,
      createImage: SceneObjectCreators.createImage
    }
)(
  React.memo(({
    // redux state
    room,
    server,

    // action creators
    selectObject,
    undoGroupStart,
    undoGroupEnd,
    setActiveCamera,

    createCamera,
    createModelObject,
    createCharacter,
    createLight,
    createVolume,
    createImage,

    // props
    ipcRenderer,
    withState,

    notifications
  }) => {
    let cameraState = null
    let camera = useRef(null)

    const roomObject3dFactory = ({ width, height, length }) => {
      let geometry = new THREE.BoxBufferGeometry(
        width,
        height,
        length
      )
      let material = new THREE.MeshBasicMaterial( { color: 0xff0000, side: THREE.BackSide } )
      let mesh = new THREE.Mesh(geometry, material)
      return mesh
    }

    const roomObject3d = useMemo(
      () => roomObject3dFactory(room),
      [room]
    )

    const initCamera = () => {
      withState((dispatch, state) => {
        cameraState = getSceneObjects(state)[getActiveCamera(state)]
      })

      if(camera.current === null) {
        camera.current = new THREE.PerspectiveCamera(cameraState.fov)
      } else {
        camera.current.fov = cameraState
        camera.current.updateProjectionMatrix()
      }
      camera.current.position.set(cameraState.x, cameraState.z, cameraState.y)
      camera.current.rotation.set(cameraState.tilt, cameraState.rotation, cameraState.roll)
      camera.current.updateMatrixWorld(true)
    }

    const onCreateCameraClick = () => {
      let id = THREE.Math.generateUUID()

      initCamera()
      undoGroupStart()
      createCamera(id, cameraState, camera.current)
      selectObject(id)
      setActiveCamera(id)
      undoGroupEnd()
    }

    const onCreateObjectClick = () => {
      let id = THREE.Math.generateUUID()
      initCamera()
      undoGroupStart()
      createModelObject(id, camera.current, room.visible && roomObject3d)
      selectObject(id)
      undoGroupEnd()
    }

    const onCreateCharacterClick = () => {
      let id = THREE.Math.generateUUID()
      initCamera()
      undoGroupStart()
      createCharacter(id, camera.current, room.visible && roomObject3d)
      selectObject(id)
      undoGroupEnd()
    }

    const onCreateLightClick = () => {
      let id = THREE.Math.generateUUID()
      initCamera()
      undoGroupStart()
      createLight(id, camera.current, room.visible && roomObject3d)
      selectObject(id)
      undoGroupEnd()
    }

    const onCreateVolumeClick = () => {
      let id = THREE.Math.generateUUID()
      initCamera()
      undoGroupStart()
      createVolume(id, camera.current, room.visible && roomObject3d)
      selectObject(id)
      undoGroupEnd()
    }

    const onCreateImageClick = () => {
      let id = THREE.Math.generateUUID()
      initCamera()
      undoGroupStart()
      createImage(id, camera.current, room.visible && roomObject3d)
      selectObject(id)
      undoGroupEnd()
    }

    const onSaveToBoardClick = () => {
      ipcRenderer.send('shot-generator:requestSaveShot')
    }

    const onInsertNewBoardClick = () => {
      ipcRenderer.send('shot-generator:requestInsertShot')
    }

    const [serverStatus, onConnect] = useServerConnect()
    const onVRClick = useCallback(preventDefault(() => {
      console.log('SERVER CONN', serverStatus)
      if (serverStatus === SERVER_STATUS.DISABLED) {
        console.log('SERVER CONN 22')
        onConnect()
      } else if (serverStatus === SERVER_STATUS.ACTIVE) {
        notifications.notify({
          message:
            `To view, open a VR web browser to:\n` +
            `<a href="${server.xrUri}">${server.xrUri}</a>`,
          timing: 30,
          onClick: () => shell.openExternal(server.xrUri)
        })
      } else if (serverStatus === SERVER_STATUS.ERROR) {
        notifications.notify({
          message:
            `Server connection error\n` +
            `Try later`,
          timing: 30
        })
      }

    }), [serverStatus])

    useMemo(() => {
      if (serverStatus === SERVER_STATUS.ACTIVE) {
        notifications.notify({
          message:
            `To view, open a VR web browser to:\n` +
            `<a href="${server.xrUri}">${server.xrUri}</a>`,
          timing: 30,
          onClick: () => shell.openExternal(server.xrUri)
        })
      }
    }, [serverStatus])

    const VRStatusClassname = (serverStatus === SERVER_STATUS.CONNECTING) ? 'active' : null

    const cameraTooltipEvents = useTooltip("Add Camera", "Add a new camera in the scene.", null, "bottom center")
    const objectTooltipEvents = useTooltip("Add Object", "Add a new object. You can change the properties to the left.", null, "bottom center")
    const characterTooltipEvents = useTooltip("Add Character", "Add a new character in the scene. You can change the pose by dragging the control point spheres around.", null, "bottom center")
    const lightTooltipEvents = useTooltip("Add Light", "Add a spot light into the scene.", null, "bottom center")
    const volumeTooltipEvents = useTooltip("Add Volume", "Add a volume like rain, fog, explosion.", null, "bottom center")
    const imageTooltipEvents = useTooltip("Add Image", "Add an image. You can specify a custom image properties on the left. This is useful for reference images or posters or matte paintings in your scene.", null, "bottom center")

    const vrTooltipEvents = useTooltip("Open in VR", "Click this to see the address you should type into your VR browser like the Oculus Quest.", null, "bottom center")

    const saveTooltipEvents = useTooltip("Save to Board", "Save the current shot to the current Storyboard. After you save it, you can close this window.", null, "bottom center")
    const insertTooltipEvents = useTooltip("Insert As New Board", "Insert the current shot after the current Storyboard. After you insert a new board, you can close this window, or continue to insert more shots.", null, "bottom right")

    return (
      <div id="toolbar" key="toolbar">
        <div className="toolbar__addition row">
          <a href="#"
             onClick={preventDefault(onCreateCameraClick)}
             {...cameraTooltipEvents}>
            <Icon src="icon-toolbar-camera"/>
            <span>Camera</span>
          </a>
          <a href="#"
             onClick={preventDefault(onCreateObjectClick)}
             {...objectTooltipEvents}>
            <Icon src="icon-toolbar-object"/>
            <span>Object</span>
          </a>
          <a href="#"
             onClick={preventDefault(onCreateCharacterClick)}
             {...characterTooltipEvents}>
            <Icon src="icon-toolbar-character"/>
            <span>Character</span>
          </a>
          <a href="#"
             onClick={preventDefault(onCreateLightClick)}
             {...lightTooltipEvents}>
            <Icon src="icon-toolbar-light"/>
            <span>Light</span>
          </a>
          <a href="#"
             onClick={preventDefault(onCreateVolumeClick)}
             {...volumeTooltipEvents}>
            <Icon src="icon-toolbar-volume"/>
            <span>Volume</span>
          </a>
          <a href="#"
             onClick={preventDefault(onCreateImageClick)}
             {...imageTooltipEvents}>
            <Icon src="icon-toolbar-image"/>
            <span>Image</span>
          </a>
        </div>
        <div className="toolbar__board-actions row">
          <a href="#"
            className={VRStatusClassname}
            onClick={ onVRClick }
            {...vrTooltipEvents}>
            <Icon src="icon-toolbar-vr"/>
            <span>Open in VR</span>
          </a>
        <a href="#"
           onClick={preventDefault(onSaveToBoardClick)}
           {...saveTooltipEvents}>
          <Icon src="icon-toolbar-save-to-board"/>
          <span>Save to Board</span>
        </a>
        <a href="#"
           onClick={preventDefault(onInsertNewBoardClick)}
           {...insertTooltipEvents}>
          <Icon src="icon-toolbar-insert-as-new-board"/>
          <span>Insert As New Board</span>
        </a>
        </div>
      </div>
    )
  }
))

export default Toolbar
