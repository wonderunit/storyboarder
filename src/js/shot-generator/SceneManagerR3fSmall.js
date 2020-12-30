import { connect } from 'react-redux'
import React, { useRef, useEffect, useCallback, useMemo, useLayoutEffect } from 'react'
import { 
  getSceneObjects,
  getWorld,
  selectObject,
  getSelections,
  updateObjects,
  setActiveCamera
} from '../shared/reducers/shot-generator'
import { useThree, useFrame } from 'react-three-fiber'
import IconsComponent from './components/IconsComponent'
import CameraIcon from './components/Three/Icons/CameraIcon'
import useFontLoader from './hooks/use-font-loader'
import path from 'path'
import ModelObject from './components/Three/ModelObject'
import ModelLoader from '../services/model-loader'
import { useDraggingManager } from './hooks/use-dragging-manager'
import useShadingEffect from './hooks/use-shading-effect'
import { ShadingType } from '../vendor/shading-effects/ShadingType'
import Room from './components/Three/Room'
import RemoteClients from "./components/RemoteClients"
import XRClient from "./components/Three/XRClient"
import RemoteProvider from "./components/RemoteProvider"

const fontpath = path.join(window.__dirname, '..', 'src', 'fonts', 'thicccboi-bmfont', 'thicccboi-bold.fnt')
const fontpnguri = 'fonts/thicccboi-bmfont/thicccboi-bold.png'

const SceneManagerR3fSmall = connect(
    state => ({
        sceneObjects: getSceneObjects(state),
        world: getWorld(state),
        aspectRatio: state.aspectRatio,
        storyboarderFilePath: state.meta.storyboarderFilePath,
        selections: getSelections(state)
    }),
    {
      selectObject,
      updateObjects,
      setActiveCamera
    }
)( React.memo(({ 
    sceneObjects,
    world,
    aspectRatio,
    storyboarderFilePath,
    selectObject,
    selections,
    updateObjects,
    setSmallCanvasData,
    renderData,
    mainRenderData,
    setActiveCamera,

    mainViewCamera
}) => {
    const { scene, camera, gl, size } = useThree()
    const rootRef = useRef()
    const draggedObject = useRef(null)

    const actualGL = useMemo(() => renderData ? renderData.gl : gl, [renderData])
    const ambientLightRef = useRef()
    const directionalLightRef = useRef()
    const { prepareDrag, drag, updateStore, endDrag } = useDraggingManager(true)
    const sceneObjectLength = Object.values(sceneObjects).length

    const modelObjectIds = useMemo(() => {
     return Object.values(sceneObjects).filter(o => o.type === 'object').map(o => o.id)
    }, [sceneObjectLength])

    const camerasIds = useMemo(() => {
      return Object.values(sceneObjects).filter(o => o.type === 'camera').map(o => o.id)
    }, [sceneObjectLength]) 

    const iconIds = useMemo(() => {
      return Object.values(sceneObjects).filter(o => o.type === 'light' || o.type === 'character' || o.type === 'volume' || o.type === 'image').map(o => o.id)
    }, [sceneObjectLength]) 

    const mouse = useCallback(event => {
      const rect = actualGL.domElement.getBoundingClientRect()
      return {
        x: ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1,
        y: - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1
      }
    }, [actualGL])

    useEffect(() => {
      if(!scene) return
      scene.background = new THREE.Color('#FFFFFF')
    }, [scene])

    useEffect(() => { 
      setSmallCanvasData(camera, scene, gl)
    }, [scene, camera, gl])

    const onPointerDown = useCallback((e) => {
      let match
      e.object.traverseAncestors((o) => {
        if(o.userData.id) match = o
      })
      if(!match || !match.userData || match.userData.locked || match.userData.blocked) return
      selectObject(match.userData.id)
      if(match.userData.type === "camera") {
        setActiveCamera(match.userData.id)
      }
      draggedObject.current = match
      const { x, y } = mouse(e)
      prepareDrag( draggedObject.current, {x, y, camera, scene, selections:[match.userData.id] })
    }, [selections, mouse])

    const onPointerMove = useCallback((e) => {
      if(!draggedObject.current) return
      const { x, y } = mouse(e)
      drag({ x, y }, draggedObject.current, camera, selections)
      updateStore(updateObjects)
    }, [selections, mouse])

    const onPointerUp = useCallback((e) => {
      endDrag(updateObjects)
      draggedObject.current = null
    }, [updateObjects])

    const fontMesh = useFontLoader(fontpath, fontpnguri)
    useEffect(() => { 
        directionalLightRef.current.intensity = world.directional.intensity
        directionalLightRef.current.rotation.x = 0
        directionalLightRef.current.rotation.z = 0
        directionalLightRef.current.rotation.y = world.directional.rotation
        directionalLightRef.current.rotateX(world.directional.tilt+Math.PI/2)
    }, [world])

    const autofitOrtho = useCallback(() => {
      let minMax = [9999,-9999,9999,-9999]
        
      // go through all appropriate objects and get the min max
      let numVisible = 0
      for (let i = 0, length = scene.children[0].children.length; i < length; i++ ) {
        let child = scene.children[0].children[i]
        if (
            child.userData &&
            child.userData.type === 'object' ||
            child.userData.type === 'character' ||
            child.userData.type === 'light' ||
            child.userData.type === 'volume' ||
            child.userData.type === 'image' ||
            child.userData.type === 'camera'
        ) {
          minMax[0] = Math.min(child.position.x, minMax[0])
          minMax[1] = Math.max(child.position.x, minMax[1])
          minMax[2] = Math.min(child.position.z, minMax[2])
          minMax[3] = Math.max(child.position.z, minMax[3])
          numVisible++
        }
      }
      
      // if only one object is in the scene (a single camera)
      if (numVisible === 1) {
        // add some extra padding
        minMax[0] -= 2
        minMax[1] += 2
        minMax[2] -= 2
        minMax[3] += 2
      }
      
      // add some padding
      minMax[0] -= 2
      minMax[1] += 2
      minMax[2] -= 2
      minMax[3] += 2
      
      // get the aspect ratio of the container window
      // target aspect ratio
      let rs = (!renderData)
          ? 1
          : aspectRatio
      
      // make sure the min max box fits in the aspect ratio
      let mWidth = minMax[1]-minMax[0]
      let mHeight = minMax[3]-minMax[2]
      let mAspectRatio = (mWidth/mHeight)
      
      if (mAspectRatio>rs) {
        let padding = (mWidth / rs)-mHeight
        minMax[2] -= padding/2
        minMax[3] += padding/2
      } else {
        let padding = (mHeight / (1/rs))-mWidth
        minMax[0] -= padding/2
        minMax[1] += padding/2
      }
      
      camera.position.x = minMax[0]+((minMax[1]-minMax[0])/2)
      camera.position.z = minMax[2]+((minMax[3]-minMax[2])/2)
      camera.left = -(minMax[1]-minMax[0])/2
      camera.right = (minMax[1]-minMax[0])/2
      camera.top = (minMax[3]-minMax[2])/2
      camera.bottom = -(minMax[3]-minMax[2])/2
      camera.near = -1000
      camera.far = 1000
      camera.updateProjectionMatrix()
    }, [scene, camera, renderData])

    useEffect(() => {
        camera.position.y = 900
        camera.rotation.x = -Math.PI / 2
        camera.layers.enable(2)
        camera.updateMatrixWorld(true)
    }, [])

    useEffect(autofitOrtho, [sceneObjects, aspectRatio, fontMesh, renderData])
    useEffect(() => {
      window.addEventListener("pointerup", onPointerUp)
      return () => window.removeEventListener("pointerup", onPointerUp)
    }, [onPointerUp])

    const getIntersectable = () => {
      let objects = scene.children[0].children
      for(let i = 0; i < objects.length; i++) {
        let object = objects[i]
        object.renderOrder = i
      }
      return objects
    }

    const raycaster = useRef(new THREE.Raycaster())
    const intersectLogic = useCallback((e) => {
      const { x, y } = mouse(e)
      raycaster.current.setFromCamera({x, y}, camera)
      var intersects = raycaster.current.intersectObjects( getIntersectable(), true )
      let target

      if (intersects.length) {
        let closest 
        let linkedPosition
        for (let intersect of intersects) {
          let parent
          if (intersect.object.type === 'Sprite') {
            parent = intersect.object.parent.parent
          } else {
            parent = intersect.object.parent
          }
          linkedPosition = parent.position.clone().setY(0)
          let newDist = linkedPosition.distanceTo(intersect.point.setY(0))
          if (newDist < 0.30){
            if(!closest) {
              closest = {}
              closest.parent = parent
              closest.target = intersect
            } else if(closest.parent.renderOrder < parent.renderOrder) {
              closest.parent = parent
              closest.target = intersect
            }
          }
        }

        target = closest ? closest.target : intersects[0]
      }
      if(!target || (target.object.userData && target.object.userData.type === "ground")) {
        deselect()
        return
      }
      onPointerDown({ clientX: e.clientX, clientY: e.clientY, object: target.object })
    }, [onPointerDown, actualGL])

    const deselect = () => {
        selectObject(null)
    }

    useLayoutEffect(() => {
      actualGL.domElement.addEventListener("pointerdown", intersectLogic)
      actualGL.domElement.addEventListener("pointermove", onPointerMove)
      actualGL.domElement.addEventListener("pointerup", onPointerUp)
      return () => {
        actualGL.domElement.removeEventListener("pointerdown", intersectLogic)
        actualGL.domElement.removeEventListener("pointermove", onPointerMove)
        actualGL.domElement.removeEventListener("pointerup", onPointerUp)
      }
    }, [actualGL, intersectLogic, onPointerMove])

    const renderer = useShadingEffect(
      gl,
      mainViewCamera === 'live' ? ShadingType.Outline : world.shadingMode,
      world.backgroundColor
    )
    useEffect(
      () => {
        if (renderData) {
          renderer.current.setSize(300, Math.floor(300 / aspectRatio))
        } else {
          renderer.current.setSize(300, 300)
        }
      },
      [renderer.current, renderData, aspectRatio, size]
    )
    useFrame(({ scene, camera }) => {
      if (renderData) {
        renderer.current.render(renderData.scene, renderData.camera)
      } else {
        renderer.current.render(scene, camera)
      }
    }, 1)

    /////Render components
    return <group ref={rootRef}>
   
      <ambientLight
        ref={ambientLightRef}
        color={0xffffff}
        intensity={world.ambient.intensity} />

    <directionalLight
        ref={directionalLightRef}
        color={0xffffff}
        intensity={world.directional.intensity}
        position={[0, 1.5, 0]}
        target-position={[0, 0, 0.4]}
    />
    {
        modelObjectIds.map(object => {
          let sceneObject = sceneObjects[object]
          return <ModelObject
              key={ sceneObject.id }
              path={ModelLoader.getFilepathForModel(sceneObject, {storyboarderFilePath})}
              sceneObject={ sceneObject }
              isIcon={true}
              isSelected={ selections.includes(sceneObject.id) }/>
        })
    }

    {
        fontMesh && iconIds.map((object, index) => {
          let sceneObject = sceneObjects[object]
          return <IconsComponent
              key={ index }
              type={ sceneObject.type }
              text={ sceneObject.name ? sceneObject.name : sceneObject.displayName }
              sceneObject={ sceneObject }
              fontMesh={ fontMesh }
              isSelected={ selections.includes(sceneObject.id) }/>
        })
    }
    {
        fontMesh && camerasIds.map(( object, index) => {
            let sceneObject = sceneObjects[object]
            return <CameraIcon
                key={ index }
                type={ sceneObject.type }
                text={ sceneObject.name || sceneObject.displayName }
                sceneObject={ sceneObject }
                mainCamera={ mainRenderData.camera }
                isSelected={ selections.includes(sceneObject.id) }
                fontMesh={ fontMesh } 
                autofitOrtho={ autofitOrtho } />
        })
    }
    {
      <Room width={ world.room.width }
        length={ world.room.length }
        height={ world.room.height }
        visible={ world.room.visible }
        isTopDown={ true } />
    }

      <RemoteProvider>
        <RemoteClients
          Component={XRClient}
        />
      </RemoteProvider>
    </group>
    })
)
export default SceneManagerR3fSmall
