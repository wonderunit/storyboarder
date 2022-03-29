import {useEffect, useMemo} from 'react'

import getFilepathForModelByType from './../../../xr/src/helpers/get-filepath-for-model-by-type'
import getFilepathForImage from './../../../xr/src/helpers/get-filepath-for-image'
import getFilepathForEnv from '../../../xr/src/helpers/get-filepath-for-env'

import {useAssetsManager} from '../../../xr/src/hooks/use-assets-manager'

import * as BonesHelper from "../../../xr/src/three/BonesHelper"
import { Connection } from '../helpers/store'

const useSceneLoader = (sceneObjects, world, additionalAssets = []) => {
  const {loaded, total, assets, requestAsset, getAsset} = useAssetsManager(Connection.current)

  const resources = useMemo(() => {
    let resourcesToLoad = []
    
    if (world.environment.file) {
      resourcesToLoad.push(getFilepathForModelByType({
        type: 'environment',
        model: world.environment.file
      }))
    }

    if (world.environmentMap.background.length) {
      world.environmentMap.background.map(file => {
        requestAsset(getFilepathForEnv({file}))
      }) 
    }

    let models = Object.values(sceneObjects)
    .filter(o => o.model != null)
    .filter(o => !(o.type === 'object' && o.model === 'box'))
    .map(getFilepathForModelByType)
    .map(requestAsset)

    let images = Object.values(sceneObjects)
    .filter(o => o.type === 'image')
    .map(getFilepathForImage)
    .map(requestAsset)

    additionalAssets.map(requestAsset)

    return resourcesToLoad.concat(models, images, additionalAssets)
  }, [sceneObjects, world.environment.file, requestAsset, world.environmentMap.background])
  
  const boneGLTF = getAsset('/data/system/dummies/bone.glb')
  useEffect(() => {
    if (boneGLTF) {
      console.log('BONE: ', boneGLTF)
      const mesh = boneGLTF.scene.children.find(child => child.isMesh)
      BonesHelper.getInstance(mesh)
    }
  }, [boneGLTF ? boneGLTF.scene : null])
  
  return {
    assets,
    loaded,
    count: total,
    getAsset
  }
}

export default useSceneLoader
