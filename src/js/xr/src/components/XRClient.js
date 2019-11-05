const THREE = require('three')
const TWEEN = require('@tweenjs/tween.js')

const { useMemo, useEffect, useRef } = React = require('react')
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

const XRClient = React.memo(({ controllerGltf, headsetGltf, sceneObject, isSelected, children }) => {
  
  const ref = useRef()
  
  const headRef = useRef()
  const control1Ref = useRef()
  const control2Ref = useRef()
  
  const head = new THREE.Object3D()
  const control1 = new THREE.Object3D()
  const control2 = new THREE.Object3D()
  
  const headMeshes = useMemo(() => {
    if (headsetGltf) {
      let res = []
      headsetGltf.scene.traverse(child => {
        if (child.isMesh) {
          let meshCopy = meshFactory(child)
          meshCopy.rotation.y = Math.PI
          res.push(
              <primitive
                  key={`${sceneObject.id}-head-${child.uuid}`}
                  object={meshCopy}
              />
          )
        }
      })
    
      return res
    }
  
    return []
  }, [headsetGltf])
  
  const controllerMeshes = useMemo(() => {
    if (controllerGltf) {
      let res = {left: [], right: []}
      controllerGltf.scene.traverse(child => {
        if (child.isMesh) {
          res.left.push(
              <primitive
                  key={`${sceneObject.id}-control1-${child.uuid}`}
                  object={meshFactory(child)}
              />
          )
          res.right.push(
              <primitive
                  key={`${sceneObject.id}-control2-${child.uuid}`}
                  object={meshFactory(child)}
              />
          )
        }
      })
      
      return res
    }
    
    return {left: [], right: []}
  }, [controllerGltf])
  
  useEffect(() => {
    traverseMeshMaterials(ref.current, material => {
      if (material.emissive) {
        material.emissive = new THREE.Color( 0x000000 )
        material.color = new THREE.Color( 0xcccccc )
      }
    })
  }, [ref.current, isSelected, sceneObject.tintColor])
  
  let tween, headData, control1Data, control2Data
  
  let headRotation0 = new THREE.Quaternion()
  let control1Rotation0 = new THREE.Quaternion()
  let control2Rotation0 = new THREE.Quaternion()
  
  let headRotation1 = new THREE.Quaternion()
  let control1Rotation1 = new THREE.Quaternion()
  let control2Rotation1 = new THREE.Quaternion()
  
  useEffect(() => {
    if (sceneObject.xrClientParts) {
      if (head && control1 && control2) {
        if (tween) {
          tween.stop()
        }
  
        headData = sceneObject.xrClientParts.head
        control1Data = sceneObject.xrClientParts.controls[0]
        control2Data = sceneObject.xrClientParts.controls[1]
  
        headRotation0.copy(headRef.current.quaternion)
        control1Rotation0.copy(control1Ref.current.quaternion)
        control2Rotation0.copy(control2Ref.current.quaternion)
  
        headRotation1.set(headData.rotation._x, headData.rotation._y, headData.rotation._z, headData.rotation._w)
        control1Rotation1.set(control1Data.rotation._x, control1Data.rotation._y, control1Data.rotation._z, control1Data.rotation._w)
        control2Rotation1.set(control2Data.rotation._x, control2Data.rotation._y, control2Data.rotation._z, control2Data.rotation._w)
        
        tween = new TWEEN.Tween([
          headRef.current.position.x, headRef.current.position.y, headRef.current.position.z,
          control1Ref.current.position.x, control1Ref.current.position.y, control1Ref.current.position.z,
          control2Ref.current.position.x, control2Ref.current.position.y, control2Ref.current.position.z,
          0
        ])
        
        tween.to([
          headData.position.x, headData.position.y, headData.position.z,
          control1Data.position.x, control1Data.position.y, control1Data.position.z,
          control2Data.position.x, control2Data.position.y, control2Data.position.z,
          1
        ], 200)
        
        tween.onUpdate(([hx, hy, hz, c1x, c1y, c1z, c2x, c2y, c2z, deltaTime]) => {
          if (headRef.current) {
            headRef.current.position.set(hx, hy, hz)
            THREE.Quaternion.slerp(
                headRotation0,
                headRotation1,
                headRef.current.quaternion,
                deltaTime
            )
          }
  
          if (control1Ref.current) {
            control1Ref.current.position.set(c1x, c1y, c1z)
            THREE.Quaternion.slerp(
                control1Rotation0,
                control1Rotation1,
                control1Ref.current.quaternion,
                deltaTime
            )
          }
  
          if (control2Ref.current) {
            control2Ref.current.position.set(c2x, c2y, c2z)
            THREE.Quaternion.slerp(
                control2Rotation0,
                control2Rotation1,
                control2Ref.current.quaternion,
                deltaTime
            )
          }
        })
        
        tween.start()
      }
    }
  }, [sceneObject.xrClientParts])
  
  return <group
    ref={ref}
    onController={sceneObject.visible ? () => null : null}
    userData={{
      type: 'xrclient',
      id: sceneObject.id
    }}

    visible={sceneObject.visible}
  >
    <group ref={headRef}>{headMeshes}</group>
    <group ref={control1Ref}>{controllerMeshes.left}</group>
    <group ref={control2Ref}>{controllerMeshes.right}</group>
    {children}
  </group>
})

module.exports = XRClient
