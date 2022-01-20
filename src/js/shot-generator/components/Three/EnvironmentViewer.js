import { useMemo } from "react"
import { useFrame, useUpdate } from "react-three-fiber"
import { useAssets } from "../../hooks/use-assets-manager"
import Viewer from '../../../shared/THREE/environmentViewer'
import { SHOT_LAYERS } from "../../utils/ShotLayers"
import path from 'path'

const EnvironmentViewer = React.memo(({ background, storyboarderFilePath, visible, rotation }) => { 

    const ref = useUpdate(
        self => {
          self.layers.enable(SHOT_LAYERS) 
          self.traverse(child => child.layers.enable(SHOT_LAYERS))
        }
    )

    const pathEnvironment = useMemo(() => (
        !background.length ? [] : background.map(file => path.join(path.dirname(storyboarderFilePath), '/', file))
    ),[background, storyboarderFilePath])

    const { assets, loaded } = useAssets( pathEnvironment )

    const cubeMaps = useMemo(() => (
        ((assets.length > 1) && loaded && pathEnvironment.length) ? assets : undefined
    ),[assets,loaded,pathEnvironment])

    const sphereMap = useMemo(() => (
        ((assets.length == 1) && loaded && pathEnvironment.length) ? assets[0] : undefined
    ),[assets,loaded,pathEnvironment]) 

    const rotateEnvironmet = useMemo(() => [rotation.x,rotation.z,rotation.y],[rotation])

    useFrame(({camera})=>{
        if (ref.current) ref.current.position.copy(camera.position)
    })

    return(
        <group 
            visible={visible}
            ref={ref}
            rotation={rotateEnvironmet}
        >
            <Viewer sphereMap={sphereMap} cubeMaps={cubeMaps}/>
        </group>
    )
}) 

export default EnvironmentViewer
