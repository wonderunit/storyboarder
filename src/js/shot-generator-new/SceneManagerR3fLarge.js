import { connect } from 'react-redux'
import ModelObject from './components/Three/ModelObject'
import Environment from './components/Three/Environment'
import React, { useRef, useEffect } from 'react'
import Ground from './components/Three/Ground'
import useTextureLoader from './hooks/use-texture-loader'

import { 
    getSceneObjects,
    getWorld,
    getActiveCamera
 } from '../shared/reducers/shot-generator'
import { createSelector } from 'reselect'
import { useThree } from 'react-three-fiber'
import { CameraHelper } from 'three'
import ModelLoader from '../services/model-loader'

const getSceneObjectModelObjectIds = createSelector(
    [getSceneObjects],
    sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'object').map(o => o.id)
  )

const SceneManagerR3fLarge = connect(
    state => ({
        modelObjectIds: getSceneObjectModelObjectIds(state),
        sceneObjects: getSceneObjects(state),
        world: getWorld(state),
        activeCamera: getSceneObjects(state)[getActiveCamera(state)],
        storyboarderFilePath: state.meta.storyboarderFilePath
    }),
    {

    }
)( React.memo(({ 
    modelObjectIds,
    sceneObjects,
    world,
    activeCamera,
    getAsset,
    storyboarderFilePath

}) => {
    const { scene, camera } = useThree()
    const rootRef = useRef()
    const groundRef = useRef()
    const ambientLightRef = useRef()
    const directionalLightRef = useRef()

    const groundTexture = useTextureLoader(window.__dirname + '/data/shot-generator/grid_floor_1.png')
    useEffect(() => { 
        directionalLightRef.current.intensity = world.directional.intensity
        directionalLightRef.current.rotation.x = 0
        directionalLightRef.current.rotation.z = 0
        directionalLightRef.current.rotation.y = world.directional.rotation
        directionalLightRef.current.rotateX(world.directional.tilt+Math.PI/2)
        
    }, [world])

    useEffect(() => {
        camera.position.set(activeCamera.x, activeCamera.z, activeCamera.y)
        camera.rotation.set(activeCamera.tilt, activeCamera.rotation, activeCamera.roll)
        camera.userData.type = activeCamera.type
        camera.userData.locked = activeCamera.locked
        camera.userData.id = activeCamera.id
        camera.fov = activeCamera.fov
        camera.updateMatrixWorld(true)
        camera.updateProjectionMatrix()
    }, [activeCamera])

    useEffect(() => {
        scene.background = new THREE.Color(world.backgroundColor)
    }, [world.background])

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
            let gltf = sceneObject.model != 'box'
                ? getAsset(ModelLoader.getFilepathForModel(sceneObject, {storyboarderFilePath}))
                : null
            return <ModelObject
                key={ sceneObject.id }
                gltf={ gltf }
                sceneObject={ sceneObject }/>
        })
    }
    { 
        groundTexture && <Ground
            objRef={ groundRef }
            texture={ groundTexture }
            visible={ !world.room.visible && world.ground } />
    }   
    {
        world.environment.file &&
        getAsset(ModelLoader.getFilepathForModel({
          type: 'environment',
          model: world.environment.file
        }, { storyboarderFilePath } ))
          ? 
            <Environment
              gltf={getAsset(ModelLoader.getFilepathForModel({
                type: 'environment',
                model: world.environment.file
              }, { storyboarderFilePath } ))}
              environment={world.environment}
              visible={world.environment.visible} />
          : null
    }

    
    </group>

    })
)
export default SceneManagerR3fLarge
