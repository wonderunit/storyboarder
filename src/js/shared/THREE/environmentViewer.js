
import React, { useMemo } from 'react'
import * as THREE from 'three'

const PanoramaViewer = React.memo(({asset, visible, textureSettings}) => {

    return (
        <group
            visible = {visible}
        >
            <mesh
                renderOrder={-9999}
             >
                <sphereGeometry 
                    args={[720,64,32]} 
                    attach="geometry"
                />
                <meshBasicMaterial 
                    attach="material" 
                    map={asset} 
                    onUpdate={ self => self.needsUpdate = true }
                    {...textureSettings}
                >
                </meshBasicMaterial>
            </mesh>
        </group>
    )
})


const CubeTexturesViewer = React.memo(({asset, visible, textureSettings}) => {

    const materials = useMemo(()=>{

        const materials = []

        for (let i=0;i<6;i++){
            materials.push(new THREE.MeshBasicMaterial({...textureSettings}))
        }

        return materials
    },[])

    useMemo(()=>{

        const pattern = ['px','nx','py', 'ny', 'pz','nz']
        const sortAssets = asset ? asset.sort((a,b)=> pattern.indexOf(a.name) - pattern.indexOf(b.name)) : null

        if (sortAssets) {
            for (let i=0;i<materials.length; i++) {
                materials[i].map = sortAssets[i] 
                materials[i].needsUpdate = true
            }
        }
    },[asset])

    return (
       <group 
            visible={visible}
        >
            <mesh 
                renderOrder={-9999}
                material={materials}
            >
                <boxGeometry 
                    attach="geometry"
                    args={[720,720,720]} 
                />
            </mesh>
        </group>
    )
})

const Viewer = React.memo(({cubeMaps, sphereMap}) => {

    const textureSettings = useMemo(()=>({
            side: THREE.BackSide,
            fog:false,
            depthWrite: false,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter
    }),[])

    return (
        <>
            <CubeTexturesViewer 
                asset = {cubeMaps} 
                visible = {Boolean(cubeMaps)}
                textureSettings = {textureSettings}
            />
            <PanoramaViewer 
                asset = {sphereMap}
                visible = {Boolean(sphereMap)}
                textureSettings = {textureSettings}
            />
        </>
    )

})

export default Viewer 

