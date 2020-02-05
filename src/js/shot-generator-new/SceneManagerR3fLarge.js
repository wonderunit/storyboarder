import { connect } from 'react-redux'
import ModelObject from './components/Three/ModelObject'
import Environment from './components/Three/Environment'
import React, { useRef, useEffect, useMemo, useCallback } from 'react'
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
import Light from './components/Three/Light'
import Volume from './components/Three/Volume'
import Image from './components/Three/Image'
import InteractionManager from './components/Three/InteractionManager'
import SGIkHelper from '../shared/IK/SGIkHelper'
import SimpleErrorBoundary from './components/SimpleErrorBoundary'
import { getFilePathForImages } from "./helpers/get-filepath-for-images"
import { setShot } from './utils/cameraUtils'
import {useAsset} from "./hooks/use-assets-manager";
import KeyCommandsSingleton from './components/KeyHandler/KeyCommandsSingleton'
import { dropObject, dropCharacter } from '../utils/dropToObjects'
import SaveShot from './components/Three/SaveShot'
import { SHOT_LAYERS } from './utils/ShotLayers'

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
const getSceneObjectLightIds = createSelector(
  [getSceneObjects],
  sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'light').map(o => o.id)
)
const getSceneObjectVolumeIds = createSelector(
  [getSceneObjects],
  sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'volume').map(o => o.id)
)
const getSceneObjectImageIds = createSelector(
  [getSceneObjects],
  sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'image').map(o => o.id)
)
const SceneManagerR3fLarge = connect(
    state => ({
        modelObjectIds: getSceneObjectModelObjectIds(state),
        characterIds: getSceneObjectCharacterIds(state),
        attachableIds: getSceneObjectAttachableIds(state),
        lightIds: getSceneObjectLightIds(state),
        volumeIds: getSceneObjectVolumeIds(state),
        imageIds: getSceneObjectImageIds(state),
        sceneObjects: getSceneObjects(state),
        world: getWorld(state),
        activeCamera: getActiveCamera(state),
        storyboarderFilePath: state.meta.storyboarderFilePath,
        selections: getSelections(state),
        models: state.models,
        selectedBone: getSelectedBone(state),
        cameraShots: state.cameraShots
    }),
    {
        selectObject,
        updateCharacterSkeleton,
        updateCharacterIkSkeleton,
        updateObject,
        updateCharacterPoleTargets,
        updateObjects,

    }
)( React.memo(({ 
    modelObjectIds,
    sceneObjects,
    world,
    activeCamera,
    storyboarderFilePath,
    selections,
    updateCharacterSkeleton,
    updateCharacterIkSkeleton,
    updateObject,
    updateCharacterPoleTargets,
    models,
    characterIds,
    updateObjects,
    selectedBone,
    attachableIds,
    lightIds,
    volumeIds,
    imageIds,
    cameraShots,

}) => {
    const { scene, camera, gl } = useThree()
    const rootRef = useRef()
    const groundRef = useRef()
    const ambientLightRef = useRef()
    const directionalLightRef = useRef()
    const selectedCharacters = useRef()

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

    useEffect(() => {  
      selectedCharacters.current = selections.filter((id) => {
        return (sceneObjects[id] && sceneObjects[id].type === "character")
      })
    }, [selections])

    useEffect(() => {
      let selected = scene.children[0].children.find((obj) => selectedCharacters.current.indexOf(obj.userData.id) >= 0)
      console.log(selected)
      let characters = scene.children[0].children.filter((obj) => obj.userData.type === "character")
      console.log("camera shots changed", cameraShots)
      if (characters.length) {
        let keys = Object.keys(cameraShots)
        for(let i = 0; i < keys.length; i++ ) {
          let key = keys[i]
          console.log(key)
          console.log(scene.children[0].children)
          console.log(camera)
          setShot({
            camera,
            characters,
            selected,
            updateObject,
            shotSize: cameraShots[key].size,
            shotAngle: cameraShots[key].angle
          })
        }
      }
    }, [cameraShots, selectedCharacters.current]) 

    const sceneChildren = scene && scene.children[0] && scene.children[0].children.length

    const dropingPlaces = useMemo(() => {
      if(!scene || !scene.children[0]) return
      return scene.children[0].children.filter(o =>
        o.userData.type === "object" ||
        o.userData.type === "character" ||
        o.userData.type === "ground")
    }, [sceneChildren])

    const onCommandDrop = useCallback(() => {
      let changes = {}
      for( let i = 0; i < selections.length; i++ ) {
        let selection = scene.children[0].children.find( child => child.userData.id === selections[i] )
        if( selection.userData.type === "object" ) {
          dropObject( selection, dropingPlaces )
          let pos = selection.position
          changes[ selections[i] ] = { x: pos.x, y: pos.z, z: pos.y }
        } else if ( selection.userData.type === "character" ) {
          dropCharacter( selection, dropingPlaces )
          let pos = selection.position
          changes[ selections[i] ] = { x: pos.x, y: pos.z, z: pos.y }
        }
      }
      updateObjects(changes)
    }, [selections, sceneChildren])

    useEffect(() => {
      KeyCommandsSingleton.getInstance().addIPCKeyCommand({key: "shot-generator:object:drop", value:
      onCommandDrop})
      return () => {
        KeyCommandsSingleton.getInstance().removeIPCKeyCommand({key: "shot-generator:object:drop"})
      } 
    }, [onCommandDrop])

    const groundTexture = useTextureLoader(window.__dirname + '/data/shot-generator/grid_floor_1.png')
    useEffect(() => { 
        directionalLightRef.current.intensity = world.directional.intensity
        directionalLightRef.current.rotation.x = 0
        directionalLightRef.current.rotation.z = 0
        directionalLightRef.current.rotation.y = world.directional.rotation
        directionalLightRef.current.rotateX(world.directional.tilt+Math.PI/2)
        
    }, [world])

    useEffect(() => {
      let cameraObject = sceneObjects[activeCamera]
      camera.position.x = cameraObject.x
      camera.position.y = cameraObject.z
      camera.position.z = cameraObject.y
      camera.rotation.x = 0
      camera.rotation.z = 0
      camera.rotation.y = cameraObject.rotation
      camera.rotateX(cameraObject.tilt)
      camera.rotateZ(cameraObject.roll)
      camera.userData.type = cameraObject.type
      camera.userData.locked = cameraObject.locked
      camera.userData.id = cameraObject.id
      camera.fov = cameraObject.fov
      camera.aspect = cameraObject.aspectRatio
      camera.updateProjectionMatrix()
    }, [activeCamera])

    useEffect(() => {
        scene.background = new THREE.Color(world.backgroundColor)
    }, [world.background])

    return <group ref={ rootRef }> 
    <SaveShot isPlot={ false }/>
    <InteractionManager/>
    <ambientLight
        ref={ ambientLightRef }
        color={ 0xffffff }
        intensity={ world.ambient.intensity } 
        onUpdate={ self => (self.layers.enable(SHOT_LAYERS)) }/>

    <directionalLight
        ref={ directionalLightRef }
        color={ 0xffffff }
        intensity={ world.directional.intensity }
        position={ [0, 1.5, 0] }
        target-position={ [0, 0, 0.4] }
        onUpdate={ self => (self.layers.enable(SHOT_LAYERS)) }

    />
    {
        modelObjectIds.map(id => {
            let sceneObject = sceneObjects[id]
            return <ModelObject
                key={ id }
                path={ModelLoader.getFilepathForModel(sceneObject, {storyboarderFilePath}) }
                sceneObject={ sceneObject }
                isSelected={ selections.includes(sceneObject.id) }

                />
        })
    }
    {
        characterIds.map(id => {
            let sceneObject = sceneObjects[id]
            //let gltf = useAsset(ModelLoader.getFilepathForModel(sceneObject, {storyboarderFilePath}))
            return <SimpleErrorBoundary  key={ id }>
              <Character
                //gltf={ gltf }
                path={ModelLoader.getFilepathForModel(sceneObject, {storyboarderFilePath}) }
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
        lightIds.map(id => {
            let sceneObject = sceneObjects[id]
            return <SimpleErrorBoundary  key={ id }>
              <Light
                sceneObject={ sceneObject }
                isSelected={ selections.includes(id) } />
              </SimpleErrorBoundary>
        })
    }
    {
        attachableIds.map(id => {
            let sceneObject = sceneObjects[id]
            //let gltf = useAsset(ModelLoader.getFilepathForModel(sceneObject, {storyboarderFilePath}))
            //let characterGltf = useAsset(ModelLoader.getFilepathForModel(sceneObjects[sceneObject.attachToId], {storyboarderFilePath}))
            return <SimpleErrorBoundary  key={ id }>
              <Attachable
                //gltf={ gltf }
                path={ModelLoader.getFilepathForModel(sceneObject, {storyboarderFilePath}) }
                sceneObject={ sceneObject }
                isSelected={ selections.includes(id) } 
                updateObject={ updateObject }
                //characterModel={ characterGltf }
              />
              </SimpleErrorBoundary>
        })
    }
    {
        volumeIds.map(id => {
            let sceneObject = sceneObjects[id]
            let textures = []
            let imagesPaths = getFilePathForImages(sceneObject, storyboarderFilePath)
            for(let i = 0; i < imagesPaths.length; i++ ) {
              if(!imagesPaths[i]) continue
              let asset = useAsset(imagesPaths[i])
              if(!asset) continue
              textures.push(asset)
            }
            return <SimpleErrorBoundary  key={ id }>
              <Volume
                textures={ textures }
                sceneObject={ sceneObject }
                numberOfLayers= { sceneObject.numberOfLayers }/>
              </SimpleErrorBoundary>
        })
    }
    {
        imageIds.map(id => {
            let sceneObject = sceneObjects[id]
            return <SimpleErrorBoundary key={ id }>
              <Image
                imagesPaths={getFilePathForImages(sceneObject, storyboarderFilePath)}
                sceneObject={ sceneObject }
                isSelected={ selections.includes(id) }/>
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
        world.environment.file
          ? <Environment
              path={ModelLoader.getFilepathForModel({
                type: 'environment',
                model: world.environment.file
              }, { storyboarderFilePath } )}
              environment={world.environment}
              visible={world.environment.visible} />
          : null
    }

    
    </group>

    })
)
export default SceneManagerR3fLarge
