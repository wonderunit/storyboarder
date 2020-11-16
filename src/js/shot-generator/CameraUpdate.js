import React, { useEffect } from 'react' 
import { connect } from 'react-redux'
import { useThree } from 'react-three-fiber'
import { 
    getSceneObjects,
    getActiveCamera,
 } from '../shared/reducers/shot-generator'

const CameraUpdate = connect(    
    state => ({
    activeCamera: getSceneObjects(state)[getActiveCamera(state)],
    aspectRatio: state.aspectRatio
}),
{
}
)( React.memo(({ 
    activeCamera,
    aspectRatio
}) => {
    const { camera } = useThree()
    useEffect(() => {
        let cameraObject = activeCamera
        camera.aspect = aspectRatio
        camera.position.x = cameraObject.x
        camera.position.y = cameraObject.z
        camera.position.z = cameraObject.y
        camera.rotation.x = 0
        camera.rotation.z = 0
        camera.rotation.y = cameraObject.rotation
        camera.rotateX(cameraObject.tilt)
        camera.rotateZ(cameraObject.roll)
        camera.userData.type = cameraObject.type
        camera.userData.locked = cameraObject.locked
        camera.userData.id = cameraObject.id
        console.log("camera update")
    }, [activeCamera, aspectRatio])
    
    useEffect(() => {
        camera.fov = activeCamera.fov
        console.log("camera's fov update")
        camera.updateProjectionMatrix()
    }, [activeCamera.fov, aspectRatio])
    return null
    })
)

export default CameraUpdate