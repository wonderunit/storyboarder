import React, { useEffect, useCallback } from 'react' 
import { ipcRenderer, shell } from 'electron'
import path from 'path'
import fs from 'fs-extra'
import moment from 'moment'

import * as THREE from 'three'
window.THREE = window.THREE || THREE
import '../vendor/three/examples/js/exporters/GLTFExporter.js'
import '../vendor/three/examples/js/utils/SkeletonUtils'
import {gltfLoader} from '../shot-generator/utils/gltfLoader'
import {
  getSceneObjects
} from '../shared/reducers/shot-generator'
import notifications from '../window/notifications'
import ModelLoader from '../services/model-loader'
import SkeletonUtils from "../shared/IK/utils/SkeletonUtils";

const materialFactory = () => new THREE.MeshBasicMaterial({
  flatShading: false
})

const meshFactory = originalObject => {
  let object = originalObject.clone()
  // A hack to copy array of material manually, cause clone keeps same material array
  if(Array.isArray(object.material)) {
    object.material = []
    for(let i = 0; i < originalObject.material.length; i++) {
      object.material.push(originalObject.material[i].clone())
    }
  }
  const setMesh = (mesh) => {
    if(!mesh.material) return
    // create a skeleton if one is not provided
    if (mesh instanceof THREE.SkinnedMesh && !mesh.skeleton) {
      mesh.skeleton = new THREE.Skeleton()
    }

    const initMaterial = (material) => {
      let newMaterial = materialFactory()
      if (material && material.map) {
        newMaterial.map = material.map
        newMaterial.map.needsUpdate = true
      }
      return newMaterial
    }
    
    if(Array.isArray(mesh.material)) {
      for(let i = 0, length = mesh.material.length; i < length; i++) {
        mesh.material.unshift(initMaterial(mesh.material.pop()))
      }
    } else {
      mesh.material = initMaterial(mesh.material)
    }

  }
  if(object.children.length) {
    object.traverse((child) => {
      setMesh(child);
    })
  }

  setMesh(object);

  return object
}



let virtualCameraObject = null
const loadModels = (models) => {
  return Promise.all(
      models.map((modelPath) => {
        return new Promise((resolve, reject) => {
          gltfLoader.load(
              modelPath,
              modelData => resolve(modelData.scene),
              null,
              reject
          )
        })
      })
  )
}

const loadCameraModel = (storyboarderFilePath) => {
  let expectedCameraFilepath = ModelLoader.getFilepathForModel({
    model: 'virtual-camera',
    type: 'xr'
  }, { storyboarderFilePath })
  loadModels([expectedCameraFilepath ]).then(([virtualCamera]) => {
    virtualCameraObject = new THREE.Object3D()
    virtualCamera.traverse( function ( child ) {
      if ( child instanceof THREE.Mesh ) {
        let mesh = meshFactory(child)
        virtualCameraObject.add(mesh)
      }
    })
  })
}

const useExportToGltf = (sceneRef, withState) => {

  const exportGLTF = useCallback(() => {
    let meta 
    let board 
    let sceneObjects  
    withState((dispatch, state) => {
      meta = state.meta
      board = state.board
      sceneObjects = getSceneObjects(state)
    })
    notifications.notify({
      message: 'Preparing to export glTF…',
      timing: 5
    })
    try {
      let scene = new THREE.Scene()
      let attachables = sceneRef.__interaction.filter(object => object.userData.type === "attachable")
      let children = sceneRef.children[0].children.concat(attachables)
      for (let child of children) {
        if (child && child.visible) {
          if (child.userData.id && sceneObjects[child.userData.id]) {
            let sceneObject = sceneObjects[child.userData.id]
            if (child.userData.type === "character") {
              let clonedCharacter = SkeletonUtils.clone(child, true);
              let lod = clonedCharacter.getObjectByProperty("type", "LOD");
              lod.children.forEach(skinnedMesh => {
                skinnedMesh.material = new THREE.MeshBasicMaterial().copy( skinnedMesh.material )
                skinnedMesh.material.needsUpdate = true;
                skinnedMesh.morphTargetInfluences = [0, 0, 0];
              })
              clonedCharacter.name = sceneObject.name || sceneObject.displayName
              scene.add( clonedCharacter)
              
            } else if(child.userData.type === "light") {
              let spotlight = child.getObjectByProperty('type', "SpotLight")
              let clone = child.clone()
              let spotlightClone = clone.getObjectByProperty('type', "SpotLight")
              spotlightClone.decay = 2
              spotlightClone.target = spotlightClone.children[0]
              spotlightClone.shadow = spotlight.shadow

              clone.name = sceneObject.name || sceneObject.displayName

              scene.add(clone)

            } else if (child.userData.type !== "volume") {
              let clone = meshFactory(child)
              clone.applyMatrix4(child.parent.matrixWorld)
              clone.updateMatrixWorld(true)
              clone.userData = {}
              
              clone.name = sceneObject.name || sceneObject.displayName
              
              scene.add(clone)
            }
          } else if (child.userData.type === "ground" || child.userData.type === 'environment' || (child.geometry && child.geometry instanceof THREE.ExtrudeGeometry)) {
            let clone = meshFactory(child)
            clone.userData = {}
            clone.name = child.userData.type.charAt(0).toUpperCase() + child.userData.type.slice(1)
            scene.add(clone)
          } 
        }
      }
      let objectsArray = Object.keys(sceneObjects);
      for( let i = 0; i < objectsArray.length; i++ ) {
        let sceneObject = sceneObjects[objectsArray[i]]
        if(sceneObject.type === "camera") {
            let camera = virtualCameraObject.clone()
            camera.position.set(sceneObject.x, sceneObject.z, sceneObject.y)
            camera.rotation.set(sceneObject.tilt, sceneObject.rotation, sceneObject.roll)
            camera.name = sceneObject.name || sceneObject.displayName
            scene.add(camera)
        }
      }
      let exporter = new THREE.GLTFExporter()
      let options = {
            binary: true,
            embedImages: true,
      }
      exporter.parse(scene, function (glb) {

        if (meta.storyboarderFilePath) {
          let timestamp = moment().format('YYYY-MM-DD hh.mm.ss')
          let filename = `${board.shot}-${timestamp}.glb`
          let filepath = path.join(
            path.dirname(meta.storyboarderFilePath),
            'exports',
            filename
            )
            
          fs.ensureDirSync(path.dirname(filepath))
          fs.writeFileSync(filepath, Buffer.from(glb))
          notifications.notify({
            message: `Exported to:\n${filename}`,
            timing: 5
          })
          shell.showItemInFolder(filepath)
        }
        disposeScene(scene);
      }, options)
    } catch (err) {
      console.error(err)
      notifications.notify({
        message:
          'glTF export failed:' + '\n\n' +
          err +
          '\n\n' +
          `Error details have been written to the log file.`
      })
    }

  }, [sceneRef])

  const disposeScene = (scene) => {
    scene.traverse((object) => {
      if(object.material ) {
        if(Array.isArray(object.material)) {
          for(let material of object.material) {
            disposeMaterial(material)
          }
        } else {
          disposeMaterial(object.material)
        }

      }
      if(object.geometry) {
        object.geometry.dispose()
      }
    })
    scene.dispose()
  } 

  const disposeMaterial = (material) => {
    material.dispose()
    if(material.map && material.map.dispose) {
      material.map.dispose()
    }
  }

  useEffect(() => {
    ipcRenderer.on('shot-generator:export-gltf', exportGLTF)
    return function cleanup() {
      ipcRenderer.removeAllListeners('shot-generator:export-gltf')
    }
  }, [exportGLTF])

  return null
}

export {useExportToGltf, loadCameraModel}
