import  { connect } from 'react-redux'
import  { useMemo, useRef }  from 'react'
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

      undoGroupStart()
      createLight(id)
      selectObject(id)
      undoGroupEnd()
    }

    const onCreateVolumeClick = () => {
      let id = THREE.Math.generateUUID()

      undoGroupStart()
      createVolume(id)
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

    const onOpenVR = preventDefault(() =>
      notifications.notify({
        message: `To view, open a VR web browser to:\n<a href="${server.xrUri}">${server.xrUri}</a>`,
        timing: 30,
        onClick: () => require('electron').shell.openExternal(server.xrUri)
      })
    )
 
    return (
      <div id='toolbar' key='toolbar'> 
        <div className='toolbar__addition row'>
          <a href='#' 
             onClick={preventDefault(onCreateCameraClick)}>
            <Icon src='icon-toolbar-camera'/>
            <span>Camera</span>
          </a>
          <a href='#' 
             onClick={preventDefault(onCreateObjectClick)}>
            <Icon src='icon-toolbar-object'/>
            <span>Object</span>
          </a>
          <a href='#' 
             onClick={preventDefault(onCreateCharacterClick)}>
            <Icon src='icon-toolbar-character'/>
            <span>Character</span>
          </a>
          <a href='#' 
             onClick={preventDefault(onCreateLightClick)}>
            <Icon src='icon-toolbar-light'/>
            <span>Light</span>
          </a>
          <a href='#' 
             onClick={preventDefault(onCreateVolumeClick)}>
            <Icon src='icon-toolbar-volume'/>
            <span>Volume</span>
          </a>
          <a href='#' 
             onClick={preventDefault(onCreateImageClick)}>
            <Icon src='icon-toolbar-image'/>
            <span>Image</span>
          </a>
        </div>
        <div className="toolbar__board-actions row">
          {server.xrUri && (
            <a href='#'
               onClick={preventDefault(onOpenVR) }>
              <Icon src='icon-toolbar-vr'/>
              <span>Open in VR</span>
            </a>
          )}
        <a href='#' 
           onClick={preventDefault(onSaveToBoardClick)}>
          <Icon src='icon-toolbar-save-to-board'/>
          <span>Save to Board</span>
        </a>
        <a href='#' 
           onClick={preventDefault(onInsertNewBoardClick)}>
          <Icon src='icon-toolbar-insert-as-new-board'/>
          <span>Insert As New Board</span>
        </a>
        </div>
      </div>
    )
  }
))

export default Toolbar
