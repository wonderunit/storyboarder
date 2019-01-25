const THREE = require('three')

const React = require('react')
const { useRef, useEffect, useState } = React

const AmbientLight = React.memo(({ scene, id, type, setLight, ...props }) => {
  let ambientLight = useRef(null)
  console.log('current ambient light: ', ambientLight.current)
  if (ambientLight.current)
  {
    ambientLight.current.intensity = props.intensity
  } else {
    ambientLight.current = new THREE.AmbientLight(0xffffff, props.intensity)
    ambientLight.current.userData.id = id
    ambientLight.current.userData.type = type
    console.log('current ambient light: ', ambientLight.current)
    scene.add(ambientLight.current)
  }

  useEffect(() => {
    ambientLight.current.intensity = props.intensity
  }, [props.intensity])

  return null
})

module.exports = AmbientLight
