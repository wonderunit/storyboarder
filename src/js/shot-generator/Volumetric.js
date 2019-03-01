const THREE = require('three')
window.THREE = window.THREE || THREE

const React = require('react')
const { useRef, useEffect, useState } = React

const loadingManager = new THREE.LoadingManager()
const textureLoader = new THREE.TextureLoader()

const IconSprites = require('./IconSprites')


const imgArray = [
    
    
    
    
    
]

const Volumetric = React.memo(({
    scene,
    id,
    type,
    isSelected,
    camera,
    updateObject,
    numberOfLayers,
    distanceBetweenLayers,
    volumePresets,
    ...props
}) => {

    const volume = useRef(null)

    const loadMaterialPromise = (link) => {
        return new Promise((resolve, reject) => {
            textureLoader.load(link, (texture) => {
                let volumeMaterial = new THREE.MeshBasicMaterial( { 
                    depthWrite: false, 
                    transparent: true, 
                    color: 0xFFFFFF, 
                    opacity: 0.5, 
                    alphaMap: texture, 
                    side: THREE.DoubleSide
                })
                volumeMaterial.userData.outlineParameters = { thickness: 0, alpha: 0.0 }
                resolve(volumeMaterial)
            })
        })
    }

    const cleanup = () => {
        if (volume.current) {
            console.log(type, id, 'remove')

            scene.remove(volume.current.orthoIcon)
            scene.remove(volume.current)
            volume.current = null
        }
    }

    const create = () => {
        console.log('create!')
        let volumeContainer = new THREE.Object3D()
        volumeContainer.textureLayers = []
        let imgArray = volumePresets[props.effect]
        const promises = imgArray.map(link => loadMaterialPromise(link))
        Promise.all(promises).then((materials) => {
            for (var i = 0; i < numberOfLayers; i++) {
                let plane = new THREE.PlaneBufferGeometry(1,1)
                //let planeMesh = new THREE.Mesh(plane, materials[i % props.numberOfLayers])
                let planeMesh = new THREE.Mesh(plane, materials[i % materials.length])
                //planeMesh.rotation.z = -Math.PI
                planeMesh.position.z = props.depth / numberOfLayers * (numberOfLayers - 2 * i) / 2 - props.depth / numberOfLayers/2
                planeMesh.position.y = 1 / 2
                volumeContainer.add(planeMesh)
                volumeContainer.textureLayers.push(planeMesh) 
                
                planeMesh.layers.disable(0)
                planeMesh.layers.enable(1)
                planeMesh.layers.disable(2)
                planeMesh.layers.enable(3)
            }

            volumeContainer.scale.set(props.width, props.height, 1)
            volumeContainer.position.set(props.x, props.z, props.y)
            volumeContainer.rotation.y = props.rotation
            volume.current = volumeContainer

            volume.current.loadedMaterials = materials
            
            volume.current.userData.id = id
            volume.current.userData.type = type
            volume.current.userData.effect = props.effect
            volume.current.orthoIcon = new IconSprites( type, props.name ? props.name : props.displayName, volume.current )
            scene.add( volume.current.orthoIcon )
            scene.add( volume.current )
        })
    }

    useEffect(()=>{
        create()
        
        return cleanup
    }, [])

    useEffect(()=>{
        if (volume.current !== null) {
            volume.current.position.x = props.x
            volume.current.position.z = props.y
            volume.current.position.y = props.z

            volume.current.rotation.y = props.rotation
            volume.current.orthoIcon.position.copy(volume.current.position)
        }
    }, [props.x, props.y, props.z, props.rotation, props.scale])

    useEffect(() => {
        if (volume.current !== null) {
            let intLay = parseInt(numberOfLayers)
            volume.current.scale.set( props.width, props.height, 1)
            for (var i=0;i<volume.current.textureLayers.length;i++)
            {
                let plane = volume.current.textureLayers[i]
                plane.position.z = props.depth / intLay * (intLay - 2 * i) / 2 - props.depth / numberOfLayers/2
            }
        }
    }, [ props.width, props.height, props.depth, numberOfLayers ])

    useEffect(() => {
        if (numberOfLayers % 1 != 0) return
        let intLay = parseInt(numberOfLayers)

        if (volume.current !== null) {
            while (volume.current.children.length>0)
            {
                volume.current.remove(volume.current.children[0])
            }
            
            volume.current.textureLayers = []
            for (let i = 0; i < intLay; i++) {
                let plane = new THREE.PlaneBufferGeometry(1,1)
                let planeMesh = new THREE.Mesh(plane, volume.current.loadedMaterials[i % volume.current.loadedMaterials.length])
                planeMesh.position.z = props.depth / intLay * (intLay - 2 * i) / 2 - props.depth / numberOfLayers/2
                planeMesh.position.y = 1 / 2
                volume.current.add(planeMesh)
                volume.current.textureLayers.push(planeMesh) 
                
                planeMesh.layers.disable(0)
                planeMesh.layers.enable(1)
                planeMesh.layers.disable(2)
                planeMesh.layers.enable(3)
            }
        }

    }, [numberOfLayers])

    useEffect(()=>{

        if (volume.current) {
            scene.remove(volume.current.orthoIcon)
            scene.remove(volume.current)
            volume.current = null
            
            create()
        }
        
    },[props.effect])

    return null
})

module.exports = Volumetric