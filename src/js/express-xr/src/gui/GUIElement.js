const { useMemo } = (React = require('react'))

const GUIElement = ({ ...props }) => {

  const roundedRect = (shape, x, y, width, height, radius) => {
    shape.moveTo(x, y + radius)
    shape.lineTo(x, y + height - radius)
    shape.quadraticCurveTo(x, y + height, x + radius, y + height)
    shape.lineTo(x + width - radius, y + height)
    shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius)
    shape.lineTo(x + width, y + radius)
    shape.quadraticCurveTo(x + width, y, x + width - radius, y)
    shape.lineTo(x + radius, y)
    shape.quadraticCurveTo(x, y, x, y + radius)
  }

  const gui_element = useMemo(() => {
    var roundedRectShape = new THREE.Shape()
    roundedRect(
      roundedRectShape,
      props.x || props.width * -0.5,
      props.y || props.height * -0.5,
      props.width,
      props.height,
      props.radius
    )
    return roundedRectShape
  }, [])

  return (
    <mesh
      name={props.name}
      userData={{ type: 'gui' }}
      geometry={new THREE.ShapeBufferGeometry(gui_element)}
      material={
        new THREE.MeshBasicMaterial({
          color: props.color,
          side: THREE.DoubleSide
        })
      }
    />
  )
}

module.exports = GUIElement
