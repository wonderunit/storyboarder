const THREE = require('three')

const React = require('react')
const { useRef, useEffect } = React

const SceneObject = React.memo(({ scene, id, type, objModels, isSelected, ...object }) => {
  let mesh = useRef(null)

  let boxRadius = .005
  let boxRadiusSegments = 5

  const update = () => {
    mesh.current.position.x = object.x
    mesh.current.position.z = object.y
    mesh.current.position.y = object.z
    mesh.current.rotation.y = object.rotation
    mesh.current.userData.id = id
    mesh.current.userData.type = type
    if (type === 'object' && object.model === 'box') {
      mesh.current.geometry = new RoundedBoxGeometry( object.width, object.height, object.depth, boxRadius, boxRadiusSegments )
      mesh.current.geometry.translate( 0, object.height / 2, 0 )
    }
    mesh.current.visible = object.visible
  }

  useEffect(() => {
    console.log(type, id, 'model changed', mesh.current, 'to', object.model)

    if (object.model === 'tree') {
      mesh.current = objModels.tree.clone()

    } else if (object.model === 'chair') {
      mesh.current = objModels.chair.clone()

    } else {
      geometry = new RoundedBoxGeometry( object.width, object.height, object.depth, boxRadius, boxRadiusSegments )
      //let material = new THREE.MeshBasicMaterial( { color: 0xcccccc, side: THREE.DoubleSide } )
      let material = new THREE.MeshToonMaterial( { color: 0xcccccc, side: THREE.DoubleSide } )

      mesh.current = new THREE.Mesh( geometry, material )
      geometry.translate( 0, object.height / 2, 0 )
    }

    update()

    console.log(type, id, 'added to scene')
    scene.add(mesh.current)

    return function cleanup () {
      console.log(type, id, 'removed from scene')
      scene.remove(mesh.current)
    }
  }, [object.model])

  useEffect(() => {
    console.log(type, id, 'update')
    update()
  }, [object.x, object.y, object.z, object.rotation, object.width, object.height, object.depth, object.visible])

  useEffect(() => {
    mesh.current.material.userData.outlineParameters =
      isSelected
        ? {
          thickness: 0.015,
          color: [ 0.7, 0.0, 0.0 ]
        }
       : {
         thickness: 0.008,
         color: [ 0, 0, 0 ],
       }
  }, [isSelected])

  return null
})

module.exports = SceneObject
