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
import isUserModel from '../shot-generator/helpers/isUserModel'
import VerticalOneThirdRule from './ShotsRule/VerticalOneThirdRule'
import OrbitingRule from './ShotsRule/OrbitingRule'
const getRandomNumber = (maxLength) => {
    let number = Math.floor(Math.random() * (maxLength))
    return number
}

const getRandomFov = (aspectRatio) => {

    const mms = [12, 16, 18, 22, 24, 35, 50, 85, 100]
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
    defaultWidth
}) => {
    const camera = useRef()
    const [selectedShot, selectShot] = useState(null)
    const [shots, setShots] = useState([])
    const imageRenderer = useRef()
    const outlineEffect = useRef()
    const tweenObject = useRef()
    const [noCharacterWarn, setNoCharacterWarn] = useState(false)
    const [windowHeight, setWindowHeight] = useState(0)
    const [windowWidth, setWindowWidth] = useState(0)
    const containerHeight = useRef()

    const handleResize = () => {
        let offsetTop = document.getElementsByClassName("shots-container")[0].offsetTop
        setWindowWidth(window.innerWidth)
        let height = window.innerHeight - offsetTop - 10
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
    useEffect(() => {
        console.log("Mount")
        if (!imageRenderer.current) {
            imageRenderer.current = new THREE.WebGLRenderer({ antialias: true }), { defaultThickness:0.008 }
        }
        outlineEffect.current = new OutlineEffect(imageRenderer.current, { defaultThickness: 0.015 })
        handleResize()
        return () => {
            console.log("Unmount")
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
        let characters = sceneInfo.scene.__interaction.filter(object => object.userData.type === 'character' && !isUserModel(object.userData.modelName))
        if(!characters.length) {
            setNoCharacterWarn(true)
            return;
        } else {
            setNoCharacterWarn(false)
        }
        for(let i = 0; i < shotsCount; i++) {
            let cameraCopy = camera.current.clone()
            let shotAngleKeys = Object.keys(ShotAngles)
            let randomAngle = ShotAngles[shotAngleKeys[getRandomNumber(shotAngleKeys.length)]]
            
            let shotSizeKeys = Object.keys(ShotSizes)
            let randomSize = ShotSizes[shotSizeKeys[getRandomNumber(shotSizeKeys.length - 2)]]

            // Limits worms shot size so that shot doesn't look awful
            if(randomAngle === ShotAngles.WORMS_EYE) {
                while(randomSize === ShotSizes.EXTREME_CLOSE_UP || randomSize === ShotSizes.VERY_CLOSE_UP
                    || randomSize === ShotSizes.MEDIUM_CLOSE_UP || randomSize === ShotSizes.ESTABLISHING
                    || randomSize === ShotSizes.EXTREME_LONG || randomSize === ShotSizes.LONG) {
                    randomSize = ShotSizes[shotSizeKeys[getRandomNumber(shotSizeKeys.length - 2)]]
                }
            }

            let character = characters[getRandomNumber(characters.length)]
            let skinnedMesh = character.getObjectByProperty("type", "SkinnedMesh")
            if(!skinnedMesh) continue
            let shot = new ShotItem(randomAngle, randomSize, character)
            cameraCopy.fov = getRandomFov(aspectRatio)
            cameraCopy.updateMatrixWorld(true)
            cameraCopy.updateProjectionMatrix()
            let box = setShot({camera: cameraCopy, characters, selected:character, shotAngle:shot.angle, shotSize:shot.size})

            //#region Finds Headbone and it's children and calculates their center for vertical oneThird
            let headBone = skinnedMesh.skeleton.bones.filter(bone => bone.name === "Head")[0]
            let headPoints = []
            headPoints.push(headBone.worldPosition())
            for(let i = 0; i < headBone.children.length; i++) {
                if(headBone.children[i].name.includes('leaf'))
                    headPoints.push(headBone.children[i].worldPosition())
            }
            let headBox = new THREE.Box3().setFromPoints(headPoints)
            let headCenter = new THREE.Vector3()
            headBox.getCenter(headCenter)
            //#endregion

            // Calculates box center in order to calculate camera height
            let center = new THREE.Vector3()
            box.getCenter(center)

            // TODO() : Fixed ots vertical oneThird
            // Applies vertical oneThird rule; Should be always applied
            shot.verticalRule = new VerticalOneThirdRule(headCenter, cameraCopy)          
            shot.orbitingRule = new OrbitingRule(headCenter, cameraCopy)          
            shot.orbitingRule.applyRule()
            shot.cameraRotation = shot.orbitingRule.angle

            // Generates random rule for shot
            shot.rules = generateRule(center, character, shot, cameraCopy)  

            for(let i = 0; i < shot.rules.length; i++) {
                shot.rules[i].applyRule()
            }
            if(shot.size !== ShotSizes.ESTABLISHING) {
                    shot.verticalRule.applyRule(center)
                }

            shot.camera = cameraCopy
            shotsArray.push(shot)
        }
    }, [renderSceneWithCamera])

    useEffect(() => {
        if(sceneInfo) {
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

            const paddingSize = 5
            const newDefaultWidth = defaultWidth - (paddingSize * 3)
            let height = (newDefaultWidth / 3)

            camera.current = sceneInfo.camera.clone()
            let shotsArray = []
            let shotsCount =  Math.ceil(containerHeight.current / (height + 20)) * 3
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
    }, [selectedShot])

    let scale = 2
    
    useLayoutEffect(() => {
      window.addEventListener('resize', handleResize)
      
      return () => {
        window.removeEventListener('resize', handleResize) 
      }
    }, [])
    return ( 
        <div style={{ maxHeight: "100%", height: "100%" }}>
            <div style={{display:"flex"}} >
                <div className="description-selected"><div>{ selectedShot && selectedShot.toString()}</div></div>
                <div className="insert-camera" style={{marginLeft:"auto", paddingRight:"5px"}} onPointerDown={() => updateCamera()}>
                    <a>
                        Insert Camera
                    </a>
                </div>
            </div>
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
                    scale={ scale }
                    sceneInfo={ sceneInfo }
                    defaultWidth={ defaultWidth }
                    windowWidth={ windowWidth }
                    />}
            </div>
            {noCharacterWarn && <div style={{ textAlign:"center" }}>You need to add at least one built-in character to scene </div>}
        </div>
    )
})

export default ShotMaker