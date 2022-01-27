import React, { useMemo } from "react"
import { useFrame, useUpdate } from "react-three-fiber"
import Viewer from '../../../shared/THREE/environmentViewer'
import VirtualCamera from "./VirtualCamera"

const EnvironmentViewer = React.memo(({ assets, visible, rotation, type }) => {

    const ref = useUpdate(
        self => {
          self.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER) 
          self.traverse(child => child.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER))
        }
    )

    const cubeMaps = useMemo(() => (
        assets && ((assets.length > 1) || type === 'cross' && assets.length === 1) ? assets : undefined
    ),[assets])

    const sphereMap = useMemo(() => (
        assets && (type !== 'cross' && assets.length === 1) ? assets[0] : undefined
    ),[assets]) 

    const rotateEnvironmet = useMemo(() => [rotation.x,rotation.z,rotation.y],[rotation])

    useFrame(({camera})=>{
        if (ref.current) ref.current.position.copy(camera.position)
    })

    return (
        <group
            visible = {visible}
            ref={ref}
            rotation={rotateEnvironmet}
        >
            <Viewer 
                cubeMaps = {cubeMaps} 
                sphereMap= {sphereMap}
            />
        </group>
    )
})

export default EnvironmentViewer
