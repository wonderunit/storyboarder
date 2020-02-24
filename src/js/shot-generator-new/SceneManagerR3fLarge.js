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
    getSelections,
    getSelectedBone,
    getSelectedAttachable,
    selectObject,
    updateCharacterSkeleton,
    updateCharacterIkSkeleton,
    updateObject,
    updateObjects,
    updateCharacterPoleTargets,
    deleteObjects

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
import KeyCommandsSingleton from './components/KeyHandler/KeyCommandsSingleton'
import { dropObject, dropCharacter } from '../utils/dropToObjects'
import SaveShot from './components/Three/SaveShot'
import { SHOT_LAYERS } from './utils/ShotLayers'
import Room from './components/Three/Room'
import Group from './components/Three/Group'
import CameraUpdate from './CameraUpdate'
import deepEqualSelector from "../utils/deepEqualSelector"

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

const getSceneObjectGroupIds = createSelector(
  [getSceneObjects],
  sceneObjects => Object.values(sceneObjects).filter(o => o.type === 'group').map(o => o.id)
)
const sceneObjectSelector = (state) => {
  const sceneObjects = getSceneObjects(state)

  let newSceneObjects = {}
  let keys = Object.keys(sceneObjects)
  for(let i = 0; i < keys.length; i++) {
    let key = keys[i]
    if(sceneObjects[key].type !== "camera")
      newSceneObjects[key] = sceneObjects[key]
  }
  return newSceneObjects
}

const getSceneObjectsM = deepEqualSelector([sceneObjectSelector], (sceneObjects) => sceneObjects)

const SceneManagerR3fLarge = connect(
    state => ({
        modelObjectIds: getSceneObjectModelObjectIds(state),
        characterIds: getSceneObjectCharacterIds(state),
        attachableIds: getSceneObjectAttachableIds(state),
        lightIds: getSceneObjectLightIds(state),
        volumeIds: getSceneObjectVolumeIds(state),
        groupIds: getSceneObjectGroupIds(state),
        imageIds: getSceneObjectImageIds(state),
        sceneObjects: getSceneObjectsM(state),
        world: getWorld(state),
        storyboarderFilePath: state.meta.storyboarderFilePath,
        selections: getSelections(state),
        models: state.models,
        selectedBone: getSelectedBone(state),
        cameraShots: state.cameraShots,
        selectedAttachable: getSelectedAttachable(state)
    }),
    {
        selectObject,
        updateCharacterSkeleton,
        updateCharacterIkSkeleton,
        updateObject,
        updateCharacterPoleTargets,
        updateObjects,
        deleteObjects,
        withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
    }
)( React.memo(({ 
    modelObjectIds,
    sceneObjects,
    world,
    storyboarderFilePath,
    selections,
    updateCharacterSkeleton,
    updateCharacterIkSkeleton,
    updateObject,
    updateCharacterPoleTargets,
    models,
    updateObjects,
    selectedBone,
    
    characterIds,
    attachableIds,
    lightIds,
    volumeIds,
    imageIds,
    groupIds,

    cameraShots,
    setLargeCanvasData,
    renderData,
    selectedAttachable,
    deleteObjects,
    withState
}) => {
    const { scene, camera, gl } = useThree()
    const rootRef = useRef()
    const groundRef = useRef()
    const ambientLightRef = useRef()
    const directionalLightRef = useRef()
    const selectedCharacters = useRef()
    useEffect(() => {
        let sgIkHelper = SGIkHelper.getInstance()
        sgIkHelper.setUp(null, rootRef.current, camera, gl.domElement)
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
      if(!selectedCharacters.current) return
      let selected = scene.children[0].children.find((obj) => selectedCharacters.current.indexOf(obj.userData.id) >= 0)
      let characters = scene.children[0].children.filter((obj) => obj.userData.type === "character")
      if (characters.length) {
        let keys = Object.keys(cameraShots)
        for(let i = 0; i < keys.length; i++ ) {
          let key = keys[i]
          if((!cameraShots[key].size && !cameraShots[key].angle) || camera.userData.id !== cameraShots[key].cameraId ) continue
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
    }, [cameraShots]) 

    const sceneChildren = scene && scene.children[0] && scene.children[0].children.length

    const getDropingPlaces = useCallback(() => {
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
        let droppingPlaces = getDropingPlaces()
        if( selection.userData.type === "object" ) {
          dropObject( selection,  droppingPlaces)
          let pos = selection.position
          changes[ selections[i] ] = { x: pos.x, y: pos.z, z: pos.y }
        } else if ( selection.userData.type === "character" ) {
          dropCharacter( selection, droppingPlaces )
          let pos = selection.position
          changes[ selections[i] ] = { x: pos.x, y: pos.z, z: pos.y }
        }
      }
      updateObjects(changes)
    }, [getDropingPlaces, selections])

    useEffect(() => {
      KeyCommandsSingleton.getInstance().addIPCKeyCommand({key: "shot-generator:object:drop", value:
      onCommandDrop})
      return () => {
        KeyCommandsSingleton.getInstance().removeIPCKeyCommand({key: "shot-generator:object:drop"})
      } 
    }, [onCommandDrop])

    useEffect(() => { 
      setLargeCanvasData(camera, scene, gl)
    }, [scene, camera, gl, renderData])

    const groundTexture = useTextureLoader(window.__dirname + '/data/shot-generator/grid_floor_1.png')
    const roomTexture = useTextureLoader(window.__dirname + '/data/shot-generator/grid_wall2.png')
    useEffect(() => { 
        directionalLightRef.current.intensity = world.directional.intensity
        directionalLightRef.current.rotation.x = 0
        directionalLightRef.current.rotation.z = 0
        directionalLightRef.current.rotation.y = world.directional.rotation
        directionalLightRef.current.rotateX(world.directional.tilt+Math.PI/2)
    }, [world])

    useEffect(() => {
      scene.background = new THREE.Color(world.backgroundColor)
    }, [world.backgroundColor])

    useEffect(() => {
      if(!directionalLightRef.current) return
      directionalLightRef.current.rotation.x = 0
      directionalLightRef.current.rotation.z = 0
      directionalLightRef.current.rotation.y = world.directional.rotation
      directionalLightRef.current.rotateX(world.directional.tilt+Math.PI/2)
    }, [world.directional.rotation, world.directional.tilt])

    return <group ref={ rootRef }> 
    <CameraUpdate/>
    <SaveShot isPlot={ false }/>
    <InteractionManager renderData={ renderData }/>
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
    > 
      <primitive object={directionalLightRef.current ? directionalLightRef.current.target : new THREE.Object3D()}/>
    </directionalLight>
    {
        modelObjectIds.map(id => {
            let sceneObject = sceneObjects[id]
            return <ModelObject
                key={ id }
                path={ModelLoader.getFilepathForModel(sceneObject, {storyboarderFilePath}) }
                sceneObject={ sceneObject }
                isSelected={ selections.includes(sceneObject.id) }
                updateObject={ updateObject }
                />
        })
    }
    {
        characterIds.map(id => {
            let sceneObject = sceneObjects[id]
            return <SimpleErrorBoundary  key={ id }>
              <Character
                path={ModelLoader.getFilepathForModel(sceneObject, {storyboarderFilePath}) }
                sceneObject={ sceneObject }
                modelSettings={ models[sceneObject.model] }
                isSelected={ selections.includes(id) } 
                selectedBone={ selectedBone }
                updateCharacterSkeleton={ updateCharacterSkeleton }
                updateCharacterIkSkeleton={ updateCharacterIkSkeleton }
                renderData={renderData}
                />
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
            let character = scene.__interaction.filter(o => o.userData.id === sceneObject.attachToId)[0]
            return <SimpleErrorBoundary  key={ id }>
              <Attachable
                path={ModelLoader.getFilepathForModel(sceneObject, {storyboarderFilePath}) }
                sceneObject={ sceneObject }
                isSelected={ selectedAttachable === sceneObject.id } 
                updateObject={ updateObject }
                сharacterModelPath={ ModelLoader.getFilepathForModel(sceneObjects[sceneObject.attachToId], {storyboarderFilePath}) }
                characterChildrenLength={ character ? character.children.length : 0 }
                deleteObjects={ deleteObjects }
                character={ sceneObjects[sceneObject.attachToId] }
              />
              </SimpleErrorBoundary>
        })
    }
    {
        volumeIds.map(id => {
            let sceneObject = sceneObjects[id]
            return <SimpleErrorBoundary  key={ id }>
              <Volume
                imagesPaths={ getFilePathForImages(sceneObject, storyboarderFilePath) }
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
       groupIds.map(id => {
          let sceneObject = sceneObjects[id]
          return <Group
            key={ sceneObject.id }
            scene={ scene }
            isSelected={ selections.includes(sceneObject.id) }
            updateObject={ updateObject }
            { ...sceneObject }
          />
       })
        
    }
    { 
        groundTexture && <Ground
            objRef={ groundRef }
            texture={ groundTexture }
            visible={ !world.room.visible && world.ground } />
    }   
    {
        world.environment.file &&  <Environment
              path={ModelLoader.getFilepathForModel({
                type: 'environment',
                model: world.environment.file
              }, { storyboarderFilePath } )}
              environment={world.environment}
              visible={world.environment.visible} />
    }
    {
        roomTexture && <Room
              texture={ roomTexture }
              width={world.room.width}
              length={world.room.length}
              height={world.room.height}
              visible={world.room.visible} />
    }
    </group>

    })
)
export default SceneManagerR3fLarge
