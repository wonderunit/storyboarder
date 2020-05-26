import React, {useEffect, useRef} from 'react'
import {useThree} from "react-three-fiber"


const getReticle = () => {
  let reticle = new THREE.Mesh(
    new THREE.RingBufferGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
    new THREE.MeshBasicMaterial({color: 0x5c65c0, depthTest: false})
  )
  reticle.matrixAutoUpdate = false
  reticle.visible = false
  
  return reticle
}

const RETICLE = getReticle()

export const useHitTestManager = (hitTestEnable = true) => {
  const {gl, scene, camera} = useThree()
  const isTestEnabled = useRef(hitTestEnable)
  const hitTestSourceRequested = useRef(false)
  const xrViewerSpaceRef = useRef(null)
  const xrHitTestSourceRef = useRef(null)

  useEffect(() => {
    if (hitTestEnable) {
      scene.add(RETICLE) 
    }

    return () => {
      scene.remove(RETICLE)
    }
  }, [scene, hitTestEnable])

  useEffect(() => {
    isTestEnabled.current = hitTestEnable
  }, [hitTestEnable])
  
  gl.xr.setAnimationLoop((dt, frame) => {
    const session = gl.xr.getSession()
    const referenceSpace = gl.xr.getReferenceSpace()

    if (!hitTestSourceRequested.current) {
      session.requestReferenceSpace('viewer').then((refSpace) => {
        xrViewerSpaceRef.current = refSpace
        session.requestHitTestSource({space: xrViewerSpaceRef.current}).then((hitTestSource) => {
          xrHitTestSourceRef.current = hitTestSource
        })
      })

      session.addEventListener('end', function () {

        hitTestSourceRequested.current = false
        xrHitTestSourceRef.current = null

      });

      hitTestSourceRequested.current = true
    }

    if ( xrHitTestSourceRef.current && isTestEnabled.current ) {

      let hitTestResults = frame.getHitTestResults( xrHitTestSourceRef.current )

      if ( hitTestResults.length ) {
        let hit = hitTestResults[ 0 ];
        
        // let hits = hitTestResults.map(ht => ht.getPose( referenceSpace ))
        // console.log(hits)

        RETICLE.visible = true;
        RETICLE.matrix.fromArray( hit.getPose( referenceSpace ).transform.matrix )

      } else {

        RETICLE.visible = false

      }

    }

    gl.render( scene, camera )
  })
}

export const useController = (fn, inputs = []) => {
  const {gl} = useThree()
  
  useEffect(() => {
    const controller = gl.xr.getController(0)
    const resultFn = (e) => fn({...e, reticle: RETICLE})
    
    controller.addEventListener('select', resultFn)
    
    return () => {
      controller.removeEventListener('select', resultFn)
    }
  }, [fn, ...inputs])
}
