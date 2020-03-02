import { connect } from 'react-redux'
import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import { 
  getSceneObjects,
  getWorld,
  selectObject,
  getSelections,
  updateObjects,
  setActiveCamera
} from '../shared/reducers/shot-generator'
import { useThree } from 'react-three-fiber'
import IconsComponent from './components/IconsComponent'
import CameraIcon from './components/Three/Icons/CameraIcon'
import useFontLoader from './hooks/use-font-loader'
import path from 'path'
import ModelObject from './components/Three/ModelObject'
import ModelLoader from '../services/model-loader'
import { useDraggingManager } from './hooks/use-dragging-manager'
import SaveShot from './components/Three/SaveShot'
import Room from './components/Three/Room'

const fontpath = path.join(window.__dirname, '..', 'src', 'fonts', 'wonder-unit-bmfont', 'wonderunit-b.fnt')
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
    setActiveCamera

}) => {
    const { scene, camera, gl } = useThree()
    const rootRef = useRef()
    const draggedObject = useRef(null)

    const actualGL = useMemo(() => renderData ? renderData.gl : gl)
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
      if(renderData) {
        gl.setSize(Math.floor(300), Math.floor(300 / renderData.camera.aspect))
      } else {
        gl.setSize(300, 300)
      }
    }, [renderData])

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
        if(o.userData.id) match =  o
      })
      if(!match.userData || match.userData.locked ) return
      selectObject(match.userData.id)
      if(match.userData.type === "camera") {
        setActiveCamera(match.userData.id)
      }
      draggedObject.current = match
      const { x, y } = mouse(e)
      prepareDrag( draggedObject.current, {x, y, camera, scene, selections:[match.userData.id] })
    }, [scene, camera, selections, sceneObjects, mouse])

    const onPointerMove = useCallback((e) => {
      if(!draggedObject.current) return
      const { x, y } = mouse(e)
      drag({ x, y }, draggedObject.current, camera, selections)
      updateStore(updateObjects)
    }, [camera, selections, mouse])

    const onPointerUp = useCallback((e) => {
      endDrag(updateObjects)
      draggedObject.current = null
    }, [updateObjects])

    const fontMesh =  useFontLoader(fontpath, 'fonts/wonder-unit-bmfont/wonderunit-b.png')
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
      //camera.updateMatrixWorld(true)
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

    const raycaster = useRef(new THREE.Raycaster())
    const intersectLogic = (e) => {
      const { x, y } = mouse(e)
      raycaster.current.setFromCamera({x, y}, camera)
      var intersects = raycaster.current.intersectObjects( scene.children[0].children, true )
      if(!intersects[0] || (intersects[0].object.userData && intersects[0].object.userData.type === "ground")) {
        
        selectObject(null)
        return
      }
      onPointerDown({ clientX: e.clientX, clientY: e.clientY, object: intersects[0].object })
    }

    const deselect = () => {
        selectObject(null)
    }

    useEffect(() => {
      if(!renderData) return
      renderData.gl.domElement.addEventListener("pointerdown", intersectLogic)
      renderData.gl.domElement.addEventListener("pointermove", onPointerMove)
      renderData.gl.domElement.addEventListener("pointerup", onPointerUp)
      return () => {
        if(!renderData) return
        renderData.gl.domElement.removeEventListener("pointerdown", intersectLogic)
        renderData.gl.domElement.removeEventListener("pointermove", onPointerMove)
        renderData.gl.domElement.removeEventListener("pointerup", onPointerUp)
      }
    }, [renderData, intersectLogic])

    useEffect(() => {
      if(renderData) return
        gl.domElement.addEventListener("pointermove", onPointerMove)
        gl.domElement.addEventListener("pointerdown", deselect)
      return () => {
        if(renderData) return
          gl.domElement.removeEventListener("pointermove", onPointerMove)
          gl.domElement.removeEventListener("pointerdown", deselect)
      }
    }, [onPointerMove])

    /////Render components
    return <group ref={rootRef}
      onPointerDown={ e => {
        selectObject(null)
      }}>
   
      <SaveShot isPlot={ true }/>
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
              isSelected={ selections.includes(sceneObject.id) }
              onPointerUp={e => {
                e.stopPropagation()
                renderData || onPointerUp(e)
              }}
              onPointerDown={e => {
                e.stopPropagation()
                renderData ||  onPointerDown(e)
              }}
              />
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
              isSelected={ selections.includes(sceneObject.id) }
              onPointerUp={e => {
                e.stopPropagation()
                renderData || onPointerUp(e)
              }}
              onPointerDown={e => {
                e.stopPropagation()
                renderData || onPointerDown(e)
              }}
          />
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
                onPointerUp={e => {
                  e.stopPropagation()
                  renderData || onPointerUp(e)
                }}
                onPointerDown={e => {
                  e.stopPropagation()
                  renderData ||  onPointerDown(e)
                }}
                
                />
        })
    }
    {
      <Room width={ world.room.width }
        length={ world.room.length }
        height={ world.room.height }
        visible={ world.room.visible }
        isTopDown={ true } />
    }
    </group>

    })
)
export default SceneManagerR3fSmall
