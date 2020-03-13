import React, { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { batch } from 'react-redux'
import * as THREE from 'three'
import ShotItem from './ShotItem'
import { ShotSizes, ShotAngles, setShot } from '../shot-generator/utils/cameraUtils'
import { OutlineEffect } from '../vendor/OutlineEffect'
import { 
    setCameraShot, 
} from '../shared/reducers/shot-generator'
const getRandomNumber = (maxLength) => {
    let number = Math.floor(Math.random() * (maxLength-1))
    return number
}

const ShotMaker = React.memo(({
    sceneInfo,
    
    withState,
    aspectRatio,
}) => {
    const camera = useRef()
    const [selectedShot, selectShot] = useState(null)
    const [shots, setShots] = useState([])
    const imageRenderer = useRef()
    const outlineEffect = useRef()
    useMemo(() => {
        if (!imageRenderer.current) {
            imageRenderer.current = new THREE.WebGLRenderer({ antialias: true }), { defaultThickness:0.008 }
        }
        outlineEffect.current = new OutlineEffect(imageRenderer.current, { defaultThickness: 0.015 })
        return () => {
            imageRenderer.current = null
            outlineEffect.current = null
        }
    }, [])

    const renderSceneWithCamera = useCallback((camera) => {
        let width = Math.ceil(900 * aspectRatio)
        let imageRenderCamera = camera
        outlineEffect.current.setSize(width, 900)
        outlineEffect.current.render(sceneInfo.scene, imageRenderCamera)
        let cameraImage = outlineEffect.current.domElement.toDataURL()
        return cameraImage
    }, [sceneInfo])

    const generateShot = useCallback(() => {
        let shotsArray = []
        let shotsCount = 12
        let characters = sceneInfo.scene.__interaction.filter(object => object.userData.type === 'character')
        if(!characters.length) {
            return;
        }
        for(let i = 0; i < shotsCount; i++) {
            let cameraCopy = camera.current.clone()
            let shotAngleKeys = Object.keys(ShotAngles)
            let randomAngle = ShotAngles[shotAngleKeys[getRandomNumber(shotAngleKeys.length)]]
            
            let shotSizeKeys = Object.keys(ShotSizes)
            let randomSize = ShotSizes[shotSizeKeys[getRandomNumber(shotSizeKeys.length)]]

            let character = characters[getRandomNumber(characters.length)]
            let shot = new ShotItem(randomAngle, randomSize, character)
            setShot({camera: cameraCopy, characters, selected:character, shotAngle:shot.angle, shotSize:shot.size})
            shot.renderImage = renderSceneWithCamera(cameraCopy)
            shotsArray.push(shot)
        }
        selectShot(shotsArray[0])
        setShots(shotsArray)
    }, [renderSceneWithCamera])

    useMemo(() => {
        if(sceneInfo ) {
            camera.current = sceneInfo.camera.clone()
            generateShot()
        }
    }, [sceneInfo])



    const updateCamera = useCallback(() => {
        withState((dispatch, state) => {
            batch(() => {
                dispatch(setCameraShot(camera.current.userData.id, {size: selectedShot.size, angle: selectedShot.angle, character: selectedShot.character.userData.id }))
            })
        })
    }, [selectedShot])

    let scale = 2
    const [windowHeight, setWindowHeight] = useState(window.innerHeight)
    const handleResize = () => {
        setWindowHeight(window.innerHeight)
      }
    
    useLayoutEffect(() => {
      window.addEventListener('resize', handleResize)
      
      return () => {
        window.removeEventListener('resize', handleResize) 
      }
    }, [])

    return ( selectedShot &&
        <div style={{ maxHeight: "100%", height: "100%" }}>
    {/*         <div className="shot-explorer-shot-selected" style={{ width: (900 * aspectRatio) / scale, height: 900 / scale }}>
                <img className="shot-explorer-image" src={selectedShot && selectedShot.renderImage}/>
                <div>{selectedShot && selectedShot.toString()}</div>
            </div> */}
            <div className="insert-camera" onPointerDown={() => updateCamera()}>
                <a>
                    Insert Camera
                </a>
            </div>
            <div className="shots-container" style={{ maxWidth: (900 * aspectRatio) / scale + 30, height: windowHeight / scale - 45 }}>
            {
                shots.map((object, index) => {
                    return <div className="shot-explorer-shot" key={ index } style={{  minWidth:  ((900 * aspectRatio) / scale) / 3, maxWidth:  ((900 * aspectRatio) / scale) / 3, height: (900 / scale) / 3 }}>
                         <img className="shot-explorer-image" src={object.renderImage} onPointerDown={() =>{ selectShot(object) }}/>
                         <div style={{overflow: "hidden", fontSize: "12px"}}>{object.toString()}</div>
                         </div>
                })
            }
            </div>
        </div>
    )
})
export default ShotMaker