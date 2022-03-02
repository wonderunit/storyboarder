import React, { useMemo } from 'react'
import {connect} from "react-redux"

import {getWorld} from "../../../../shared/reducers/shot-generator"

const Ground = React.memo(({ visible, getAsset }) => {
  const texture = getAsset('/data/system/grid_floor_1.png')

  useMemo(() => {
    if (!texture) {
      return false
    }

    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.offset.set(0, 0)
    texture.repeat.set(100, 100)
  }, [texture])

  if (!texture) {
    return null
  }

  return <mesh
    // slightly offset to allow for outlines
    position={ [0, -0.03, 0] }
    rotation={ [-Math.PI / 2, 0, 0] }
  >
    <planeBufferGeometry attach="geometry" args={ [100, 100] } />
    <meshToonMaterial attach="material" visible={ visible }>
      <primitive attach="map" object={ texture } />
    </meshToonMaterial>
  </mesh>
})

const mapStateToProps = (state) => ({
  visible: getWorld(state).ground
})

export default connect(mapStateToProps)(Ground)
