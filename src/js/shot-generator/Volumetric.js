const THREE = require('three')
window.THREE = window.THREE || THREE

const React = require('react')
const { useRef, useEffect, useState } = React

const loadingManager = new THREE.LoadingManager()
const textureLoader = new THREE.TextureLoader()

const imgArray = [
    'img/shot-generator/volume-textures/rain2.jpg',
    'img/shot-generator/volume-textures/rain1.jpg',
    'img/shot-generator/volume-textures/fog1.jpg',
    'img/shot-generator/volume-textures/fog2.jpg',
    
    
    'img/shot-generator/volume-textures/debris.jpg',
    'img/shot-generator/volume-textures/explosion.jpg',
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

    ...props
}) => {

    const volume = useRef(null)

    const loadTexturePromise = (link) => {
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
                resolve(volumeMaterial)
            })
        })
    }

    const doCleanup = () => {
        if (volume.current) {
            console.log(type, id, 'remove')
            scene.remove(volume.current)
            volume.current = null
        }
    }

    if (volume.current === null) {
        //first time, creating
        console.log('create!')
        let volumeContainer = new THREE.Object3D()
        const promises = imgArray.map(link => loadTexturePromise(link))
        Promise.all(promises).then((materials) => {
            for (var i = 0; i < numberOfLayers; i++) {
                let plane = new THREE.PlaneBufferGeometry(5, 5)
                let planeMesh = new THREE.Mesh(plane, materials[i])
                //planeMesh.rotation.z = -Math.PI
                planeMesh.position.z = distanceBetweenLayers * (numberOfLayers - 2 * i) / 2
                planeMesh.position.y = 2.5
                volumeContainer.add(planeMesh)                
            } 
            volume.current = volumeContainer
            scene.add(volume.current)
        })
       
    }

    return null
})

module.exports = Volumetric