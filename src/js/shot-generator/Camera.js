const { useEffect, useRef, useMemo } = React

const IconSprites = require('./IconSprites')

const Camera = React.memo(({ scene, id, type, setCamera, icon, ...props }) => {
  let camera = useRef()

  useMemo(() => {
    camera.current = new THREE.PerspectiveCamera(
      props.fov,
      props.aspectRatio,
      // near
      0.01,
      // far
      1000
    )

    // TODO do we ever need these?  - we do at least some (aspectRatio breaks)
    // camera.current.position.x = props.x
    // camera.current.position.y = props.z
    // camera.current.position.z = props.y
    // camera.current.rotation.x = 0
    // camera.current.rotation.z = 0
    // camera.current.rotation.y = props.rotation
    // camera.current.rotateX(props.tilt)
    // camera.current.rotateZ(props.roll)
    // camera.current.userData.type = type
    // camera.current.userData.id = id

    camera.current.fov = props.fov
    let focal = camera.current.getFocalLength()
    camera.current.aspect = props.aspectRatio
    camera.current.orthoIcon = new IconSprites(
      type,
      props.name
        ? props.name
        : props.displayName,
      camera.current,
      Math.round(focal) + "mm, " + props.z.toFixed(2) + "m"
    )

    camera.current.orthoIcon.position.copy(camera.current.position)
    camera.current.orthoIcon.icon.material.rotation = camera.current.rotation.y
    scene.add(camera.current.orthoIcon)
    let frustumIcons = new THREE.Object3D()

    frustumIcons.left = new IconSprites( 'object', '', camera.current )
    frustumIcons.right = new IconSprites( 'object', '', camera.current )
    frustumIcons.left.scale.set(0.06, 2.5, 1)
    frustumIcons.right.scale.set(0.06, 2.5, 1)
    //frustumIcons.left.icon.position.z = -0.3
    frustumIcons.left.icon.center = new THREE.Vector2(0.5, -0.2)
    frustumIcons.right.icon.center = new THREE.Vector2(0.5, -0.2)
    let hFOV = 2 * Math.atan( Math.tan( camera.current.fov * Math.PI / 180 / 2 ) * camera.current.aspect )
    frustumIcons.left.icon.material.rotation = hFOV/2 + camera.current.rotation.y
    frustumIcons.right.icon.material.rotation = -hFOV/2 + camera.current.rotation.y

    camera.current.orthoIcon.frustumIcons = frustumIcons
    frustumIcons.add(frustumIcons.left)
    frustumIcons.add(frustumIcons.right)
    camera.current.orthoIcon.add(frustumIcons)
  }, [])

  useEffect(() => {
    console.log(type, id, 'added')

    scene.add(camera.current)
    // console.log(
    //   'focal length:',
    //   camera.current.getFocalLength(),
    //   'fov',
    //   camera.current.fov,
    //   'h',
    //   camera.current.getFilmHeight(),
    //   'gauge',
    //   camera.current.filmGauge,
    //   'aspect',
    //   camera.current.aspect
    // )

    return function cleanup () {
      console.log(type, id, 'removed')
      scene.remove(camera.current.orthoIcon)
      scene.remove(camera.current)
    }
  }, [])

  useMemo(() => {
    if (camera.current) {
      camera.current.orthoIcon.changeFirstText(
        props.name
          ? props.name
          : props.displayName
      )
    }
  }, [props.displayName, props.name])

  useMemo(() => {
    camera.current.orthoIcon.setSelected(props.isSelected)
  }, [props.isSelected])

  camera.current.position.x = props.x
  camera.current.position.y = props.z
  camera.current.position.z = props.y
  camera.current.rotation.x = 0
  camera.current.rotation.z = 0
  camera.current.rotation.y = props.rotation
  camera.current.rotateX(props.tilt)
  camera.current.rotateZ(props.roll)
  camera.current.userData.type = type
  camera.current.userData.id = id
  camera.current.aspect = props.aspectRatio

  camera.current.fov = props.fov
  camera.current.updateProjectionMatrix()
  if (camera.current.orthoIcon) {
    camera.current.orthoIcon.position.copy(camera.current.position)
    let rotation = new THREE.Euler().setFromQuaternion( camera.current.quaternion, "YXZ" )   //always "YXZ" when we gat strange rotations
    camera.current.orthoIcon.icon.material.rotation = rotation.y

    let hFOV = 2 * Math.atan( Math.tan( camera.current.fov * Math.PI / 180 / 2 ) * camera.current.aspect )
    camera.current.orthoIcon.frustumIcons.left.icon.material.rotation = hFOV/2 + rotation.y
    camera.current.orthoIcon.frustumIcons.right.icon.material.rotation = -hFOV/2 + rotation.y


    //calculatedName = camera.current.name || capitalize(`${camera.current.type} ${number}`)
    //if (camera.current.orthoIcon.iconText)
      //camera.current.orthoIcon.iconText.textGeometry.update( calculatedName )

    let focal = camera.current.getFocalLength()
    let meters = parseFloat(Math.round(props.z * 100) / 100).toFixed(2)
    if (camera.current.orthoIcon.iconSecondText)
      camera.current.orthoIcon.changeSecondText(`${Math.round(focal)}mm, ${meters}m`)
    //camera.current.orthoIcon.frustumIcons = frustumIcons
  }
  camera.current.layers.enable(1)

  return null
})

module.exports = Camera
