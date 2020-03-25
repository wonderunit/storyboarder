import React, { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { batch } from 'react-redux'
import ShotItem from './ShotItem'
import { ShotSizes, ShotAngles, setShot } from '../shot-generator/utils/cameraUtils'
import * as THREE from 'three'
import { OutlineEffect } from '../vendor/OutlineEffect'
import { 
    setCameraShot, 
    getSceneObjects,
    getActiveCamera
} from '../shared/reducers/shot-generator'
import ObjectTween from './objectTween'
import ShotElement from './ShotElement'
import InfiniteScroll from './InfiniteScroll'
import generateRule from './ShotsRule/RulesGenerator'

const getRandomNumber = (maxLength) => {
    let number = Math.floor(Math.random() * (maxLength-1))
    return number
}

const ShotMaker = React.memo(({
    elementKey,
    sceneInfo,
    
    withState,
    aspectRatio,
    updateObject,
    newAssetsLoaded,
    defaultWidth
}) => {
    const camera = useRef()
    const [selectedShot, selectShot] = useState(null)
    const [shots, setShots] = useState([])
    const imageRenderer = useRef()
    const outlineEffect = useRef()
    const tweenObject = useRef()
    const cameraCenter = useRef()
    const desiredPosition = useRef()
    const setSelectedShot = (newSelectedShot) => {
        // TODO filter character once amount of objects in the scene changed
        // Set camera to default before applying shot changes
        let clonnedCamera = newSelectedShot.camera
        tweenObject.current = tweenObject.current || new ObjectTween(sceneInfo.camera)
        tweenObject.current.stopTween()
        selectedShot && sceneInfo.camera.copy(selectedShot.camera)

        tweenObject.current.startTween(clonnedCamera.worldPosition(), clonnedCamera.worldQuaternion())
        selectShot(newSelectedShot)
    }
    useEffect(() => {
        console.log("mount")
        let material = new THREE.MeshBasicMaterial()
        let geometry = new THREE.BoxGeometry(0.1, 0.1)
        cameraCenter.current = new THREE.Mesh(geometry, material)
        desiredPosition.current = new THREE.Mesh(geometry, material)
        if (!imageRenderer.current) {
            imageRenderer.current = new THREE.WebGLRenderer({ antialias: true }), { defaultThickness:0.008 }
        }
        outlineEffect.current = new OutlineEffect(imageRenderer.current, { defaultThickness: 0.015 })
        return () => {
            console.log("unmount")
            imageRenderer.current = null
            outlineEffect.current = null
            cleanUpShots()
           // setShots([])
        }
    }, [])

    const cleanUpShots = () => {
        for(let i = 0; i < shots.length; i++) {
            shots[i].destroy()
        }
    }

    const convertCanvasToImage = async (outlineEffect, scene, camera) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                outlineEffect.render(scene, camera)
                let image = outlineEffect.domElement.toDataURL('image/jpeg', 0.5)
                resolve(image);
            }, 10)
        
        })
    }

    const renderSceneWithCamera = useCallback((shotsArray) => {
        let width = Math.ceil(900 * aspectRatio)
        outlineEffect.current.setSize(width, 900)
        for(let i = 0; i < shotsArray.length; i++) {
            let shot = shotsArray[i]
            convertCanvasToImage(outlineEffect.current, sceneInfo.scene, shot.camera).then((cameraImage) => {
                // NOTE() : a bad practice to update component but it's okay for now
                shot.setRenderImage( cameraImage )
            })
        }

    }, [sceneInfo])

    const generateShot = useCallback((shotsArray, shotsCount) => {
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
            let box = setShot({camera: cameraCopy, characters, selected:character, shotAngle:shot.angle, shotSize:shot.size})
            // Calculate camera rotation for one third
            shot.rule = generateRule(box, cameraCopy)            
            shot.rule && shot.rule.applyRule()
            shot.camera = cameraCopy.clone()
            shotsArray.push(shot)
        }
    }, [renderSceneWithCamera])

    useEffect(() => {
        if(sceneInfo) {
            console.log("Intializing")

            withState((dispatch, state) => {
                let cameraObject = getSceneObjects(state)[getActiveCamera(state)]
                sceneInfo.camera.position.x = cameraObject.x
                sceneInfo.camera.position.y = cameraObject.z
                sceneInfo.camera.position.z = cameraObject.y
                sceneInfo.camera.rotation.x = 0
                sceneInfo.camera.rotation.z = 0
                sceneInfo.camera.rotation.y = cameraObject.rotation
                sceneInfo.camera.rotateX(cameraObject.tilt)
                sceneInfo.camera.rotateZ(cameraObject.roll)
                sceneInfo.camera.fov = cameraObject.fov
                sceneInfo.camera.updateProjectionMatrix()
            })

            camera.current = sceneInfo.camera.clone()
            let shotsArray = []
            let shotsCount = 9
            generateShot(shotsArray, shotsCount)

            renderSceneWithCamera(shotsArray)
            shotsArray[0] && setSelectedShot(shotsArray[0])
            cleanUpShots()
            setShots(shotsArray)
        }
    }, [sceneInfo, newAssetsLoaded])

    const generateMoreShots = useCallback(() => {
        let shotsArray = []
        let shotsCount = 3
        generateShot(shotsArray, shotsCount)
        renderSceneWithCamera(shotsArray)
        setShots(shots.concat(shotsArray))
    }, [sceneInfo, generateShot, shots])

    const updateCamera = useCallback(() => {
        withState((dispatch, state) => {
            let rot = new THREE.Euler().setFromQuaternion(sceneInfo.camera.quaternion, "YXZ")
            batch(() => {
                dispatch(updateObject(updateObject(camera.current.userData.id, {
                    x: sceneInfo.camera.position.x,
                    y: sceneInfo.camera.position.z,
                    z: sceneInfo.camera.position.y,
                    rotation: rot.y,
                    tilt: rot.x,
                    roll: rot.z
                  })))
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
    console.log(elementKey, shots)
    return ( 
        <div style={{ maxHeight: "100%", height: "100%" }}>
            <div style={{display:"flex"}} >
                <div className="description-selected"><div>{ selectedShot && selectedShot.toString()}</div></div>
                <div className="insert-camera" style={{marginLeft:"auto"}} onPointerDown={() => updateCamera()}>
                    <a>
                        Insert Camera
                    </a>
                </div>
            </div>
            <div>
                <InfiniteScroll 
                    key={ elementKey }
                    Component={ ShotElement }
                    elements={ shots }
                    className="shots-container"
                    style={{ maxWidth: (defaultWidth * aspectRatio), height: windowHeight / scale - 45 }}
                    setSelectedShot={ setSelectedShot }
                    fetchMoreElements={ generateMoreShots }
                    aspectRatio={ aspectRatio }
                    scale={ scale }
                    sceneInfo={ sceneInfo }
                    defaultWidth={ defaultWidth }/>
            </div>
        </div>
    )
})
export default ShotMaker