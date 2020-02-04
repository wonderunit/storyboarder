import { connect } from 'react-redux'
import React, { useRef, useEffect, useCallback } from 'react'
import { 
  getSceneObjects,
  getWorld,
  selectObject,
  getSelections,
  updateObjects
} from '../shared/reducers/shot-generator'
import { createSelector } from 'reselect'
import { useThree } from 'react-three-fiber'
import IconsComponent from './components/IconsComponent'
import CameraIcon from './components/Three/Icons/CameraIcon'
import Ground from './components/Three/Ground'
import useTextureLoader from './hooks/use-texture-loader'
import useFontLoader from './hooks/use-font-loader'
import path from 'path'
import ModelObject from './components/Three/ModelObject'
import ModelLoader from '../services/model-loader'
import { useDraggingManager} from './use-dragging-manager'
//Move to sg folder
import findMatchingAncestor from './helpers/find-matching-ancestor'

const getSceneObjectModelObjectIds = createSelector(
    [getSceneObjects],
    sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'object').map(o => o.id)
  )
const getSceneObjectCamerasIds = createSelector(
    [getSceneObjects],
    sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'camera').map(o => o.id)
  ) 
const getSceneObjectIconIds = createSelector(
  [getSceneObjects],
  sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'light' || o.type === 'character' || o.type === 'volume' || o.type === 'image').map(o => o.id)
)
const fontpath = path.join(window.__dirname, '..', 'src', 'fonts', 'wonder-unit-bmfont', 'wonderunit-b.fnt')
const SceneManagerR3fSmall = connect(
    state => ({
        modelObjectIds: getSceneObjectModelObjectIds(state),
        camerasIds: getSceneObjectCamerasIds(state),
        iconIds: getSceneObjectIconIds(state),
        sceneObjects: getSceneObjects(state),
        world: getWorld(state),
        aspectRatio: state.aspectRatio,
        storyboarderFilePath: state.meta.storyboarderFilePath,
        selections: getSelections(state)
    }),
    {
      selectObject,
      updateObjects
    }
)( React.memo(({ 
    modelObjectIds,
    camerasIds,
    sceneObjects,
    world,
    aspectRatio,
    storyboarderFilePath,
    selectObject,
    selections,
    updateObjects,
    iconIds

}) => {
    const { scene, camera, gl } = useThree()
    const rootRef = useRef()
    const groundRef = useRef()
    const draggedObject = useRef(null)

    const ambientLightRef = useRef()
    const directionalLightRef = useRef()
    const { prepareDrag, drag, updateStore, endDrag } = useDraggingManager(true)

    const groundTexture = useTextureLoader(window.__dirname + '/data/shot-generator/grid_floor_1.png')
    const mouse = event => {
      const rect = gl.domElement.getBoundingClientRect()
      return {
        x: ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1,
        y: - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1
      }
    }


    const onPointerDown = useCallback((e) => {
      let match
      e.object.traverseAncestors((o) => {
        if(o.userData.id) match =  o
      })
      if(match.userData.locked) return
      selectObject(match.userData.id)
      draggedObject.current = match
      const { x, y } = mouse(e)
      prepareDrag( draggedObject.current, {x, y, camera, scene, selections:[match.userData.id] })
    }, [scene, camera, selections])

    const onPointerMove = useCallback((e) => {
      if(!draggedObject.current) return
      const { x, y } = mouse(e)
      drag({ x, y }, draggedObject.current, camera, selections)
      updateStore(updateObjects)
    }, [camera, selections])

    const onPointerUp = useCallback((e) => {
      if(!draggedObject.current) return
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
      for (let child of scene.children[0].children) {
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
      let rs = 1
      
      
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
      camera.updateMatrixWorld(true)
      camera.updateProjectionMatrix()
    }, [scene, camera])

    useEffect(() => {
        camera.position.y = 900
        camera.rotation.x = -Math.PI / 2
        camera.layers.enable(2)
        camera.updateMatrixWorld(true)
    }, [])

    useEffect(autofitOrtho, [sceneObjects, aspectRatio, fontMesh])

    /////Render components
    return <group ref={rootRef}
      onPointerDown={ e => {
        selectObject(null)
      }}
      onPointerMove={e => {
        e.stopPropagation()
        onPointerMove(e)
        }}> 
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
              isSelected={ selections.includes(sceneObject.id) }
              onPointerUp={e => {
                e.stopPropagation()
                onPointerUp(e)
              }}
              onPointerDown={e => {
                e.stopPropagation()
                onPointerDown(e)
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
                onPointerUp(e)
              }}
              onPointerDown={e => {
                e.stopPropagation()
                onPointerDown(e)
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
                isSelected={ selections.includes(sceneObject.id) }
                fontMesh={ fontMesh } 
                onPointerUp={e => {
                  e.stopPropagation()
                  onPointerUp(e)
                }}
                onPointerDown={e => {
                  e.stopPropagation()
                  onPointerDown(e)
                }}
                
                />
        })
    }
    { groundTexture && <Ground
        objRef={ groundRef }
        texture={ groundTexture }
        visible={ !world.room.visible && world.ground } />
    }
    </group>

    })
)
export default SceneManagerR3fSmall
