import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useUpdate } from 'react-three-fiber'
import { SHOT_LAYERS } from '../../utils/ShotLayers'
import { useAssets } from '../../hooks/use-assets-manager'
class LAYERS_STATUS {
    static AVAIBLE = "Avaible"
    static USED = "INUSE"
}

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

const layers = []
class LayersPool  {
    constructor() {
        this.plane = new THREE.PlaneBufferGeometry(1, 1)
    }
    // Returning layers
    getLayers( amount, { texture, color, opacity } ) {
        let textureLayers = this.getLayersUsedByTexture(texture)
        let returnLayers = [...textureLayers]
        // Checks if requested amount less than used
        if( textureLayers.length > amount ) {
            // Release/Removes exceeding amount of layers which is used by texture
            for( let i = textureLayers.length - 1; i > amount - 1; i-- ) {
                textureLayers[i].status = LAYERS_STATUS.AVAIBLE
                textureLayers[i].id = null
                if(textureLayers[i].mesh.parent) textureLayers[i].mesh.parent.remove(textureLayers[i].mesh)
                returnLayers = textureLayers.splice(i, 1)
            }
        } else 
        // Checks if amount bigger than used
        if( textureLayers.length < amount ) {
            let avaibleLayers = this.getAvaibleLayers()
            let neededLayersAmount = amount - textureLayers.length 
            let material    
            // Checks if layer one exists and it's have the material
            if ( returnLayers[0] && returnLayers[0].material) {
                material = returnLayers[0].material
            } else {
                // Creates new material
                material = initializeMaterial(color, opacity, texture)
            }        
            
            // Checks if there're enough avaible layers to satisfy amount
            if( avaibleLayers.length > neededLayersAmount ) {
                for( let i = 0; i < neededLayersAmount - 1; i++ ) {
                    returnLayers.push(avaibleLayers[i])
                    avaibleLayers[i].status = LAYERS_STATUS.INUSE
                    avaibleLayers[i].id = texture.uuid
                    avaibleLayers[i].mesh.material = material
                }
            } else {
                // Checks if there're any avaible layers
                if( avaibleLayers.length ) {
                    // Counts how many layers from avaible we can use
                    neededLayersAmount -= avaibleLayers.length
                    // Uses all avaible layers for texture
                    for( let i = 0; i < avaibleLayers.lenght - 1; i++ ) {
                        returnLayers.push(avaibleLayers[i])
                        avaibleLayers[i].status = LAYERS_STATUS.INUSE
                        avaibleLayers[i].id = texture.uuid
                        avaibleLayers[i].mesh.material = material
                    }
                }
                
                // Creates all requested layers ...
                for( let i = 0; i < neededLayersAmount - 1; i++ ) {        
                    let planeMesh = new THREE.Mesh(this.plane, material)
                    layers.push( { id: texture.uuid, mesh: planeMesh, status: LAYERS_STATUS.INUSE } )
                    returnLayers.push( layers[layers.length - 1] )
                }
            }
        }
        return returnLayers.map(o => o.mesh)
    }

    // Releases layers by unbinding them from texture and setting their status to avaible
    releaseLayers(textures) {
        let layersToClean = this.getLayersToCleanUp(textures)
        for( let i = 0; i < layersToClean.length; i++ ) {
            if(layersToClean[i].mesh.parent) layersToClean[i].mesh.parent.remove(layersToClean[i].mesh)
            layersToClean[i].mesh.material = null
            layersToClean[i].status = LAYERS_STATUS.AVAIBLE
            layersToClean[i].id = null
        }
    }

    getLayersToCleanUp(textures) {
        return layers.filter((layer) => !textures.some((texture) => texture.uuid === layer.id))
    }

    getLayersUsedByTexture( texture ) {
         return layers.filter(layer => layer.id === texture.uuid)
    }

    getAvaibleLayers() {
        return layers.filter(layer => layer.status === LAYERS_STATUS.AVAIBLE)
    }
}

const Volume = React.memo(({numberOfLayers, sceneObject, imagesPaths}) => {
    
    const {assets: textures, loaded: texturesReady} = useAssets(imagesPaths)

    
    const ref = useUpdate(
        self => {
          self.traverse(child => child.layers.enable(SHOT_LAYERS))
        }
      )
    const layersPool = useRef(new LayersPool())
    const group = useRef(new THREE.Group())

    useEffect(() => {
        if(!texturesReady) return 
        
        while(group.current.children.length > 0) {
            group.current.remove(group.current.children[0])
        }
        
        layersPool.current.releaseLayers(textures)
        for(let i = 0; i < textures.length; i++) {
            let layers = layersPool.current.getLayers(numberOfLayers, {texture: textures[i], color:sceneObject.color, opacity:sceneObject.opacity})
            for (var j = 0; j < layers.length; j++) {
                let layer = layers[j]
                layer.material.opacity = sceneObject.opacity
                layer.position.z = sceneObject.depth / numberOfLayers * (numberOfLayers - 2 * j) / 2 - sceneObject.depth / numberOfLayers / 2
                layer.position.y = 1 / 2
                group.current.add(layer)
              }
        }
    }, [texturesReady, textures, numberOfLayers])


    useEffect(() => {
        if (group.current.children.length) {
          let c = 0xFF * sceneObject.color / 0xFFFFFF
          let color = (c << 16) | (c << 8) | c
          for (let i = 0; i < group.current.children.length; i++) {
              group.current.children[i].material.opacity = sceneObject.opacity
              group.current.children[i].material.color = new THREE.Color(color)
              group.current.children[i].material.needsUpdate = true
          }
        }
    }, [sceneObject.opacity, sceneObject.color])

    const {x, y, z, rotation, width, height, visible, locked, blocked } = sceneObject
    return <group 
        ref={ ref }
        position={ [x, z, y] }
        visible={ visible }
        rotation={ [0, rotation, 0] }
        scale={ [width, height, 1] }
        userData={{
            type: "volume",
            id: sceneObject,
            locked: locked,
            blocked: blocked
        }}
    >
        <primitive object={group.current}/>
    </group>
})

export default Volume
