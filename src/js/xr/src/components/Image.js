const { useUpdate } = require('react-three-fiber')

const Image = React.memo(({ sceneObject, isSelected }) => {
  const ref = useUpdate(self => console.log())

  const { x, y, z, visible, width, height, rotation } = sceneObject

  return (
    <mesh
      ref={ref}
      
      onController={sceneObject.visible ? () => null : null}
      userData={{
        id: sceneObject.id,
        type: 'image'
      }}

      visible={visible}
      position={[x, z, y]}
      scale={[width, height, 1]}
      rotation={[rotation.x, rotation.y, rotation.z]}
    >
      <boxBufferGeometry attach='geometry' args={[1, 1, 0.01]} />
      <meshToonMaterial attach='material' side={THREE.FrontSide}></meshToonMaterial>
    </mesh>
  )
})

module.exports = Image
