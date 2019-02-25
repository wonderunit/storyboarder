const THREE = require('three')
window.THREE = window.THREE || THREE

const React = require('react')
const { useRef, useEffect, useState } = React

const loadingManager = new THREE.LoadingManager()
const textureLoader = new THREE.TextureLoader()

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

    const doCleanup = () => {
        if (volume.current) {
            console.log(type, id, 'remove')
            scene.remove(volume.current)
            volume.current = null
        }
    }

    if (volume.current !== null) {
        //first time, creating
        let volumeContainer = new THREE.Object3D()
        for (var i = 0; i < numberOfLayers; i++) {
            let plane = new THREE.PlaneBufferGeometry(1, 1)
            let planeMat = new THREE.MeshBasicMaterial({ color: '#888888' })
            let planeMesh = new THREE.Mesh(plane, planeMat)
            planeMesh.position.z = distanceBetweenLayers * (numberOfLayers - 2 * i) / 2
            volumeContainer.add(planeMesh)
        }
        volume.current = volumeContainer
        scene.add(volume.current)
        console.log('volume: ', volume.current)
    }

    return null
})

module.exports = Volumetric