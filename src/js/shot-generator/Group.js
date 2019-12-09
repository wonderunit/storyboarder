const THREE = require('three')
window.THREE = window.THREE || THREE

const React = require('react')
const { useRef, useEffect } = React

const Group = React.memo(({ scene, id, type, ...props }) => {

  const container = useRef()

  useEffect(() => {
    console.log(type, id, 'added')

    container.current = new THREE.Group()
    container.current.userData.id = id
    container.current.userData.type = type
    container.current.userData.children = props.children
    
    scene.add(container.current)

    return function cleanup () {
      console.log(type, id, 'removed from scene')
      
      scene.remove(container.current)
    }
  }, [])

  return null
})

module.exports = Group
