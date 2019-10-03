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

                for (node of child.children) {
                  if (node.isSkinnedMesh) {

                    let oldBonesHelper = node.parent.bonesHelper
                    let oldikRig = node.parent.userData.ikRig
                    node.parent.bonesHelper = null
                    node.parent.userData.ikRig = null

                    let clone = THREE.SkeletonUtils.clone( node.parent )

                    let bone = clone.children[0]
                    let mesh = clone.children[1]

                    mesh.name = sceneObject.name || sceneObject.displayName
                    mesh.userData = {}

                    scene.add( bone )
                    scene.add( mesh )

                    console.log('\n\n\n\n')
                    console.log('-------------')
                    console.log('mesh', mesh)
                    console.log('bone', bone)
                    console.log('original .skeleton.boneMatrices', node.skeleton.boneMatrices)
                    console.log('cloned   .skeleton.boneMatrices', mesh.skeleton.boneMatrices)
                    console.log('\n\n\n\n')

                    node.parent.bonesHelper = oldBonesHelper
                    node.parent.userData.ikRig = oldikRig
                  } else {
                    console.log('\t\tSkipping node', node)
                  }
                }

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
