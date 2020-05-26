import React, {useState, useMemo} from 'react'

import getFilepathForModelByType from './../../../xr/src/helpers/get-filepath-for-model-by-type'
import getFilepathForImage from './../../../xr/src/helpers/get-filepath-for-image'
import {useAssets} from "../../../shot-generator/hooks/use-assets-manager";

const getSceneObjectsHash = (sceneObjects) => {
  return Object.values(sceneObjects).reduce((acc, value) => acc + value.id, '')
}

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
  }, [getSceneObjectsHash(sceneObjects), world.environment.file])
  
  const loadStatus = useAssets(resources)
  
  return {
    ...loadStatus,
    count: resources.length
  }
}

export default useSceneLoader
