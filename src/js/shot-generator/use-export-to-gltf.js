const { useEffect } = React
const { useSelector } = require('react-redux')
const { ipcRenderer, shell } = require('electron')
const path = require('path')
const fs = require('fs-extra')
const moment = require('moment')

const THREE = require('three')
window.THREE = window.THREE || THREE
require('../vendor/three/examples/js/exporters/GLTFExporter.js')

const notifications = require('../window/notifications')

const useExportToGltf = (sceneRef) => {
  const meta = useSelector(state => state.meta)
  const board = useSelector(state => state.board)

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
          console.log('\tScene contains:', child)
          // HACK test to avoid IconSprites, which fail to .clone
          if (!child.icon) {
            // for now, just add the Groups
            if (child.type === 'Group') {
              console.log('\tAdding to GLTF:', child)
              scene.add(child.clone())
            }
          }
        }

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
            fs.writeFileSync(filepath, glb)

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
  }, [board, meta])
}

module.exports = useExportToGltf
