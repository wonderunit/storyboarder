import React, {useCallback, useContext, useMemo} from 'react'
import {connect} from "react-redux"

import {getSceneObjects, getWorld} from "../../../../shared/reducers/shot-generator"
import {SceneState} from "../../helpers/sceneState"


import Environment from "../Three/Environment"
import EnvironmentViewer from "../Three/EnvironmentViewer"
import Model from "../Three/Model"
import Image from "../Three/Image"
import Light from "../Three/Light"
import VirtualCamera from "../Three/VirtualCamera"
import Character from "../Three/Character"
import Background from "../Three/Background"
import Ground from "../Three/Ground"
import Teleport from '../Three/Teleport'


import getFilepathForEnv from '../../../../xr/src/helpers/get-filepath-for-env'
import { useSelectedAssets } from '../../../../xr/src/hooks/use-assets-manager'

import WorldCamera from '../Three/WorldCamera'
import CameraCreator from '../Three/CameraCreator'
import { useFrame } from 'react-three-fiber'

import RemoteProvider from '../RemoteProvider'
import RemoteClients from '../RemoteClients'

import XRClient from '../Three/XRClient'
import TWEEN from "@tweenjs/tween.js"

import path from 'path'

const componentMap = {
  object: Model,
  image: Image,
  light: Light,
  camera: VirtualCamera,
  character: Character
}

const renderObject = (sceneObject, getAsset) => {
  const Component = componentMap[sceneObject.type]
  if (Component) {
     return <Component id={sceneObject.id} key={sceneObject.id} getAsset={getAsset}/>
  }
  
  return null
}

const Scene = ({sceneObjects, world, getAsset, ready}) => {
  const [currentSceneState] = useContext(SceneState)

  const helmet = useMemo(() => ready ? getAsset('/data/system/xr/hmd.glb') : null,[ready])
  const controller = useMemo(() => ready ? getAsset('/data/system/xr/controller.glb') : null,[ready])

  const backgroundMaps = useMemo(() => (world.environmentMap.background.length ? 
    world.environmentMap.background.map(file => getFilepathForEnv({file})) 
    : null 
  ),[world.environmentMap.background])

  const textureSettings = useCallback((texture, texturePath)=>{
    if (texture.name === '') texture.name = path.basename(texturePath, path.extname(texturePath))
  },[])

  const environmentMaps = useSelectedAssets( getAsset, backgroundMaps, textureSettings )

  useFrame(()=>{
    TWEEN.update()
  })

  return (
    <group>
      <WorldCamera/>
      <group
        scale={[currentSceneState.scale, currentSceneState.scale, currentSceneState.scale]}
      >
        <Teleport/>
        <CameraCreator/>
        <Background backgroundColor = {world.backgroundColor}/>
        <Ground getAsset={getAsset}/>
        <ambientLight
          color={ 0xffffff }
          intensity={ world.ambient.intensity }
        />
        <directionalLight
          color={ 0xffffff }
          intensity={ world.directional.intensity }
          position={ [0, 1.5, 0] }
          target-position={ [0, 0, 0.4] }
        />
        <Environment getAsset={getAsset}/>
        {
          world.environmentMap.background.length && <EnvironmentViewer  
          assets = { environmentMaps }
          visible = { world.environmentMap.visible }
          rotation = { world.environmentMap.rotation } 
          type = {world.environmentMap.mapType}/>
        }
        <RemoteProvider>
          <RemoteClients
            clientProps={{
              helmet: helmet,
              controller: controller
            }}
            Component={XRClient}
          />
        </RemoteProvider>
        {Object.values(sceneObjects).map(target => renderObject(target, getAsset))}
      </group>
    </group>
  )
}

const mapStateToProps = (state) => ({
  sceneObjects: getSceneObjects(state),
  world: getWorld(state)
})

export default connect(mapStateToProps)(Scene)
