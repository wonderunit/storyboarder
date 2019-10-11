const Image = React.memo(({ sceneObject, isSelected }) => {

  return (
    <group
      onController={sceneObject.visible ? () => null : null}
      visible={sceneObject.visible}
      userData={{
        id: sceneObject.id,
        type: 'image'
      }}
      position={[sceneObject.x, sceneObject.z, sceneObject.y]}
    >
    </group>
  )
})

module.exports = Image
