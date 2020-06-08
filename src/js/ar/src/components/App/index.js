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
    scale: [0.02, 0.02, 0.02]
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


  useEffect(() => {
    const onOrientationChange = (event) => {
      let x     = event.beta
      let y    = event.gamma

      // Because we don't want to have the device upside down
      // We constrain the x value to the range [-90,90]
      if (x >  90) { x =  90}
      if (x < -90) { x = -90}

      // To make computation easier we shift the range of 
      // x and y to [0,180]
      // x += 90
      // y += 90
      
      let angle = Math.atan2( - y / 180, - x / 180 ) + Math.PI
      
      let quater = Math.round( angle / (Math.PI * 0.5) )
      
      console.clear()
      console.log(quater)
    }

    window.addEventListener("deviceorientation", onOrientationChange, true)
    
    return () => {
      window.removeEventListener("deviceorientation", onOrientationChange, true)
    }
  }, [])
  
  return (
    <>
      <Loader
        key={board.uid}
        progress={progress}
      />
      <div id="overlay">
        <SceneState.Provider value={innerState}>
          <ScaleButtons/>
        </SceneState.Provider>
      </div>
      <Canvas
        vr={true}
        gl2={true}
        noEvents={true}
        onCreated={onCreated}
      >
        <Provider store={store}>
          <Scene
            ready={appReady}
            placingEnabled={true}
            sceneState={innerState}
          />
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
