import React, { useRef, useMemo, useEffect } from 'react'

const initializeMaterial = (color, opacity, texture) => {
    let c = 0xFF * color / 0xFFFFFF
    let dexcolor = (c << 16) | (c << 8) | c
    let volumeMaterial = new THREE.MeshBasicMaterial({
      depthWrite: false,
      transparent: true,
      color: new THREE.Color(dexcolor),
      opacity: opacity,
      alphaMap: texture,
      side: THREE.DoubleSide
    })
    return volumeMaterial
} 
const Volume = React.memo(({textures, numberOfLayers, sceneObject}) => {
    const ref = useRef()

    const meshes = useMemo(() => {
        if(!textures || !textures.length) return []
        let meshes = []
        for(let i = 0; i < textures.length; i++) {
            console.log(textures[i])
            let material = initializeMaterial(sceneObject.color, sceneObject.opacity, textures[i])
            for (var j = 0; j < numberOfLayers; j++) {
                let plane = new THREE.PlaneBufferGeometry(1, 1)
                let planeMesh = new THREE.Mesh(plane, material)
                planeMesh.material.opacity = sceneObject.opacity
                planeMesh.position.z = sceneObject.depth / numberOfLayers * (numberOfLayers - 2 * j) / 2 - sceneObject.depth / numberOfLayers / 2
                planeMesh.position.y = 1 / 2
                meshes.push( <primitive
                    key={ planeMesh.uuid }
                    object={ planeMesh }
                    userData={{type:'volume'}}
                  />)
          
                //planeMesh.layers.disable(0)
                //planeMesh.layers.enable(1)
                //planeMesh.layers.disable(2)
                //planeMesh.layers.enable(3)
              }
        }
        return meshes
    }, [textures.length])


    useEffect(() => {
        if (meshes.length) {
          let c = 0xFF * sceneObject.color / 0xFFFFFF
          let color = (c << 16) | (c << 8) | c
          for (let i = 0; i < meshes.length; i++) {
            console.log( meshes[i])
            meshes[i].props.object.material.opacity = sceneObject.opacity
            meshes[i].props.object.material.color = new THREE.Color(color)
            meshes[i].props.object.material.needsUpdate = true
          }
        }
      }, [sceneObject.opacity, sceneObject.color])

    const {x, y, z, rotation, width, height } = sceneObject
    return <group 
        ref={ ref }
        position={ [x, z, y] }
        rotation={ [0, rotation, 0] }
        scale={ [width, height, 1] }
        userData={{
            type: "volume",
            id: sceneObject
        }}
    >
        { meshes }
    </group>
})

export default Volume