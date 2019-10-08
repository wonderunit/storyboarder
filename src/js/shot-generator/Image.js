const THREE = require('three')
window.THREE = window.THREE || THREE

const React = require('react')
const { useRef, useEffect, useState } = React

const IconSprites = require('./IconSprites')

const Image = React.memo(({scene, id, type, ...props}) => {

  let image = useRef(null)

  useEffect(() => {
    if (image.current) {
      image.current.orthoIcon.changeFirstText(props.name ? props.name : props.displayName)
    }
  }, [props.displayName, props.name])

  if (image.current) {
  } else {
    console.log(type, id, 'added')
    let geo = new THREE.PlaneBufferGeometry(1, 1)
    let mat = new THREE.MeshBasicMaterial({
      color: 0xffff66,
      side: THREE.DoubleSide
    })
    let mesh = new THREE.Mesh(geo, mat)

    let container = new THREE.Object3D()
    container.add(mesh)

    image.current = container
    image.current.userData.id = id
    image.current.userData.type = type

    image.current.orthoIcon = new IconSprites(type, props.name ? props.name : props.displayName, image.current)

    scene.add(image.current)
    scene.add(image.current.orthoIcon)
  }

  useEffect(() => {
    return function cleanup() {
      if (image.current) {
        console.log(type, id, 'removed')
        scene.remove(image.current.orthoIcon)
        scene.remove(image.current)
      }
    }
  }, [])

  useEffect(() => {
    image.current.position.x = props.x
    image.current.position.z = props.y
    image.current.position.y = props.z
    image.current.orthoIcon.position.copy(image.current.position)
  }, [
    props.x,
    props.y,
    props.z
  ])

  useEffect(() => {
    image.current.rotation.x = props.rotation.x
    image.current.rotation.y = props.rotation.y
    image.current.rotation.z = props.rotation.z
    image.current.orthoIcon.icon.material.rotation = props.rotation
  }, [
    props.rotation.x,
    props.rotation.y,
    props.rotation.z
  ])

  useEffect(() => {
    if (image.current) {
      image.current.visible = props.visible
      image.current.orthoIcon.visible = props.visible
    }
  }, [props.visible])


  return null
})

module.exports = Image
