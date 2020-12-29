import React, {useEffect, useMemo} from 'react'

import getFilepathForModelByType from './../../../xr/src/helpers/get-filepath-for-model-by-type'
import getFilepathForImage from './../../../xr/src/helpers/get-filepath-for-image'
import {useAsset, useAssets} from "../../../shot-generator/hooks/use-assets-manager"

import * as BonesHelper from "../../../xr/src/three/BonesHelper"

const useSceneLoader = (sceneObjects, world, additionalAssets = []) => {
  const resources = useMemo(() => {
    let resourcesToLoad = []
    
    if (world.environment.file) {
      resourcesToLoad.push(getFilepathForModelByType({
        type: 'environment',
        model: world.environment.file
      }))
    }

    let models = Object.values(sceneObjects)
    .filter(o => o.model != null)
    .filter(o => !(o.type === 'object' && o.model === 'box'))
    .map(getFilepathForModelByType)

    let images = Object.values(sceneObjects)
    .filter(o => o.type === 'image')
    .map(getFilepathForImage)

    return resourcesToLoad.concat(models, images, additionalAssets)
  }, [sceneObjects, world.environment.file])
  
  const loadStatus = useAssets(resources)
  const isLoaded = loadStatus.assets.length / resources.length

  const {asset: boneGLTF} = useAsset('/data/system/dummies/bone.glb')

  useEffect(() => {
    if (isLoaded && boneGLTF) {
      const mesh = boneGLTF.scene.children.find(child => child.isMesh)
      BonesHelper.getInstance(mesh)
    }
  }, [isLoaded, boneGLTF])
  
  return {
    ...loadStatus,
    count: resources.length
  }
}

export default useSceneLoader
