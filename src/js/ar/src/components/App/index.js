import React, {useCallback, useState, useEffect} from 'react'
import {Canvas} from 'react-three-fiber'
import {Provider, connect} from "react-redux"

import {SceneState} from "../../helpers/sceneState"

import Scene from "../Scene"

import store from "../../helpers/store"
import Loader from "../Loader"
import {ARButton} from "../../vendor/three/webxr/ARButton"
import useSceneLoader from "../../hooks/useSceneLoader"
import {getSceneObjects, getWorld} from "../../../../shared/reducers/shot-generator"

import ScaleButtons from "../ScaleButtons"
import MoveButtons from "../MoveButtons"
import SelectButton from "../SelectButton"


const preloadAssetsList = [
  '/data/system/grid_floor_1.png',
  '/data/system/grid_wall2.png',
  '/data/system/xr/light.glb',
  '/data/system/xr/controller.glb',
  '/data/system/xr/hmd.glb',
  '/data/system/dummies/bone.glb',
  '/data/system/xr/virtual-camera.glb',
  '/data/system/xr/teleport-target.glb'
]

const App = ({sceneObjects, world, board}) => {
  const innerState = useState({
    position: [0, 0, 0],
    rotation: 0,
    scale: 1.0,
    selectEnabled: false
  })
  
  const {assets, count} = useSceneLoader(sceneObjects, world, preloadAssetsList)
  const progress = !board.uid ? 0 : assets.length / count
  const appReady = progress >= 1.0
  
  const onCreated = useCallback(({gl, scene}) => {
    gl.getContext().makeXRCompatible()// Because of we enabled Webgl2
    
    const sessionParams = {
      requiredFeatures: ['local', 'hit-test'],
      optionalFeatures: ["dom-overlay"],
      domOverlay: { root: document.getElementById("overlay") }
    }
    
    document.body.appendChild(
      ARButton.createButton(gl, sessionParams)
    )
    
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
      <div id="overlay">
        <div>
          <SceneState.Provider value={innerState}>
            <ScaleButtons/>
            <MoveButtons/>
            <SelectButton/>
          </SceneState.Provider>
        </div>
      </div>
      <Canvas
        vr={true}
        gl2={true}
        noEvents={true}
        onCreated={onCreated}
      >
        <SceneState.Provider value={innerState}>
          <Provider store={store}>
            <Scene
              ready={appReady}
            />
          </Provider>
        </SceneState.Provider>
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
