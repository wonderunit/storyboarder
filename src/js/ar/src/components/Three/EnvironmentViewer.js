import React, { useMemo } from 'react'
import { useRef } from "react"
import Viewer from "../../../../shared/THREE/environmentViewer"


const EnvironmentViewer = ({ assets, visible, rotation, type}) => {

    const ref = useRef(null)
    const rotateEnvironmet = useMemo(() => [rotation.x,rotation.z,rotation.y],[rotation])


    const cubeMaps = useMemo(() => (
        assets && ((assets.length > 1) || type === 'cross' && assets.length === 1) ? assets : undefined
    ),[assets])

    const sphereMap = useMemo(() => (
        assets && (type !== 'cross' && assets.length === 1) ? assets[0] : undefined
    ),[assets]) 


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
}


export default EnvironmentViewer