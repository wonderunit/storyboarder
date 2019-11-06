const THREE = require('three')
const TWEEN = require('@tweenjs/tween.js')

const { useMemo, useEffect } = React = require('react')
const { useUpdate } = require('react-three-fiber')

const getFilepathForModelByType = require('../helpers/get-filepath-for-model-by-type')

const traverseMeshMaterials = require('../helpers/traverse-mesh-materials')

const VirtualCamera = require('../components/VirtualCamera')

const transitionTime = require('../../../utils/transitionTime')

// old material
// const materialFactory = () => new THREE.MeshLambertMaterial({
//   color: 0xcccccc,
//   emissive: 0x0,
//   flatShading: false
// })

const materialFactory = () => new THREE.MeshToonMaterial({
  color: 0xcccccc,
  emissive: 0x0,
  specular: 0x0,
  reflectivity: 0x0,
  skinning: false,
  shininess: 0,
  flatShading: false,
  morphNormals: false,
  morphTargets: false
})

const meshFactory = source => {
  let mesh = source.clone()

  let material = materialFactory()

  if (mesh.material.map) {
    material.map = mesh.material.map
    material.map.needsUpdate = true
  }
  mesh.material = material

  return mesh
}

const ModelObject = React.memo(({ gltf, sceneObject, isSelected, children }) => {
  const ref = useUpdate(
    self => {
      self.traverse(child => child.layers.enable(VirtualCamera.VIRTUAL_CAMERA_LAYER))
    }
  )

  const meshes = useMemo(() => {
    if (sceneObject.model === 'box') {
      return [
        <mesh key={sceneObject.id}>
          <boxBufferGeometry
            ref={ref => ref && ref.translate(0, 0.5, 0)}
            attach='geometry'
            args={[1, 1, 1]} />
          <primitive
            attach='material'
            object={materialFactory()} />
        </mesh>
      ]
    }

    if (gltf) {
      let children = []
      gltf.scene.traverse(child => {
        if (child.isMesh) {
          children.push(
            <primitive
              key={`${sceneObject.id}-${child.uuid}`}
              object={meshFactory(child)}
            />
          )
        }
      })
      return children
    }

    return []
  }, [sceneObject.model, gltf])
  
  useEffect(() => {
    traverseMeshMaterials(ref.current, material => {
      if (material.emissive) {
        if (isSelected) {
          material.emissive = new THREE.Color( 0x755bf9 )
          material.color = new THREE.Color( 0x222222 )
        } else {
          material.emissive = new THREE.Color( sceneObject.tintColor || '#000000' )
          material.color = new THREE.Color( 0xcccccc )
        }
      }
    })
  }, [ref.current, isSelected, sceneObject.tintColor])
  
  let tween
  
  useEffect(() => {
    if (tween) {
      tween.stop()
    }
    
    if (sceneObject.remoteUpdate) {
      tween = new TWEEN.Tween([
        ref.current.position.x,
        ref.current.position.y,
        ref.current.position.z,
        ref.current.rotation.x,
        ref.current.rotation.y,
        ref.current.rotation.z
      ])
      
      tween.to([
        sceneObject.x,
        sceneObject.z,
        sceneObject.y,
        sceneObject.rotation.x,
        sceneObject.rotation.y,
        sceneObject.rotation.z
      ], transitionTime(ref.current.position, sceneObject))
      
      tween.onUpdate(([x, y, z, rx, ry, rz]) => {
        ref.current.position.set(x, y, z)
        ref.current.rotation.set(rx, ry, rz)
      })
      
      tween.start()
    } else {
      ref.current.position.set(sceneObject.x, sceneObject.z, sceneObject.y)
      ref.current.rotation.set(sceneObject.rotation.x, sceneObject.rotation.y, sceneObject.rotation.z)
    }
  }, [
    ref.current,
    sceneObject.x, sceneObject.y, sceneObject.z,
    sceneObject.rotation.x, sceneObject.rotation.y, sceneObject.rotation.z
  ])
  
  const { x, y, z, visible, width, height, depth, rotation } = sceneObject
  const currentPos = {x, y: z, z: y}
  const currentRot = {x: rotation.x, y: rotation.y, z: rotation.z}
  
  if (ref.current) {
    currentPos.x = ref.current.position.x
    currentPos.y = ref.current.position.y
    currentPos.z = ref.current.position.z
    currentRot.x = ref.current.rotation.x
    currentRot.y = ref.current.rotation.y
    currentRot.z = ref.current.rotation.z
  }

  return <group
    ref={ref}

    onController={sceneObject.visible ? () => null : null}
    userData={{
      type: 'object',
      id: sceneObject.id
    }}

    visible={visible}
    position={[currentPos.x, currentPos.y, currentPos.z]}
    scale={[width, height, depth]}
    rotation={[currentRot.x, currentRot.y, currentRot.z]}
  >
    {meshes}
    {children}
  </group>
})

module.exports = ModelObject
