const { useMemo, useEffect, useRef, useState } = (React = require('react'))
const SGVirtualCamera = require('../components/SGVirtualCamera')
const html2canvas = require('html2canvas')

import * as SDFText from './sdftext'
const textCreator = SDFText.creator()

const cameraSettings = {
  id: 'gui-camera',
  x: 0,
  y: -0.25,
  z: 0.5,
  fov: 22,
  rotation: 0,
  tilt: 0,
  roll: 0
}

const contrWidth = 0.07

const GUI = ({ aspectRatio }) => {
  const fovLabel = useMemo(() => {
    return textCreator.create('22mm')
  }, [])

  const otherLabel = useMemo(() => {
    return textCreator.create('Object 1')
  }, [])

  const [propertiesTexture, setPropertiesTexture] = useState(null)
  const [toolsTexture, setToolsTexture] = useState(null)
  const [undoTexture, setUndoTexture] = useState(null)
  const generateTexture = element => {
    html2canvas(document.getElementById(element), { logging: false, backgroundColor: null }).then(canvas => {
      switch (element) {
        case 'properties_ui':
          setPropertiesTexture(canvas)
        case 'tools_ui':
          setToolsTexture(canvas)
        case 'undo_ui':
          setUndoTexture(canvas)
      }
    })
  }

  useEffect(() => {
    generateTexture('properties_ui')
    generateTexture('tools_ui')
    generateTexture('undo_ui')
  }, [])

  return (
    <group rotation={[(Math.PI / 180) * -45, 0, 0]}>
      <primitive object={fovLabel} position={[0.5, 0.5, -0.2]} scale={[2, 2, 2]} />
      <primitive object={otherLabel} position={[-0.75, 0.5, -0.2]} scale={[2, 2, 2]} />

      <mesh
        name="properties_ui"
        position={new THREE.Vector3(-contrWidth * 1.25 - contrWidth - (contrWidth / 4) * 2, contrWidth * 0.5, 0)}
        geometry={new THREE.PlaneGeometry(contrWidth * 1.5, contrWidth * 2)}
        material={
          new THREE.MeshBasicMaterial({
            map: propertiesTexture ? new THREE.CanvasTexture(propertiesTexture) : null,
            transparent: true,
            side: THREE.DoubleSide
          })
        }
      />

      <mesh
        name="tools_ui"
        position={new THREE.Vector3(-contrWidth - contrWidth / 4, 0, 0)}
        geometry={new THREE.PlaneGeometry(contrWidth, contrWidth)}
        material={
          new THREE.MeshBasicMaterial({
            map: toolsTexture ? new THREE.CanvasTexture(toolsTexture) : null,
            transparent: true,
            side: THREE.DoubleSide
          })
        }
      />

      <mesh
        name="undo_ui"
        position={new THREE.Vector3(contrWidth * 1.25 + contrWidth / 4, 0, 0)}
        geometry={new THREE.PlaneGeometry(contrWidth * 1.5, contrWidth * 0.5)}
        material={
          new THREE.MeshBasicMaterial({
            map: undoTexture ? new THREE.CanvasTexture(undoTexture) : null,
            transparent: true,
            side: THREE.DoubleSide
          })
        }
      />

      <SGVirtualCamera {...{ aspectRatio, ...cameraSettings }} />
    </group>
  )
}

module.exports = GUI
