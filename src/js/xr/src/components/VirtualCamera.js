const THREE = require('three')
const { useMemo, useRef } = React = require('react')
const useGltf = require('../hooks/use-gltf')

const materialFactory = () => new THREE.MeshLambertMaterial({
  color: 0xcccccc,
  emissive: 0x0,
  flatShading: false
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

const VirtualCamera = React.memo(({ sceneObject, isSelected  }) => {

    const filepath = useMemo(
      () => `/data/system/objects/camera.glb`,
      [sceneObject]
    )
    const gltf = useGltf(filepath)
    const ref = useRef(null);
    //const [camSliderFOV, setCamSliderFOV] = useState(null)
    const aspectRatio = 1;
    const size = 1 / 3
    console.log(sceneObject);

    const mesh = useMemo(() => {
      if (gltf) {
        let children = []
        gltf.scene.traverse(child => {
          if (child.isMesh) {
            children.push(
              <primitive
                key={sceneObject.id}
                object={meshFactory(child)}
              />
            )
          }
        })
        return children
      }
  
      return []
    }, [gltf])

/*     const heightShader = useMemo(
        () => new THREE.MeshBasicMaterial({
          map: renderTarget.current,
          side: THREE.FrontSide,
        }),
        [renderTarget.current]
      ) */

    const cameraView = useMemo(() =>
    {
        return <group>
{/*             <mesh
              userData={{ type: 'view' }}
              position={[0, 0.3, 0]}
              material={heightShader}
            >
              <planeGeometry attach="geometry" args={[size * aspectRatio, size]} />
            </mesh> */}
            <mesh
              position={[(size * aspectRatio + 0.009) * -0.5, 0.3, 0]}
              material={new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0x7a72e9, opacity: 0.5, transparent: true })}
            >
              <planeGeometry attach="geometry" args={[ 0.009, size]} />
            </mesh>
            <mesh
              position={[(size * aspectRatio + 0.009) * 0.5, 0.3, 0]}
              material={new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0x7a72e9, opacity: 0.5, transparent: true })}
            >
              <planeGeometry attach="geometry" args={[0.009, size]} />
            </mesh>
            <mesh
              position={[0, 0.3 + (size +  0.009) * -0.5, 0]}
              material={new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0x7a72e9, opacity: 0.5, transparent: true })}
            >
              <planeGeometry
                attach="geometry"
                args={[size * aspectRatio + ( 0.009) * 2, 0.009]}
              />
            </mesh>
            <mesh
                position={[0, ( 0.3) + (size + (0.009)) * 0.5, 0]}
                material={new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0x7a72e9, opacity: 0.5, transparent: true })}
                >
                <planeGeometry
                 attach="geometry"
                 args={[size * aspectRatio + (0.009) * 2, 0.009]}
                />
            </mesh>
        </group>
    }, true);
    

    return <group
        ref = {ref}
        onController={sceneObject.visible ? () => null : null}
        userData={{
          type: 'virtual-camera',
          id: sceneObject.id
        }}

        position={[sceneObject.x, sceneObject.z, sceneObject.y]}
        rotation={[sceneObject.tilt, sceneObject.rotation, sceneObject.roll]}
        >   
        {cameraView}
        {mesh}
        </group>
})
module.exports = VirtualCamera;
