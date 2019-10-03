const { useEffect } = React
const { useSelector } = require('react-redux')
const { ipcRenderer, shell } = require('electron')
const path = require('path')
const fs = require('fs-extra')
const moment = require('moment')

const THREE = require('three')
window.THREE = window.THREE || THREE
require('../vendor/three/examples/js/exporters/GLTFExporter.js')
require('../vendor/three/examples/js/utils/SkeletonUtils')

const {
  getSceneObjects
} = require('../shared/reducers/shot-generator')

const notifications = require('../window/notifications')

const useExportToGltf = (sceneRef) => {
  const meta = useSelector(state => state.meta)
  const board = useSelector(state => state.board)
  const sceneObjects = useSelector(getSceneObjects)

  useEffect(() => {
    if (board && meta && meta.storyboarderFilePath) {
      ipcRenderer.on('shot-generator:export-gltf', () => {
        notifications.notify({
          message: 'Preparing to export GLTF…',
          timing: 5
        })

        console.log('Preparing GLTF…')
        let mementos = []
        let scene = new THREE.Scene()
        for (let child of sceneRef.current.children) {
          // console.log('\tScene contains:', child)
          // HACK test to avoid IconSprites, which fail to .clone
          if (!child.icon) {
            if (child.userData.id && sceneObjects[child.userData.id]) {
              let sceneObject = sceneObjects[child.userData.id]
              if (sceneObject.type === 'volume') {
                console.log('\tSkipping', sceneObject.type)

              } else if (sceneObject.type === 'character') {
                console.log('\tCloning', sceneObject.type)

                let skinnedMesh = child.getObjectByProperty('type', 'SkinnedMesh')

                mementos.push({
                  parent: skinnedMesh.parent,
                  bonesHelper: skinnedMesh.parent.bonesHelper,
                  userData: skinnedMesh.parent.userData,
                  name: skinnedMesh.parent.name,

                  mesh: skinnedMesh,
                  meshUserData: skinnedMesh.userData
                })

                skinnedMesh.parent.bonesHelper = null
                skinnedMesh.parent.name = sceneObject.name || sceneObject.displayName
                skinnedMesh.parent.userData = {}

                skinnedMesh.userData = {}

                console.log('\t\tAdded', skinnedMesh.parent)

                scene.add( skinnedMesh.parent )

              } else if (sceneObject) {
                console.log('\tCloning', sceneObject.type)
                let clone = child.clone()

                clone.userData = {}

                clone.material = new THREE.MeshStandardMaterial()
                clone.name = sceneObject.name || sceneObject.displayName

                scene.add(clone)
              }
            }
          }
        }

        console.log('\tExporting Scene:', scene)

        let exporter = new THREE.GLTFExporter()
        let options = {
          binary: true,
          embedImages: true
        }
        exporter.parse(scene, function (glb) {

          for (let memento of mementos) {
            memento.parent.bonesHelper = memento.bonesHelper
            memento.parent.userData = memento.userData
            memento.parent.name = memento.name

            memento.mesh.userData = memento.meshUserData

            sceneRef.current.add(memento.parent)
          }

          if (meta.storyboarderFilePath) {

            let timestamp = moment().format('YYYY-MM-DD hh.mm.ss')
            let filename = `${board.url.replace('.png', '')}-${timestamp}.glb`
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
      })
    }

    return function cleanup() {
      console.log('cleanup shot-generator:export-gltf')
      ipcRenderer.removeAllListeners('shot-generator:export-gltf')
    }
  }, [board, meta, sceneObjects])
}

module.exports = useExportToGltf
