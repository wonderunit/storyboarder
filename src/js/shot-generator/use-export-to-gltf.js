const { useEffect } = React
const { useSelector } = require('react-redux')
const { ipcRenderer, shell } = require('electron')
const path = require('path')
const fs = require('fs-extra')
const moment = require('moment')

const THREE = require('three')
window.THREE = window.THREE || THREE
require('../vendor/three/examples/js/exporters/GLTFExporter.js')

const cloneGltf = require('../xr/src/helpers/clone-gltf')

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
              // TODO skip volumetric?
              if (sceneObject.type === 'character') {
                console.log('\Cloning', sceneObject.type)

                let memento = {
                  bonesHelper: child.bonesHelper,
                  ikRig: child.userData.ikRig
                }
                child.bonesHelper = null
                child.userData.ikRig = null

                // workaround for skinned mesh clone w/ skeleton
                // (cloneGltf knows how to add bones back to skinned mesh skeleton)
                let cloned = cloneGltf({ scene: child })
                for (child of cloned.scene.children) {
                  scene.add(child)
                }

                child.bonesHelper = memento.bonesHelper
                child.userData.ikRig = memento.ikRig

              } else if (sceneObject) {
                console.log('\Cloning', sceneObject.type)
                scene.add(child.clone())
              }
              console.log('\t\tOK')
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
