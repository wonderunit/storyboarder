import { connect } from 'react-redux'
import React, { useMemo, useRef, useCallback, useEffect }  from 'react'
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

import {useServerConnect, SERVER_STATUS} from '../../../services/server'

import { useTranslation } from 'react-i18next'
import { useInsertImage } from '../../hooks/use-insert-image'
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
    let { t } = useTranslation()

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

    const initializeImage = (id, imagePath = "") => {
      initCamera()
      undoGroupStart()
      createImage(id, camera.current, room.visible && roomObject3d, imagePath)
      selectObject(id)
      undoGroupEnd()
    }

    const { dragOver, imageDrop, createImageFromClipboard } = useInsertImage(initializeImage)

    useEffect(() => {
      window.addEventListener('paste', createImageFromClipboard, false)
      window.addEventListener('drop', imageDrop, false) 
      window.addEventListener('dragover', dragOver, false); 
      return () => {
        window.removeEventListener('dragover', dragOver); 
        window.removeEventListener('drop', imageDrop)
        window.removeEventListener('paste', createImageFromClipboard)
      }
    }, [])
  

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
      initializeImage(id)
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
            `${t("shot-generator.toolbar.popup.open-vr")}:\n` +
            `<a href="${server.xrUri}">${server.xrUri}</a>`,
          timing: 30,
          onClick: () => shell.openExternal(server.xrUri)
        })
      }
    }, [serverStatus])

    const VRStatusClassname = (serverStatus === SERVER_STATUS.CONNECTING) ? 'active' : null

    const cameraTooltipEvents = useTooltip(t("shot-generator.toolbar.camera.tooltip.title"), t("shot-generator.toolbar.camera.tooltip.description"), null, "bottom center")
    const objectTooltipEvents = useTooltip(t("shot-generator.toolbar.object.tooltip.title"), t("shot-generator.toolbar.object.tooltip.description"), null, "bottom center")
    const characterTooltipEvents = useTooltip(t("shot-generator.toolbar.character.tooltip.title"), t("shot-generator.toolbar.character.tooltip.description"), null, "bottom center")
    const lightTooltipEvents = useTooltip(t("shot-generator.toolbar.light.tooltip.title"), t("shot-generator.toolbar.light.tooltip.description"), null, "bottom center")
    const volumeTooltipEvents = useTooltip(t("shot-generator.toolbar.volume.tooltip.title"), t("shot-generator.toolbar.volume.tooltip.description"), null, "bottom center")
    const imageTooltipEvents = useTooltip(t("shot-generator.toolbar.image.tooltip.title"), t("shot-generator.toolbar.image.tooltip.description"), null, "bottom center")

    const vrTooltipEvents = useTooltip(t("shot-generator.toolbar.open-in-vr.tooltip.title"), t("shot-generator.toolbar.open-in-vr.tooltip.description"), null, "bottom center")

    const saveTooltipEvents = useTooltip(t("shot-generator.toolbar.save-to-board.tooltip.title"), t("shot-generator.toolbar.save-to-board.tooltip.description"), null, "bottom center")
    const insertTooltipEvents = useTooltip(t("shot-generator.toolbar.insert-as-new-board.tooltip.title"), t("shot-generator.toolbar.insert-as-new-board.tooltip.description"), null, "bottom right")

    return (
      <div id="toolbar" key="toolbar">
        <div className="toolbar__addition row">
          <a href="#"
             onClick={preventDefault(onCreateCameraClick)}
             {...cameraTooltipEvents}>
            <Icon src="icon-toolbar-camera"/>
            <span>{t("shot-generator.toolbar.camera.title")}</span>
          </a>
          <a href="#"
             onClick={preventDefault(onCreateObjectClick)}
             {...objectTooltipEvents}>
            <Icon src="icon-toolbar-object"/>
            <span>{t("shot-generator.toolbar.object.title")}</span>
          </a>
          <a href="#"
             onClick={preventDefault(onCreateCharacterClick)}
             {...characterTooltipEvents}>
            <Icon src="icon-toolbar-character"/>
            <span>{t("shot-generator.toolbar.character.title")}</span>
          </a>
          <a href="#"
             onClick={preventDefault(onCreateLightClick)}
             {...lightTooltipEvents}>
            <Icon src="icon-toolbar-light"/>
            <span>{t("shot-generator.toolbar.light.title")}</span>
          </a>
          <a href="#"
             onClick={preventDefault(onCreateVolumeClick)}
             {...volumeTooltipEvents}>
            <Icon src="icon-toolbar-volume"/>
            <span>{t("shot-generator.toolbar.volume.title")}</span>
          </a>
          <a href="#"
             onClick={preventDefault(onCreateImageClick)}
             {...imageTooltipEvents}>
            <Icon src="icon-toolbar-image"/>
            <span>{t("shot-generator.toolbar.image.title")}</span>
          </a>
        </div>
        <div className="toolbar__board-actions row">
          <a href="#"
            className={VRStatusClassname}
            onClick={ onVRClick }
            {...vrTooltipEvents}>
            <Icon src="icon-toolbar-vr"/>
            <span>{t("shot-generator.toolbar.open-in-vr.title")}</span>
          </a>
          <a href="#"
            onClick={preventDefault(onSaveToBoardClick)}
            {...saveTooltipEvents}>
            <Icon src="icon-toolbar-save-to-board"/>
            <span>{t("shot-generator.toolbar.save-to-board.title")}</span>
          </a>
          <a href="#"
            onClick={preventDefault(onInsertNewBoardClick)}
            {...insertTooltipEvents}>
            <Icon src="icon-toolbar-insert-as-new-board"/>
            <span>{t("shot-generator.toolbar.insert-as-new-board.title")}</span>
          </a>
        </div>
      </div>
    )
  }
))

export default Toolbar
