import { useUpdate } from 'react-three-fiber'
import React, { useMemo, useRef, useEffect } from 'react'


const Light = React.memo(({ gltf, sceneObject, isSelected, children }) => {
  const mesh = useMemo(() => gltf.scene.children[0].clone(), [gltf])

  const spotLight = useRef()
  const ref = useUpdate(self => {
    self.rotation.x = 0
    self.rotation.z = 0
    self.rotation.y = sceneObject.rotation || 0
    self.rotateX(sceneObject.tilt || 0)
    self.rotateZ(sceneObject.roll || 0)
  }, [sceneObject.rotation, sceneObject.tilt, sceneObject.roll])


  let lightColor = 0x8c78f1

  if (isSelected) {
    lightColor = 0x7256ff
  }

  return (
    <group
      ref={ref}
      onController={sceneObject.visible ? () => null : null}
      visible={sceneObject.visible}
      userData={{
        id: sceneObject.id,
        type: 'light'
      }}
      position={[sceneObject.x, sceneObject.z, sceneObject.y]}
    >
      <primitive
        object={mesh}
        rotation={[-Math.PI/2, Math.PI, 0]}
        userData={{ 
          type: "light",
        }}
      >
        <meshBasicMaterial
          attach="material"
          color={lightColor}
          flatShading={false}
        />
      </primitive>

      <spotLight
        ref={spotLight}
        color={0xffffff}
        intensity={sceneObject.intensity}
        position={[0, 0, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        angle={sceneObject.angle}
        distance={sceneObject.distance}
        penumbra={sceneObject.penumbra}
        decay={sceneObject.decay}
      />

      {children}
    </group>
  )
})

export default Light