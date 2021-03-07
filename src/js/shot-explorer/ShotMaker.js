import React, { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import ShotItem from './ShotItem'
import { ShotSizes, ShotAngles, setShot } from '../shot-generator/utils/cameraUtils'
import * as THREE from 'three'
import { OutlineEffect } from '../vendor/OutlineEffect'
import { 
    getSceneObjects,
    getActiveCamera,
    // action creators
    selectObject,
    undoGroupStart,
    undoGroupEnd,
    setActiveCamera,
    createObject
} from '../shared/reducers/shot-generator'
import ObjectTween from './objectTween'
import ShotElement from './ShotElement'
import InfiniteScroll from './InfiniteScroll'
import generateRule from './ShotsRule/RulesGenerator'

import getRandomNumber from './utils/getRandomNumber'
import {cache} from '../shot-generator/hooks/use-assets-manager'
const shotSizes = [
    { value: ShotSizes.EXTREME_CLOSE_UP,  label: "Extreme Close Up" },
    { value: ShotSizes.VERY_CLOSE_UP,     label: "Very Close Up" },
    { value: ShotSizes.CLOSE_UP,          label: "Close Up" },
    { value: ShotSizes.MEDIUM_CLOSE_UP,   label: "Medium Close Up" },
    { value: ShotSizes.BUST,              label: "Bust" },
    { value: ShotSizes.MEDIUM,            label: "Medium Shot" },
    { value: ShotSizes.MEDIUM_LONG,       label: "Medium Long Shot" },
    { value: ShotSizes.LONG,              label: "Long Shot / Wide" },
    { value: ShotSizes.EXTREME_LONG,      label: "Extreme Long Shot" },
    { value: ShotSizes.ESTABLISHING,      label: "Establishing Shot" }
]

const shotAngles = [
  { value: ShotAngles.BIRDS_EYE,        label: "Bird\'s Eye" },
  { value: ShotAngles.HIGH,             label: "High" },
  { value: ShotAngles.EYE,              label: "Eye" },
  { value: ShotAngles.LOW,              label: "Low" },
  { value: ShotAngles.WORMS_EYE,        label: "Worm\'s Eye" }
]

import { useTranslation } from 'react-i18next'
const getRandomFov = (aspectRatio) => {

    const mms = [12, 16, 18, 22, 24, 35, 50]
    let randomMms = getRandomNumber(mms.length)
    let filemHeight = 35 / Math.max( aspectRatio, 1 );
    var vExtentSlope = 0.5 * filemHeight / mms[randomMms];

    let fov = THREE.Math.RAD2DEG * 2 * Math.atan( vExtentSlope );
    return fov
}

const ShotMaker = React.memo(({
    elementKey,
    sceneInfo,
    
    withState,
    aspectRatio,
    newAssetsLoaded,
    canvasHeight,
    sceneObjects
}) => {
    const camera = useRef()
    const [selectedShot, selectShot] = useState(null)
    const [shots, setShots] = useState([])
    const imageRenderer = useRef()
    const outlineEffect = useRef()
    const tweenObject = useRef()
    const [noCharacterWarn, setNoCharacterWarn] = useState(sceneInfo ? false : true)
    const [windowHeight, setWindowHeight] = useState(window.innerWidth)
    const [windowWidth, setWindowWidth] = useState(window.innerWidth)
    const containerHeight = useRef()
    const [assetsLoaded, setAssetsLoaded] = useState()
    const { t } = useTranslation()
    const handleResize = () => {
        let container = document.getElementsByClassName("shots-container")
        setWindowWidth(window.innerWidth)
        let height = window.innerHeight - container[0].offsetTop - 10
        containerHeight.current = height
        setWindowHeight(height)
      }

    const setSelectedShot = (newSelectedShot) => {
        // TODO filter character once amount of objects in the scene changed
        // Set camera to default before applying shot changes
        let clonnedCamera = newSelectedShot.camera
        tweenObject.current = tweenObject.current || new ObjectTween(sceneInfo.camera)
        tweenObject.current.stopTween()
        selectedShot && sceneInfo.camera.copy(selectedShot.camera)
        sceneInfo.camera.updateProjectionMatrix()
        tweenObject.current.startTween(clonnedCamera.worldPosition(), clonnedCamera.worldQuaternion(), 1000, (delta) => {
            let distance = clonnedCamera.fov - sceneInfo.camera.fov
            sceneInfo.camera.fov = sceneInfo.camera.fov + ( distance * delta )
            sceneInfo.camera.updateProjectionMatrix()
        })
        selectShot(newSelectedShot)
    }

    const isAnyAssetsPending = () => {
        let assets = Object.values(cache.get())
        for(let i = 0; i < assets.length; i++) {
            if(assets[i].status === "PENDING") return true
        }
        return false
    }

    const updateAssets = (event) => { 
       // console.log("Trying to update assets")
        if(!isAnyAssetsPending()) {
            setAssetsLoaded({})
        }
    }

    useEffect(() => {
        if (!imageRenderer.current) {
            imageRenderer.current = new THREE.WebGLRenderer({ antialias: true })
        }
        outlineEffect.current = new OutlineEffect(imageRenderer.current, { defaultThickness: 0.015 })
        cache.subscribe(updateAssets)
        handleResize()
        return () => {
            cache.unsubscribe(updateAssets)
            imageRenderer.current = null
            outlineEffect.current = null
            cleanUpShots()
        }
    }, [])

    const cleanUpShots = () => {
        for(let i = 0; i < shots.length; i++) {
            shots[i].destroy()
        }
    }

    const convertCanvasToImage = async (outlineEffect, scene, camera) => {
        return new Promise((resolve, reject) => {
            outlineEffect.render(scene, camera)
            let image = outlineEffect.domElement.toDataURL('image/jpeg', 0.5)
            resolve(image);
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

    const generateShot = (shotsArray, shotsCount) => {
        let characters = sceneInfo.scene.__interaction.filter(object => object.userData.type === 'character' && object.userData.isSameSkeleton) 
        if(!characters.length) {
            setNoCharacterWarn(true)
            return;
        } else {
            setNoCharacterWarn(false)
        }
        for(let i = 0; i < shotsCount; i++) {
            let cameraCopy = camera.current.clone()
            let shotAngleKeys = Object.keys(shotAngles)
            let randomAngle = shotAngles[shotAngleKeys[getRandomNumber(shotAngleKeys.length)]]
            
            let shotSizeKeys = Object.keys(shotSizes)
            let randomSize = shotSizes[shotSizeKeys[getRandomNumber(shotSizeKeys.length)]]

            let character = characters[getRandomNumber(characters.length)]
            let skinnedMesh = character.getObjectByProperty("type", "SkinnedMesh")
            if(!skinnedMesh || !skinnedMesh.skeleton) continue
            let shot = new ShotItem(randomAngle.label, randomSize.label, character)
            cameraCopy.fov = getRandomFov(aspectRatio)
            cameraCopy.updateProjectionMatrix()
            let box = setShot({camera: cameraCopy, characters, selected:character, shotAngle:shot.angle, shotSize:shot.size})
            cameraCopy.updateMatrixWorld(true)

            // Calculates box center in order to calculate camera height
            let center = new THREE.Vector3()
            box.getCenter(center)
            
            // Generates random rule for shot
            shot.rules = generateRule(center, character, shot, cameraCopy, skinnedMesh, characters)
            // Removes applying rule to Establishing, cause Establishing take in cosiderationg multiple chracters while 
            // rule is designed to apply to one character 
            if(ShotSizes.ESTABLISHING !== shot.size) {
                for(let i = 0; i < shot.rules.length; i++) {
                    shot.rules[i].applyRule(sceneInfo.scene)
                }
            }
            shot.camera = cameraCopy
            shotsArray.push(shot)
        }
    }
    const generateShots = () => {
        if(sceneInfo) {
            camera.current = sceneInfo.camera.clone()
            withState((dispatch, state) => {
                let cameraObject = getSceneObjects(state)[getActiveCamera(state)]
                camera.current.position.x = cameraObject.x
                camera.current.position.y = cameraObject.z
                camera.current.position.z = cameraObject.y
                camera.current.rotation.x = 0
                camera.current.rotation.z = 0
                camera.current.rotation.y = cameraObject.rotation
                camera.current.rotateX(cameraObject.tilt)
                camera.current.rotateZ(cameraObject.roll)
                camera.current.aspect = aspectRatio
                camera.current.fov = cameraObject.fov
                camera.current.updateMatrixWorld(true)
                camera.current.updateProjectionMatrix()
            })

            const paddingSize = 5
            const canvasHeightWithPadding = canvasHeight - (paddingSize * 3)
            let height = (canvasHeightWithPadding / 3)

            let shotsArray = []
            let shotsCount =  Math.ceil(containerHeight.current / (height + 20)) * 3
            generateShot(shotsArray, shotsCount)
            renderSceneWithCamera(shotsArray)
            shotsArray[0] && setSelectedShot(shotsArray[0])
            cleanUpShots()
            setShots(shotsArray)
        }
    }

    useEffect(() => {
        if(!isAnyAssetsPending()) {
            generateShots()
        }
    }, [sceneInfo, sceneObjects, assetsLoaded])

    const generateMoreShots = useCallback(() => {
        let shotsArray = []
        let shotsCount = 3
        generateShot(shotsArray, shotsCount)
        renderSceneWithCamera(shotsArray)
        setShots(shots.concat(shotsArray))
    }, [sceneInfo, generateShot, shots])

    const updateCamera = () => {
        withState((dispatch, state) => {
            let id = THREE.Math.generateUUID()
            let { x, y, z } = sceneInfo.camera.position
            let rot = new THREE.Euler().setFromQuaternion(sceneInfo.camera.quaternion, "YXZ")
            let rotation = rot.y
            let tilt = rot.x
            let roll = rot.z
            let object = {
              id,
              type: 'camera',
          
              fov: sceneInfo.camera.fov,
          
              x, y: z, z: y,
              rotation, tilt, roll
            }
            dispatch(undoGroupStart())
            dispatch(createObject(object))
            dispatch(selectObject(id))
            dispatch(setActiveCamera(id))
            dispatch(undoGroupEnd())
        })
    }
    
    useLayoutEffect(() => {
      window.addEventListener('resize', handleResize)
      return () => {
        window.removeEventListener('resize', handleResize) 
      }
    }, [])

    return ( 
        <div style={{ maxHeight: "100%", height: "100%" }}>
            <div style={{display:"flex"}} >
                <div className="description-selected"><div>{ selectedShot && selectedShot.toString(t)}</div></div>
                <div className="insert-camera" style={{marginLeft:"auto", paddingRight:"5px"}} onPointerDown={() => updateCamera()}>
                    <a>
                        {t("shot-explorer.insert-camera")}
                    </a>
                </div>
            </div>
            {noCharacterWarn && <div style={{ textAlign:"center" }}>{t("shot-explorer.characters-warning")}</div>}
            <div>
               { <InfiniteScroll 
                    key={ elementKey }
                    Component={ ShotElement }
                    elements={ shots }
                    className="shots-container"
                    style={{ maxWidth: windowWidth, height: windowHeight }}
                    setSelectedShot={ setSelectedShot }
                    fetchMoreElements={ generateMoreShots }
                    aspectRatio={ aspectRatio }
                    sceneInfo={ sceneInfo }
                    canvasHeight={ canvasHeight }
                    windowWidth={ windowWidth }
                    />}
            </div>
         
        </div>
    )
})

export default ShotMaker