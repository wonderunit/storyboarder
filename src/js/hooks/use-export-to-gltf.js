import React, { useEffect, useCallback } from 'react' 
import { useSelector } from 'react-redux'
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

const materialFactory = () => new THREE.MeshBasicMaterial({
  color: 0x8c78f1,
  flatShading: false
})

const meshFactory = originalMesh => {
  let mesh = originalMesh.clone()
  mesh.geometry.computeBoundingBox()
  
  // create a skeleton if one is not provided
  if (mesh instanceof THREE.SkinnedMesh && !mesh.skeleton) {
    mesh.skeleton = new THREE.Skeleton()
  }
  
  let material = materialFactory()
  
  if (mesh.material.map) {
    material.map = mesh.material.map
    material.map.needsUpdate = true
  }
  mesh.material = material
  
  return mesh
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
      message: 'Preparing to export GLTF…',
      timing: 5
    })
    let scene = new THREE.Scene()
    for (let child of sceneRef.children[0].children) {
          // HACK test to avoid IconSprites, which fail to .clone
          if (!child.icon) {
            if (child.userData.id && sceneObjects[child.userData.id]) {
              let sceneObject = sceneObjects[child.userData.id]
              if (sceneObject.type === 'volume') {

              } else if (sceneObject.type === 'character') {

                let skinnedMesh = child.getObjectByProperty('type', 'SkinnedMesh')

                let simpleMesh = new THREE.Mesh(skinnedMesh.geometry, new THREE.MeshStandardMaterial())
                simpleMesh.scale.copy(skinnedMesh.worldScale())
                simpleMesh.quaternion.copy(skinnedMesh.worldQuaternion())
                simpleMesh.position.copy(skinnedMesh.worldPosition())
                scene.add( simpleMesh)
                
              } else if (sceneObject.type === "camera") { 
                let camera = virtualCameraObject.clone()
                camera.position.copy(child.worldPosition())
                camera.quaternion.copy(child.worldQuaternion())
                camera.scale.copy(child.worldScale())
                scene.add(camera)
              } else if (sceneObject) {
                let clone = child.clone()
                
                clone.userData = {}
                
                clone.material = new THREE.MeshStandardMaterial()
                clone.name = sceneObject.name || sceneObject.displayName
                
                scene.add(clone)
              }
            } else if (child.userData.type === 'ground' || (child.geometry && child.geometry instanceof THREE.ExtrudeGeometry)) {
              let clone = child.clone()
              
              clone.userData = {}
              scene.add(clone)
            } 
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
    }, options)
  }, [sceneRef])

  useEffect(() => {
    ipcRenderer.on('shot-generator:export-gltf', exportGLTF)
    return function cleanup() {
      ipcRenderer.removeAllListeners('shot-generator:export-gltf')
    }
  }, [exportGLTF])

  return null
}

export {useExportToGltf, loadCameraModel}
