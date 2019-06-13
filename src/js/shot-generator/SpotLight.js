const THREE = require('three')

const React = require('react')
const { useRef, useEffect, useState } = React

const IconSprites = require('./IconSprites')


const SpotLight = React.memo(({ scene, id, type, setLight, icon, ...props }) => {
  
  let light = useRef(null)

  if (light.current)
  {

  } else {
    let box_light_geom = new THREE.CylinderBufferGeometry(0.00,0.05,0.14)
    let box_light_material = new THREE.MeshBasicMaterial({
      color: 0xFFFF66,
    })

    let box_light_mesh = new THREE.Mesh(box_light_geom, box_light_material)
    let light_spot = new THREE.SpotLight(0xffffff, props.intensity)

    light_spot.target.position.set( 0, 0, props.intensity );
    light_spot.position.set( 0, 0, 0 );
    light_spot.add( light_spot.target );
    light_spot.rotation.set(Math.PI/2, 0, 0)
    light_spot.angle = props.angle
    light_spot.distance = props.distance
    light_spot.penumbra = props.penumbra
    light_spot.decay = props.decay
        
    let lightContainer = new THREE.Object3D()
    lightContainer.add(light_spot)
    lightContainer.add(box_light_mesh)
    box_light_mesh.name = 'hitter_light'

    box_light_mesh.userData.type = 'hitter_light'
    lightContainer.light = light_spot
    lightContainer.hitter = box_light_mesh

    box_light_mesh.layers.disable(0)
    box_light_mesh.layers.enable(1)
    box_light_mesh.layers.disable(2)

    light.current = lightContainer
    light.current.userData.id = id
    light.current.userData.type = type

    light.current.position.x = props.x
    light.current.position.y = props.z
    light.current.position.z = props.y
    light.current.rotation.x = 0
    light.current.rotation.z = 0
    light.current.rotation.y = props.rotation
    light.current.rotation.x = (props.tilt)

    light.current.orthoIcon = new IconSprites( type, props.name ? props.name : props.displayName, light.current )
    

    light.current.light.updateMatrixWorld()
  }

  useEffect(() => {

    console.log(type, id, 'added')
    scene.add(light.current)
    scene.add( light.current.orthoIcon )

    return function cleanup () {
      console.log(type, id, 'removed')
      scene.remove(light.current.orthoIcon)
      scene.remove(light.current)
      // setCamera(null)
    }

  }, [])

  useEffect(() => {
    if (light.current) {
      light.current.position.x = props.x
      light.current.position.z = props.y
      light.current.position.y = props.z
      light.current.rotation.x = 0
      light.current.rotation.z = 0
      light.current.rotation.y = props.rotation
      light.current.rotateX(props.tilt)
      light.current.visible = props.visible
      let addRotation = props.tilt>=0 ? 0 : Math.PI
      light.current.orthoIcon.position.copy(light.current.position)
      light.current.orthoIcon.icon.material.rotation = props.rotation + addRotation
      light.current.orthoIcon.visible = props.visible
    }
  }, [props.x, props.y, props.z, props.rotation, props.tilt, props.visible])

  useEffect(() => {
    if (light.current) {
      light.current.light.target.position.set(0,0,props.distance)
      light.current.light.angle = props.angle
      light.current.light.distance = props.distance
      light.current.light.intensity = props.intensity
    }
  }, [props.intensity, props.angle, props.distance])

  useEffect(() => {
    if (light.current) {
      light.current.orthoIcon.changeFirstText(props.name ? props.name : props.displayName)
    }
  }, [props.displayName, props.name])

  useEffect(() => {
    if (light.current) {
      light.current.light.penumbra = props.penumbra
      light.current.light.decay = props.decay
    }
  }, [props.penumbra, props.decay])

  useEffect(() => {
    light.current.orthoIcon.setSelected(props.isSelected)
  }, [props.isSelected])

  return null
})

module.exports = SpotLight
