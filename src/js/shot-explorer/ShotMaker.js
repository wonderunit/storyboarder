import React, { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { batch } from 'react-redux'
import * as THREE from 'three'
import ShotItem from './ShotItem'
import { ShotSizes, ShotAngles, setShot } from '../shot-generator/utils/cameraUtils'
import { OutlineEffect } from '../vendor/OutlineEffect'
import { 
    setCameraShot, 
    getSceneObjects,
    getActiveCamera
} from '../shared/reducers/shot-generator'
import objectTween from './objectTween'
import ShotElement from './ShotElement'

const getRandomNumber = (maxLength) => {
    let number = Math.floor(Math.random() * (maxLength-1))
    return number
}

const ShotMaker = React.memo(({
    sceneInfo,
    
    withState,
    aspectRatio,
    newAssetsLoaded
}) => {
    const camera = useRef()
    const [selectedShot, selectShot] = useState(null)
    const [shots, setShots] = useState([])
    const imageRenderer = useRef()
    const outlineEffect = useRef()
    const tweenObject = useRef()
    const setSelectedShot = (newSelectedShot) => {
        // TODO filter character once amount of objects in the scene changed
        let characters = sceneInfo.scene.__interaction.filter(object => object.userData.type === 'character')
        // Set camera to default before applying shot changes
        let clonnedCamera 
        withState((dispatch, state) => {
            clonnedCamera = sceneInfo.camera.clone()
            let activeCamera = getSceneObjects(state)[getActiveCamera(state)]
            let cameraObject = activeCamera
            clonnedCamera.position.x = cameraObject.x
            clonnedCamera.position.y = cameraObject.z
            clonnedCamera.position.z = cameraObject.y
            clonnedCamera.rotation.x = 0
            clonnedCamera.rotation.z = 0
            clonnedCamera.rotation.y = cameraObject.rotation
            clonnedCamera.rotateX(cameraObject.tilt)
            clonnedCamera.rotateZ(cameraObject.roll)
            clonnedCamera.fov = cameraObject.fov
            clonnedCamera.updateProjectionMatrix()
            clonnedCamera.updateMatrixWorld(true)
            selectedShot && setShot({camera: clonnedCamera, characters, selected:selectedShot.character, shotAngle:selectedShot.angle, shotSize:selectedShot.size})
            let rot = new THREE.Euler().setFromQuaternion(clonnedCamera.quaternion, "YXZ")

            sceneInfo.camera.position.x = clonnedCamera.position.x
            sceneInfo.camera.position.y = clonnedCamera.position.y
            sceneInfo.camera.position.z = clonnedCamera.position.z 
            sceneInfo.camera.rotation.x = 0
            sceneInfo.camera.rotation.z = 0
            sceneInfo.camera.rotation.y = rot.y
            sceneInfo.camera.rotateX(rot.x)
            sceneInfo.camera.rotateZ(rot.z)
            sceneInfo.camera.fov = clonnedCamera.fov
            sceneInfo.camera.updateProjectionMatrix()
            sceneInfo.camera.updateMatrixWorld(true)
            clonnedCamera = sceneInfo.camera.clone()
            clonnedCamera.updateMatrixWorld(true)

        })
        tweenObject.current = objectTween(sceneInfo.camera)
        setShot({camera: clonnedCamera, characters, selected:newSelectedShot.character, shotAngle:newSelectedShot.angle, shotSize:newSelectedShot.size})
        tweenObject.current(clonnedCamera.worldPosition(), clonnedCamera.worldQuaternion())
        selectShot(newSelectedShot)
    }
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
    
    const convertCanvasToImage = async (canvas) => {
        return new Promise((resolve, reject) => {
            let image = canvas.toDataURL('image/jpeg', 0.7)
            resolve(image);
        })
    }

    const renderSceneWithCamera = useCallback((shotsArray) => {
        let width = Math.ceil(900 * aspectRatio)

        outlineEffect.current.setSize(width, 900)
        for(let i = 0; i < shotsArray.length; i++) {
            let shot = shotsArray[i]
            outlineEffect.current.render(sceneInfo.scene, shot.camera)
            convertCanvasToImage(outlineEffect.current.domElement).then((cameraImage) => {
                shot.renderImage = cameraImage
            })
        }

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
            if(!character.getObjectByProperty("type", "SkinnedMesh")) continue
            let shot = new ShotItem(randomAngle, randomSize, character)
            setShot({camera: cameraCopy, characters, selected:character, shotAngle:shot.angle, shotSize:shot.size})
            shot.camera = cameraCopy.clone()
            shotsArray.push(shot)
        }
        renderSceneWithCamera(shotsArray)
        shotsArray[0] && setSelectedShot(shotsArray[0])
    
        setShots(shotsArray)
    }, [renderSceneWithCamera])

    useMemo(() => {
        if(sceneInfo ) {
            camera.current = sceneInfo.camera.clone()
            generateShot()
        }
    }, [sceneInfo, newAssetsLoaded])

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

    return ( 
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
                    return <ShotElement
                    key={index}
                    setSelectedShot={setSelectedShot}
                    object={object}
                    aspectRatio={aspectRatio}
                    scale={scale}
                    />
                })
            }
            </div>
        </div>
    )
})
export default ShotMaker