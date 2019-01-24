const THREE = require('three')

const React = require('react')
const { useRef, useEffect, useState } = React

const Light = React.memo(({ scene, id, type, setLight, ...props }) => {
  let light = useRef(null)

  if (light.current)
  {

  } else {
    let box_light_geom = new THREE.CylinderBufferGeometry(0.00,0.05,0.14)
    let box_light_material = new THREE.MeshBasicMaterial({
      color: 0xFFFF66,
    })

    let box_light_mesh = new THREE.Mesh(box_light_geom, box_light_material)
    let light_directional = new THREE.DirectionalLight(0xffffff, props.intensity)
    //light_directional.add(box_light_mesh)

    light_directional.target.position.set( 0, 0, props.intensity );
    light_directional.position.set( 0, 0, 0 );
    light_directional.add( light_directional.target );
    light_directional.rotation.set(Math.PI/2, 0, 0)

    let lightContainer = new THREE.Object3D()
    lightContainer.add(light_directional)
    lightContainer.add(box_light_mesh)
    box_light_mesh.name = 'hitter_light'

    box_light_mesh.userData.type = 'hitter_light'
    lightContainer.light = light_directional
    lightContainer.hitter = box_light_mesh


    var helper = new THREE.DirectionalLightHelper( light_directional, 0.14 );
    //helper.matrixAutoUpdate = true
    //scene.add( helper );
    lightContainer.helper = helper
    //light_directional.position.y = - props.z/2

    //let light = useRef( lightContainer )
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
    light.current.light.updateMatrixWorld()
  }

  useEffect(() => {

    console.log(type, id, 'added')
    scene.add(light.current)

    return function cleanup () {
      console.log(type, id, 'removed')
      scene.remove(light.current.helper)
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
    }
  }, [props.x, props.y, props.z, props.rotation, props.tilt, props.visible])

  useEffect(() => {
    if (light.current) {
      light.current.light.target.position.set(0,0,props.intensity)
      light.current.light.target.updateMatrix()
      light.current.helper = new THREE.DirectionalLightHelper( light.current.light, 0.14 );
      light.current.light.intensity = props.intensity
    }
  }, [props.intensity])

  return null
})

module.exports = Light
