const THREE = require('three')

const React = require('react')
const { useRef, useEffect, useState } = React

const path = require('path')

const prepareFilepathForModel = require('./prepare-filepath-for-model')

const buildSquareRoom = require('./build-square-room')

// TODO use functions of ModelLoader?
require('../vendor/three/examples/js/loaders/GLTFLoader')
require('../vendor/three/examples/js/loaders/OBJLoader2')
const loadingManager = new THREE.LoadingManager()
const objLoader = new THREE.OBJLoader2(loadingManager)
const gltfLoader = new THREE.GLTFLoader(loadingManager)
const imageLoader = new THREE.ImageLoader(loadingManager)

objLoader.setLogging(false, false)

const useGround = (world, scene) => {
  const [loaded, setLoaded] = useState(false)

  const object = useRef(null)
  const groundTexture = useRef(null)

  const load = () => imageLoader.load(
    'data/shot-generator/grid_floor.png',
    image => {
      groundTexture.current = new THREE.Texture()
      groundTexture.current.image = image
      groundTexture.current.needsUpdate = true
      setLoaded(true)
    }
  )

  const groundFactory = ({ texture }) => {
    let material = new THREE.MeshToonMaterial({ map: texture, side: THREE.FrontSide })
    // material.transparent = true
    // material.blending = THREE.MultiplyBlending
    material.opacity = 1

    let geometry = new THREE.PlaneGeometry( 135 / 3, 135 / 3, 32 )
    let object = new THREE.Mesh( geometry, material )
    object.userData.type = 'ground'
    object.rotation.x = -Math.PI / 2
    // shift slightly to allow for OutlineEffect
    object.position.y = -0.03
    // object.renderOrder = 0.7
    return object
  }

  useEffect(() => {
    if (world.ground) {
      if (!loaded) {
        load()
      } else {
        object.current = groundFactory({ texture: groundTexture.current })
        object.current.visible = world.ground
        object.current.layers.disable(0)
        object.current.layers.enable(1)
        object.current.layers.disable(2)
        scene.add(object.current)
      }
    }

    return function cleanup () {
      scene.remove(object.current)
    }
  }, [world.ground, loaded])

  return object.current
}

const useRoom = (world, scene) => {
  const [loaded, setLoaded] = useState(false)

  const object = useRef(null)
  const wallTexture = useRef(null)

  const load = () => imageLoader.load(
    'data/shot-generator/grid_wall2.png',
    image => {
      wallTexture.current = new THREE.Texture()

      wallTexture.current.image = image
      wallTexture.current.wrapS = wallTexture.current.wrapT = THREE.RepeatWrapping
      wallTexture.current.offset.set( 0, 0 )
      wallTexture.current.repeat.set( 4.5, 4.5 )
      wallTexture.current.needsUpdate = true

      setLoaded(true)
    }
  )

  const roomFactory = ({ width, length, height, texture }) => {
    let object = buildSquareRoom(
      width,
      length,
      height,
      { textures: { wall: texture } }
    )
    // shift slightly to allow for OutlineEffect
    object.position.y = -0.03
    return object
  }

  useEffect(() => {
    if (world.room.visible) {
      if (!loaded) {
        load()
      } else {
        object.current = roomFactory({
          width: world.room.width,
          length: world.room.length,
          height: world.room.height,
          texture: wallTexture.current
        })
        object.current.visible = world.room.visible
        scene.add(object.current)
      }
    }

    return function cleanup () {
      scene.remove(object.current)
    }
  }, [world.room, loaded])

  return object.current
}

const World = ({ world, scene, storyboarderFilePath, updateWorldEnvironment }) => {
  const [group, setGroup] = useState(null)

  const ground = useGround(world, scene)
  const room = useRoom(world, scene)

  let load = async file => {
    let filepath = await prepareFilepathForModel({
      model: file,
      type: 'environment',

      storyboarderFilePath,

      onFilePathChange: filepath => {
        // new relative path
        updateWorldEnvironment({ file: filepath })
      }
    })

    if (!filepath) {
      setGroup(null)
      return
    }

    switch (path.extname(filepath)) {
      case '.obj':
        objLoader.load(
          filepath,
          event => {
          },
          null,
          error => {
            console.error(error)
            alert('Error loading environment model file:\n' + filepath)
            updateWorldEnvironment({ file: undefined })
            setGroup(null)
          }
        )
        break

      case '.gltf':
      case '.glb':
        gltfLoader.load(
          filepath,
          data => {
            const g = new THREE.Group()

            data.scene.children.forEach(child => {
              if (child.type === 'Mesh') {
                let m = child.clone()

                const material = new THREE.MeshToonMaterial({
                  color: 0xffffff,
                  emissive: 0x0,
                  specular: 0x0,
                  skinning: true,
                  shininess: 0,
                  flatShading: false
                })
                m.material = material

                g.add(m)
              }
            })

            setGroup(g)
          },
          null,
          error => {
            console.error(error)
            alert('Error loading environment model file:\n' + filepath)
            updateWorldEnvironment({ file: undefined })
            setGroup(null)
          }
        )
        break

      default:
        alert('Error loading environment model file:\n' + filepath)
        updateWorldEnvironment({ file: undefined })
        setGroup(null)
        break
    }
  }

  // deferring to load, which runs async
  // see: https://stackoverflow.com/questions/53332321
  useEffect(() => {
    if (world.environment.file) {
      load(world.environment.file)
    } else {
      setGroup(null)
      return
    }
  }, [world.environment.file])

  useEffect(() => {
    if (!group) return

    let scale = world.environment.scale
    group.scale.set(scale, scale, scale)
    group.updateMatrix()
  }, [group, world.environment.scale])

  useEffect(() => {
    if (group) {
      group.visible = world.environment.visible
    }
  }, [group, world.environment.visible])

  useEffect(() => {
    if (group) {
      group.rotation.y = world.environment.rotation
    }
  }, [group, world.environment.rotation])

  useEffect(() => {
    if (group) {
      group.position.x = world.environment.x
      group.position.z = world.environment.y
      group.position.y = world.environment.z
    }
  }, [group, world.environment.x, world.environment.y, world.environment.z])

  useEffect(() => {
    if (!group) return

    scene.add(group)

    return function cleanup () {
      scene.remove(group)
    }
  }, [group])

  useEffect(() => {
    scene.background
      ? scene.background.set(world.backgroundColor)
      : scene.background = new THREE.Color(world.backgroundColor)

  }, [world.backgroundColor])

  const ambientLight = useRef(null)
  const directionalLight = useRef(null)

  useEffect(() => {
    if (ambientLight.current)
    {
      ambientLight.current.intensity = world.ambient.intensity
    } else {
      ambientLight.current = new THREE.AmbientLight(0xffffff, world.ambient.intensity)
      scene.add(ambientLight.current)
    }
  }, [world.ambient.intensity])

  useEffect(() => {
    if (directionalLight.current)
    {
      directionalLight.current.intensity = world.directional.intensity
      directionalLight.current.rotation.x = 0
      directionalLight.current.rotation.z = 0
      directionalLight.current.rotation.y = world.directional.rotation
      directionalLight.current.rotateX(world.directional.tilt+Math.PI/2)

      //scene.remove(directionalLight.current.helper)
      // var helper = new THREE.DirectionalLightHelper( directionalLight.current, 0.14 );
      // scene.add(helper)
      //directionalLight.current.helper = helper
    } else {
      let dirLight = new THREE.DirectionalLight(0xffffff, world.directional.intensity)
      dirLight.position.set(0,1.5,0)
      dirLight.target.position.set(0,0,0.4)
      dirLight.add(dirLight.target)
      dirLight.intensity = world.directional.intensity
      dirLight.rotation.y = world.directional.rotation
      dirLight.rotateX(world.directional.tilt+Math.PI/2)
      //dirLight.rotation.x = world.directional.tilt+Math.PI/2
      directionalLight.current = dirLight
      // var helper = new THREE.DirectionalLightHelper( dirLight, 0.14 );
      // scene.add(helper)
      // directionalLight.current.helper = helper
      scene.add(directionalLight.current)
    }
  }, [world.directional.intensity, world.directional.rotation, world.directional.tilt])

  return null
}

module.exports = World
