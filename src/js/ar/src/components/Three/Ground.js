import React, { useMemo } from 'react'
import {connect} from "react-redux"

import {getWorld} from "../../../../shared/reducers/shot-generator"
import {useAsset} from "../../../../shot-generator/hooks/use-assets-manager"

const Ground = React.memo(({ visible }) => {
  const {asset: texture} = useAsset('/data/system/grid_floor_1.png')

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
    <planeBufferGeometry attach="geometry" args={ [135 / 3, 135 / 3, 32] } />
    <meshToonMaterial attach="material" side={ THREE.FrontSide } visible={ visible }>
      <primitive attach="map" object={ texture } />
    </meshToonMaterial>
  </mesh>
})

const mapStateToProps = (state) => ({
  visible: getWorld(state).ground
})

export default connect(mapStateToProps)(Ground)
