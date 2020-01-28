import { connect } from 'react-redux'
import ModelObject from './components/Three/ModelObject'
import Environment from './components/Three/Environment'
import React, { useRef, useEffect, useMemo } from 'react'
import Ground from './components/Three/Ground'
import useTextureLoader from './hooks/use-texture-loader'
import { 
    getSceneObjects,
    getWorld,
    getActiveCamera,
    selectObject,
    getSelections,
    updateCharacterSkeleton,
    updateCharacterIkSkeleton,
    updateObject,
    updateObjects,
    getSelectedBone,
    updateCharacterPoleTargets
 } from '../shared/reducers/shot-generator'
import { createSelector } from 'reselect'
import { useThree } from 'react-three-fiber'
import ModelLoader from '../services/model-loader'
import Character from './components/Three/Character'
import Attachable from './components/Three/Attachable'
import InteractionManager from './components/Three/InteractionManager'
import SGIkHelper from '../shared/IK/SGIkHelper'
import SimpleErrorBoundary from './components/SimpleErrorBoundary'
const getSceneObjectModelObjectIds = createSelector(
    [getSceneObjects],
    sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'object').map(o => o.id)
  )
const getSceneObjectCharacterIds = createSelector(
    [getSceneObjects],
    sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'character').map(o => o.id)
  ) 

  const getSceneObjectAttachableIds = createSelector(
    [getSceneObjects],
    sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'attachable').map(o => o.id)
  )

const SceneManagerR3fLarge = connect(
    state => ({
        modelObjectIds: getSceneObjectModelObjectIds(state),
        characterIds: getSceneObjectCharacterIds(state),
        attachableIds: getSceneObjectAttachableIds(state),
        sceneObjects: getSceneObjects(state),
        world: getWorld(state),
        activeCamera: getSceneObjects(state)[getActiveCamera(state)],
        storyboarderFilePath: state.meta.storyboarderFilePath,
        selections: getSelections(state),
        models: state.models,
        selectedBone: getSelectedBone(state),
    }),
    {
        selectObject,
        updateCharacterSkeleton,
        updateCharacterIkSkeleton,
        updateObject,
        updateCharacterPoleTargets,
        updateObjects
    }
)( React.memo(({ 
    modelObjectIds,
    sceneObjects,
    world,
    activeCamera,
    getAsset,
    storyboarderFilePath,
    selectObject,
    selections,
    updateCharacterSkeleton,
    updateCharacterIkSkeleton,
    updateObject,
    updateCharacterPoleTargets,
    models,
    characterIds,
    updateObjects,
    selectedBone,
    attachableIds

}) => {
    const { scene, camera, gl } = useThree()
    const rootRef = useRef()
    const groundRef = useRef()
    const ambientLightRef = useRef()
    const directionalLightRef = useRef()


    useEffect(() => {
      
        let sgIkHelper = SGIkHelper.getInstance(null, scene.children[0], camera, gl.domElement)
        const updateCharacterRotation = (name, rotation) => { updateCharacterSkeleton({
          id: sgIkHelper.characterObject.userData.id,
          name : name,
          rotation:
          {
            x : rotation.x,
            y : rotation.y,
            z : rotation.z,
          }
        } )}
  
        const updateSkeleton = (skeleton) => { updateCharacterIkSkeleton({
          id: sgIkHelper.characterObject.userData.id,
          skeleton: skeleton
        } )}
  
        const updateCharacterPos = ({ x, y, z}) => updateObject(
          sgIkHelper.characterObject.userData.id,
          { x, y: z, z: y }
        )
  
        const updatePoleTarget = (poleTargets) => updateCharacterPoleTargets({
            id: sgIkHelper.characterObject.userData.id,
            poleTargets: poleTargets
          }
        )
  
        sgIkHelper.setUpdate(
          updateCharacterRotation,
          updateSkeleton,
          updateCharacterPos,
          updatePoleTarget,
          updateObjects
        )
      }, [])

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
    <InteractionManager/>
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
        modelObjectIds.map(id => {
            let sceneObject = sceneObjects[id]
            let gltf = sceneObject.model != 'box'
                ? getAsset(ModelLoader.getFilepathForModel(sceneObject, {storyboarderFilePath}))
                : null
            return <ModelObject
                key={ id}
                gltf={ gltf }
                sceneObject={ sceneObject }
                isSelected={ selections.includes(sceneObject.id) }

                />
        })
    }
    {
        characterIds.map(id => {
            let sceneObject = sceneObjects[id]
            let gltf = getAsset(ModelLoader.getFilepathForModel(sceneObject, {storyboarderFilePath}))
            return <SimpleErrorBoundary  key={ id }>
              <Character
                gltf={ gltf }
                sceneObject={ sceneObject }
                modelSettings={ models[sceneObject.model] }
                isSelected={ selections.includes(id) } 
                selectedBone={ selectedBone }
                updateCharacterSkeleton={ updateCharacterSkeleton }
                updateCharacterIkSkeleton={ updateCharacterIkSkeleton }/>
              </SimpleErrorBoundary>
        })
    }
        {
        attachableIds.map(id => {
            let sceneObject = sceneObjects[id]
            let gltf = getAsset(ModelLoader.getFilepathForModel(sceneObject, {storyboarderFilePath}))
            let characterGltf = getAsset(ModelLoader.getFilepathForModel(sceneObjects[sceneObject.attachToId], {storyboarderFilePath}))
            return <SimpleErrorBoundary  key={ id }>
              <Attachable
                gltf={ gltf }
                sceneObject={ sceneObject }
                isSelected={ selections.includes(id) } 
                updateObject={ updateObject }
                characterModel={ characterGltf }/>
              </SimpleErrorBoundary>
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
