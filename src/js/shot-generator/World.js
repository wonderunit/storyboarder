const THREE = require('three')

const React = require('react')
const { useRef, useEffect, useState } = React

const path = require('path')

const buildSquareRoom = require('./build-square-room')

// TODO use functions of ModelLoader?
require('../../../node_modules/three/examples/js/loaders/GLTFLoader')
require('../../../node_modules/three/examples/js/loaders/OBJLoader2')
const loadingManager = new THREE.LoadingManager()
const objLoader = new THREE.OBJLoader2(loadingManager)
const gltfLoader = new THREE.GLTFLoader(loadingManager)
const imageLoader = new THREE.ImageLoader(loadingManager)
objLoader.setLogging(false, false)

const World = ({ world, scene }) => {
  const [group, setGroup] = useState(null)

  useEffect(() => {
    if (!world.environment.file) {
      setGroup(null)
      return
    }

    switch (path.extname(world.environment.file)) {
      case '.obj':
        objLoader.load(world.environment.file, event => {
          console.log('loaded', event)
          const object = event.detail.loaderRootNode

          object.traverse( function ( child ) {
            if ( child instanceof THREE.Mesh ) {
              const g = new THREE.Group()

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

              // const bbox = new THREE.Box3().setFromObject(m)
              // const height = bbox.max.y - bbox.min.y

              g.add(m)

              setGroup(g)
            }
          })
        })
        break

      case '.gltf':
        gltfLoader.load(
          world.environment.file,
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
          }
        )
        break

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

  const ground = useRef(null)
  useEffect(() => {
    if (world.ground) {
      let texture = new THREE.Texture()

      // FIXME use a real texture cache
      const ensureGround = ground.current
        ? Promise.resolve(ground.current)
        : new Promise(
          (resolve, reject) => imageLoader.load('data/shot-generator/grid_floor.png',
            image => {
              texture.image = image
              texture.needsUpdate = true
      
              let geometry = new THREE.PlaneGeometry( 135 / 3, 135 / 3, 32 )
              let material = new THREE.MeshBasicMaterial( {map: texture, side: THREE.FrontSide} )
              material.transparent = true
              material.blending = THREE.MultiplyBlending
              material.opacity = 1
      
              ground.current = new THREE.Mesh( geometry, material )
              ground.current.userData.type = "ground"
              // ground.current.renderOrder = 0.7
              ground.current.rotation.x = -Math.PI / 2
              // shift slightly to allow for OutlineEffect
              ground.current.position.y = -0.03
              resolve(ground.current)
            },
            undefined,
            reject
          )
        )

      ensureGround.then(() => scene.add(ground.current))
    }

    return function cleanup () {
      if (ground.current) { scene.remove(ground.current) }
    }
  }, [world.ground])

  const room = useRef(null)
  const roomTexture = useRef(null)
  useEffect(() => {
    // FIXME use a real texture cache
    const ensureTexture = roomTexture.current
      ? Promise.resolve(roomTexture.current)
      : new Promise(
        (resolve, reject) => imageLoader.load('data/shot-generator/grid_wall.png',
          image => {
            let texture = new THREE.Texture()

            texture.image = image
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping
            texture.offset.set( 0, 0 )
            texture.repeat.set( 4.5, 4.5 )
            texture.needsUpdate = true

            roomTexture.current = texture
            resolve(roomTexture.current)
          },
          undefined,
          reject
        )
      )

    ensureTexture.then(texture => {
      room.current = buildSquareRoom(
        world.room.width,
        world.room.length,
        world.room.height,
        {
          textures: {
            wall: texture
          }
        }
      )
      // shift slightly to allow for OutlineEffect
      room.current.position.y = -0.03
      room.current.visible = world.room.visible
      scene.add(room.current)
    }).catch(err => console.error(err))

    return function cleanup () {
      scene.remove(room.current)
      room.current = null
    }
  }, [world.room.width, world.room.length, world.room.height])

  useEffect(() => {
    if (room.current) room.current.visible = world.room.visible
  }, [world.room.visible])

  useEffect(() => {
    scene.background
      ? scene.background.set(world.backgroundColor)
      : scene.background = new THREE.Color(world.backgroundColor)

  }, [world.backgroundColor])

  return null
}

module.exports = World
