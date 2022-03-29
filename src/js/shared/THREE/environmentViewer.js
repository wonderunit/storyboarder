
import React, { useMemo, useCallback } from 'react'
import * as THREE from 'three'

const getCubeMapsFromCroosMap = (originalTexture, arrayOfTextureInstances) => {
    const canvas = document.createElement( 'canvas' )
    const ctx = canvas.getContext( '2d' )
    const img = originalTexture.image

    canvas.height = img.height 
    canvas.width = img.width 

    ctx.drawImage( img, 0, 0, img.width, img.height )

    const step = {
        x: img.width / 4,  // width one texture
        y: img.height / 3, // height one texture
    }

    const offests = [
        {
            x: 0,
            y: step.y,
            name: 'nx'
        },
        {
            x: step.x,
            y: 0,
            name: 'py'
        },
        {
            x: step.x,
            y: step.y,
            name: 'pz'
        },
        {
            x: step.x,
            y: 2 * step.y,
            name: 'ny'
        },
        {
            x: 2 * step.x,
            y: step.y,
            name: 'px'
        },
        {
            x: 3 * step.x,
            y: step.y,
            name: 'nz'
        }
    ]

    return (
        arrayOfTextureInstances.map((texture, i) => {
            texture.image = {
                data: ctx.getImageData(offests[i].x, offests[i].y, step.x, step.y).data,
                width: step.x,
                height: step.y
            }
            texture.name = offests[i].name
            texture.encoding = originalTexture.encoding
            texture.format = originalTexture.format
            texture.flipY = originalTexture.flipY
            texture.type = originalTexture.type
            texture.needsUpdate = true
            return texture
        })
    )
}

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

    const materials = useMemo(() => {

        const materials = []

        for (let i=0;i<6;i++){
            materials.push(new THREE.MeshBasicMaterial({...textureSettings}))
        }

        return materials
    },[])

    // create texture instances for cross-horizontal maps 
    const crossHorizontalMaps = useMemo(() => { 
        const maps = []
        for (let i = 0; i < 6; i++) {
            maps[i] = new THREE.DataTexture()
        }
        return maps
    } ,[])

    const getCubeMaps = useCallback(() => ( 
        !asset || asset.length !== 1 ? asset : getCubeMapsFromCroosMap(asset[0], crossHorizontalMaps)
    ),[asset, crossHorizontalMaps])

    useMemo(() => {

        const pattern = ['px', 'nx', 'py', 'ny', 'pz', 'nz']
        const asset = getCubeMaps()
        const sortAssets = asset ? asset.sort((a,b)=> pattern.indexOf(a.name) - pattern.indexOf(b.name)) : null

        if (sortAssets) {
            for (let i=0; i<materials.length; i++) {
                materials[i].map = sortAssets[i] 
                materials[i].needsUpdate = true
            }
        }

    },[getCubeMaps])

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

