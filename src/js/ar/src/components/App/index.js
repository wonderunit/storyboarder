import React, {useCallback} from 'react'
import {Canvas} from 'react-three-fiber'
import {Provider, connect} from "react-redux"

import Scene from "../Scene"

import store from "../../helpers/store"
import Loader from "../Loader"
import {ARButton} from "../../vendor/three/webxr/ARButton"
import useSceneLoader from "../../hooks/useSceneLoader"
import {getSceneObjects, getWorld} from "../../../../shared/reducers/shot-generator"


const preloadAssetsList = [
  '/data/system/grid_floor_1.png',
  '/data/system/grid_wall2.png'
]

const App = ({sceneObjects, world, board}) => {
  
  const {assets, count, loaded} = useSceneLoader(sceneObjects, world, preloadAssetsList)
  const progress = !board.uid ? 0 : assets.length / count
  const appReady = progress >= 1.0
  
  const onCreated = useCallback(({gl, scene}) => {
    gl.getContext().makeXRCompatible()// Because of we enabled Webgl2
    document.body.appendChild(ARButton.createButton(gl, {requiredFeatures: ['local', 'hit-test']}))
    
    gl.xr.setReferenceSpaceType('unbounded')
    
    const controller = gl.xr.getController(0) // Add finger touch element to the scene
    scene.add(controller)
  }, [])
  
  return (
    <>
      <Loader
        key={board.uid}
        progress={progress}
      />
      <Canvas
        vr={true}
        gl2={true}
        noEvents={true}
        onCreated={onCreated}
      >
        <Provider store={store}>
          <Scene ready={appReady}/>
        </Provider>
      </Canvas>
    </>
  )
}

const mapStateToProps = (state) => ({
  sceneObjects: getSceneObjects(state),
  world: getWorld(state),
  board: state.board
})

export default connect(mapStateToProps)(App)
