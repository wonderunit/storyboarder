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
}),
{
}
)( React.memo(({ 
    activeCamera
}) => {
    const { camera } = useThree()
    useEffect(() => {
        let cameraObject = activeCamera
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
    }, [activeCamera])

    useEffect(() => {
        camera.fov = activeCamera.fov
        camera.updateProjectionMatrix()
    }, [activeCamera.fov])
    return null
    })
)

export default CameraUpdate