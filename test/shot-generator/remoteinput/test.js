const THREE = require('three')
window.THREE = THREE

const React = require('react')
const ReactDOM = require('react-dom')
const { Provider, connect } = require('react-redux')
const h = require('../../../src/js/utils/h')

const createServer = require('../../../src/js/services/createServer')
const createDualShockController = require('../../../src/js/shot-generator/DualshockController')

const TeapotBufferGeometry = require('../../../node_modules/three/examples/js/geometries/TeapotBufferGeometry')
// via https://github.com/jeromeetienne/threex.suzanne
// converted to ObjectLoader-compatible BufferGeometry (see: https://github.com/mrdoob/three.js/pull/15310)
const Suzanne = require('../fixtures/Suzanne.json')
require('../../../node_modules/three/examples/js/loaders/GLTFLoader')

const METERS_PER_FEET = 0.3048

const { initialState, reducer, updateDevice } = require('../../../src/js/shared/reducers/shot-generator')

// TODO use the main Storyboarder store instead of a special one for Shot Generator
//
// configureStore:
const { createStore, applyMiddleware } = require('redux')
const thunkMiddleware = require('redux-thunk').default
const configureStore = function configureStore (preloadedState) {
  const store = createStore(reducer, preloadedState, applyMiddleware(thunkMiddleware))
  return store
}
const store = configureStore(initialState)

window.$r = { store }

let loadingManager = new THREE.LoadingManager()
let gltfLoader = new THREE.GLTFLoader(loadingManager)

const createScene = ({ store, label, setup }) => {
  let clock = new THREE.Clock()

  let scene = new THREE.Scene()
  scene.background = new THREE.Color( 0xFFFFFF )
  scene.add(new THREE.AmbientLight(0x161616, 1))
  //scene.fog = new THREE.Fog( 0xefd1b5, 0, 15 )


  directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1)
  directionalLight.position.set(0, 1, 3)
  scene.add(directionalLight)

  let width = 405
  let height = Math.ceil(405 / 2.35)
  let camera = new THREE.PerspectiveCamera( 40, width / height, 0.1, 1000 )

  scene.add( camera )

  let div = document.createElement('div')
  div.classList.add('scene')
  let canvas = document.createElement('canvas')
  div.appendChild(canvas)
  let labelEl = document.createElement('div')
  labelEl.classList.add('label')
  labelEl.innerHTML = label
  div.appendChild(labelEl)
  document.querySelector('.scenes').appendChild(div)
  let renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
  })
  renderer.setPixelRatio(2)
  renderer.setSize(width, height)

  setup({ store, scene, camera, clock, renderer })
}

const NumberSlider = React.memo(({ label, value, onSetValue, min, max, step, formatter }) => {
  min = min == null ? -10 : min
  max = max == null ? 10 : max
  step = step == null ? 0.01 : step
  const onChange = event => {
    event.preventDefault()
    onSetValue(parseFloat(event.target.value))
  }
  formatter = formatter != null
    ? formatter
    : value => value.toFixed(2)

  return h([
    'div.number-slider', { style: { display: 'flex', flexDirection: 'row' } }, [
      ['div', { style: { width: 50 } }, label],
      ['input', { style: { flex: 1 }, type: 'range', onChange, min, max, step, value }],
      ['div', { style: { width: 40 } }, formatter(value)]
    ]
  ])
})

const DualshockControllerInspector = ({ device }) => {
  const formatter = value => value

  return h(
    ['fieldset', { style: { flex: '0.5' }}, [
      ['strong', 'DualshockController'],
      ['div', { style: { display: 'flex', flexDirection: 'row' } }, [
        ['div', { style: { display: 'flex', flexDirection: 'column', flex: 1 } }, [
          ['div', { style: { display: 'flex', flexDirection: 'row' } }, [
            ['div', { style: { width: 50 } }, 'accelX'],
            ['div', formatter(device.motion.accelX)]
          ]],
          ['div', { style: { display: 'flex', flexDirection: 'row' } }, [
            ['div', { style: { width: 50 } }, 'accelY'],
            ['div', formatter(device.motion.accelY)]
          ]],
          ['div', { style: { display: 'flex', flexDirection: 'row' } }, [
            ['div', { style: { width: 50 } }, 'accelZ'],
            ['div', formatter(device.motion.accelZ)]
          ]]
        ]],
        ['div', { style: { display: 'flex', flexDirection: 'column', flex: 1 } }, [
          ['div', { style: { display: 'flex', flexDirection: 'row' } }, [
            ['div', { style: { width: 50 } }, 'pitch'],
            ['div', formatter(device.motion.gyroPitch)]
          ]],
          ['div', { style: { display: 'flex', flexDirection: 'row' } }, [
            ['div', { style: { width: 50 } }, 'roll'],
            ['div', formatter(device.motion.gyroRoll)]
          ]],
          ['div', { style: { display: 'flex', flexDirection: 'row' } }, [
            ['div', { style: { width: 50 } }, 'yaw'],
            ['div', formatter(device.motion.gyroYaw)]
          ]]
        ]],
        ['div', { style: { display: 'flex', flexDirection: 'column', flex: 1 } }, [
          ['div', { style: { display: 'flex', flexDirection: 'row' } }, [
            ['div', { style: { width: 50 } }, 'circle'],
            ['div', device.digital.circle ? 'yes' : 'no']
          ]]
        ]]
      ]]
    ]]
  )
}

const createControls = ({ store }) => {
  const Controls = connect(
    state => ({
      remoteInput: state.input,
      devices: state.devices
    }),
    {
      setInputMag: payload => (dispatch, getState) => {
        dispatch({ type: 'SET_INPUT_MAG', payload })
      }
    }
  )(
    ({ remoteInput, devices, setInputMag }) => {
      return h([
        'div', [
          // ['h3', 'Manual Controls'],
          ['div', { style: { display: 'flex' }}, [
            ['fieldset', { style: { flex: '0.5' }}, [
              ['strong', 'Orientation (Magnetometer)'],
                [NumberSlider, {
                  label: 'alpha',
                  value: THREE.Math.degToRad(remoteInput.mag[0]),
                  onSetValue: () => {
                    let payload = [...remoteInput.mag]
                    payload[0] = THREE.Math.radToDeg(parseFloat(event.target.value))
                    setInputMag(payload)
                  },
                  min: -Math.PI * 2,
                  max: Math.PI * 2,
                  step: Math.PI / 360,
                  formatter: value => Math.round(value * THREE.Math.RAD2DEG).toString() + '°'
                }],
                [NumberSlider, {
                  label: 'beta',
                  value: THREE.Math.degToRad(remoteInput.mag[1]),
                  onSetValue: () => {
                    let payload = [...remoteInput.mag]
                    payload[1] = THREE.Math.radToDeg(parseFloat(event.target.value))
                    setInputMag(payload)
                  },
                  min: -Math.PI,
                  max: Math.PI,
                  formatter: value => Math.round(value * THREE.Math.RAD2DEG).toString() + '°'
                }],
                [NumberSlider, {
                  label: 'gamma',
                  value: THREE.Math.degToRad(remoteInput.mag[2]),
                  onSetValue: () => {
                    let payload = [...remoteInput.mag]
                    payload[2] = THREE.Math.radToDeg(parseFloat(event.target.value))
                    setInputMag(payload)
                  },
                  min: -Math.PI / 2,
                  max: Math.PI / 2,
                  formatter: value => Math.round(value * THREE.Math.RAD2DEG).toString() + '°'
                }],
                ['div', { style: { display: 'flex', flexDirection: 'row' } }, [
                  ['div', { style: { width: 50 } }, 'mag'],
                  ['div', remoteInput.mag.map(x => x.toFixed()).join(', ')]
                ]]
            ]],

            [DualshockControllerInspector, { device: devices[0] }]
          ]]
        ]
      ])
    })

  ReactDOM.render(
    h([
      Provider, { store }, [
        Controls
      ]
    ]),
    document.querySelector('.controls')
  )
}

const createSuzanne = () => {
  var loader = new THREE.ObjectLoader()
  let { geometry } = loader.parse(Suzanne)
  // geometry.applyMatrix( new THREE.Matrix4().makeRotationX(Math.PI / 2) )
  // geometry.applyMatrix( new THREE.Matrix4().makeScale(0.5, 0.5, 0.5) )
  material = new THREE.MeshNormalMaterial()
  let mesh = new THREE.Mesh( geometry, material )
  return mesh
}

const createTeapot = () => {
  let geometry = new THREE.TeapotBufferGeometry( 0.5 )
  // let material = new THREE.MeshBasicMaterial( { color: 0xcccccc, side: THREE.DoubleSide } )
  let material = new THREE.MeshNormalMaterial()
  // material = new THREE.MeshToonMaterial({
  //   color: 0xdddddd,
  //   emissive: 0x0,
  //   specular: 0x0,
  //   shininess: 0,
  //   flatShading: false
  // })
  let mesh = new THREE.Mesh( geometry, material )
  return mesh
}

const createAxesHelper = () => {
  let helper = new THREE.AxesHelper(1)
  helper.material.depthTest = false
  helper.material.depthWrite = false
  helper.material.transparent = true
  helper.material.opacity = 0.5
  return helper
}

const createPhone = () => {
  let container = new THREE.Object3D()

  gltfLoader.load('../fixtures/phone.glb', event => {
    let mesh = event.scene.children[2]
    mesh.material = new THREE.MeshNormalMaterial()
    container.add(mesh)
  })

  return container
}

const createPS4Controller = () => {
  let container = new THREE.Object3D()

  gltfLoader.load('../fixtures/ps4-dualshock.glb', event => {
    let mesh = event.scene.children[0]
    mesh.material = new THREE.MeshNormalMaterial()
    container.add(mesh)
  })

  return container
}

const createSnake = () => {
  let container = new THREE.Object3D()

  gltfLoader.load('../fixtures/snake.glb', event => {
    console.log(event.scene.children[0].children[2].skeleton.bones)
    let mesh = event.scene.children[0]
    let mat = new THREE.MeshNormalMaterial()
    mat.skinning = true
    mesh.children[2].material = mat
    // mesh.children[2].skeleton.bones[3].quaternion = new THREE.Quaternion(0,0,0,Math.PI/2)

    // console.log(new THREE.Quaternion(0,0,0,Math.PI/2))
    // mesh.children[2].skeleton.bones[4].quaternion = new THREE.Quaternion(0,0,0,1)
    // console.log(mesh.children[2].skeleton.bones[3].quaternion)
    container.add(mesh)
  })

  return container
}

createScene({
  store,
  label: 'straight mobile input',
  setup: ({ store, scene, camera, clock, renderer }) => {
    let group = new THREE.Object3D()

    let phone = createPhone()
    group.add(phone)

    scene.add(group)

    let helper = createAxesHelper()
    helper.scale.set(0.1, 0.1, 0.1)
    scene.add(helper)

    camera.position.z = 0.3
    camera.position.y = 0
    camera.position.x = 0
    camera.lookAt(0, 0, 0)

    let animate = () => {
      let remoteInput = store.getState().input
      let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)

      let q = new THREE.Quaternion()
        .setFromEuler(
          new THREE.Euler(
            beta,
            alpha,
            -gamma,
            'YXZ')
          ).multiply(new THREE.Quaternion(
            -Math.sqrt(0.5),
            0,
            0,
            Math.sqrt(0.5)
          )
        )
      group.quaternion.copy(q)
      helper.quaternion.copy(q)

      renderer.render( scene, camera )
      requestAnimationFrame( animate )
    }
    animate()
  }
})

createScene({
  store,
  label: 'calculate initial alpha rotation offset (for android phones)',
  setup: ({ store, scene, camera, clock, renderer }) => {
    let group = new THREE.Object3D()

    let phone = createPhone()
    group.add(phone)

    scene.add(group)

    let helper = createAxesHelper()
    helper.scale.set(0.1, 0.1, 0.1)
    scene.add(helper)

    camera.position.z = 0.3
    camera.position.y = 0
    camera.position.x = 0
    camera.lookAt(0, 0, 0)


    let down = false
    let offset = 0

    let animate = () => {
      let remoteInput = store.getState().input

      if (!remoteInput.down) {
        down = false
      }

      let magValues = remoteInput.mag
      if (remoteInput.down && !down) {
        offset = 0-magValues[0]
        down = true
      }

      magValues[0] = magValues[0] + offset

      let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)

      let q = new THREE.Quaternion()
        .setFromEuler(
          new THREE.Euler(
            beta,
            alpha + (90*(Math.PI/180)),
            -gamma + (0*(Math.PI/180)),
            'YXZ')
          ).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))

          q = new THREE.Quaternion()
          .setFromEuler(
            new THREE.Euler(
              beta,
              alpha + (offset*(Math.PI/180)),
              -gamma,
              'YXZ')
            ).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))




          group.quaternion.copy(q)
      helper.quaternion.copy(q)

      // if (input.down) {
      //   group.rotation.z = THREE.Math.degToRad(input.mag[0])
      //   group.rotation.y = THREE.Math.degToRad(input.mag[1])
      //   group.rotation.x = THREE.Math.degToRad(input.mag[2])
      // }

      renderer.render( scene, camera )
      requestAnimationFrame( animate )
    }
    animate()
  }
})


createScene({
  store,
  label: 'difference from initial pointer down, over time',
  setup: ({ store, scene, camera, clock, renderer }) => {
    let group = new THREE.Object3D()
    let suzanne = createSuzanne()
    group.add(suzanne)
    // let teapot = createTeapot()
    // group.add(teapot)
    scene.add(group)

    let helper = createAxesHelper()
    scene.add(helper)

    camera.position.z = 3
    camera.position.y = 0
    camera.lookAt(0, 0, 0)

    let down = false
    let offset = 0

    let startingDeviceQuaternion = new THREE.Quaternion()
    let startingDeviceOffset = new THREE.Quaternion()

    let animate = () => {
      let remoteInput = store.getState().input

      if (!remoteInput.down) {
        down = false
      }

      let magValues = remoteInput.mag
      if (remoteInput.down && !down) {
        offset = 0-magValues[0]
        down = true

        let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)
        let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
        startingDeviceOffset =  new THREE.Quaternion().clone().inverse().multiply(deviceQuaternion).normalize().inverse()
      }

      let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)
      let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))

      let deviceDifference = startingDeviceQuaternion.clone().inverse().multiply(deviceQuaternion).multiply(startingDeviceOffset)

      group.quaternion.copy(deviceDifference)
      helper.quaternion.copy(deviceDifference)

      renderer.render( scene, camera )
      requestAnimationFrame( animate )
    }
    animate()
  }
})


createScene({
  store,
  label: 'dualshock input',
  setup: ({ store, scene, camera, clock, renderer }) => {
    let group = new THREE.Object3D()

    let controller = createPS4Controller()
    group.add(controller)

    scene.add(group)

    let helper = createAxesHelper()
    helper.scale.set(0.1, 0.1, 0.1)
    scene.add(helper)

    camera.position.z = 0.3
    camera.position.y = 0
    camera.position.x = 0
    camera.lookAt(0, 0, 0)

    let virtualPitch = 0
    let virtualRoll = 0
    let virtualYaw = 0


    let animate = () => {
      let device = store.getState().devices[0]
      let { accelX, accelY, accelZ, gyroPitch, gyroRoll, gyroYaw } = device.motion

      // via https://math.stackexchange.com/a/377174
      const remap = (x, a, b, c, d) => (x - a) * (d - c) / (b - a) + c

      // values via https://github.com/chrippa/ds4drv/blob/master/ds4drv/uinput.py
      const adjusted = value => remap(value, -16385, 16384, -Math.PI, Math.PI)
      //"ABS_DISTANCE": (0, -32768, 32767, 0, 10),
      if (device.digital.circle) {
         virtualPitch = 0
         virtualRoll = 0
         virtualYaw = 0

      }

      //virtualPitch = -adjusted(gyroPitch)
      //virtualRoll = adjusted(gyroRoll)

      virtualYaw = virtualYaw + ((0 - virtualYaw)*0.003)
      virtualRoll = virtualRoll + ((adjusted(gyroRoll) - virtualRoll)*0.003)
      if (adjusted(gyroPitch)) {
        virtualPitch = virtualPitch + (((-adjusted(gyroPitch)) - virtualPitch)*0.003)

      }

      if (adjusted(accelY)) {
        virtualYaw += adjusted(accelY)/10.0
      }

      if (adjusted(accelX)) {
        virtualPitch += adjusted(accelX)/10.0
      }

      if (adjusted(accelZ)) {
        virtualRoll += adjusted(accelZ)/10.0
      }



      let q = new THREE.Quaternion()
        .setFromEuler(
          new THREE.Euler(
            virtualPitch,
            virtualYaw,
            virtualRoll
          )
        )
      group.quaternion.copy(q)
      helper.quaternion.copy(q)

      renderer.render( scene, camera )
      requestAnimationFrame( animate )
    }
    animate()
    }
    })


    createScene({
      store,
      label: 'difference applied to an object [rotation: 0,0,0 | camera: 0,0,0 ]',
      setup: ({ store, scene, camera, clock, renderer }) => {
        let group = new THREE.Object3D()
        let suzanne = createSuzanne()
        group.add(suzanne)
        // let teapot = createTeapot()
        // group.add(teapot)
        scene.add(group)
        //group.rotateX(Math.PI/2)

        //group.updateMatrixWorld()

        let helper = createAxesHelper()
        scene.add(helper)

        camera.position.z = 3
        camera.position.y = 0
        camera.lookAt(0, 0, 0)

        let down = false
        let offset = 0

        let startingDeviceQuaternion = new THREE.Quaternion()
        let startingDeviceOffset = new THREE.Quaternion()

        let startingObjectQuaternion = group.quaternion.clone()
        let startingObjectOffset = new THREE.Quaternion()

        let animate = () => {
          let remoteInput = store.getState().input
          let magValues = remoteInput.mag
          let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)

          if (!remoteInput.down) {
            down = false
            let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            startingDeviceOffset =  new THREE.Quaternion().clone().inverse().multiply(deviceQuaternion).normalize().inverse()
          }


          if (remoteInput.down && !down) {
            offset = 0-magValues[0]
            down = true

            let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)
            let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            startingDeviceOffset =  new THREE.Quaternion().clone().inverse().multiply(deviceQuaternion).normalize().inverse()

          //  group.updateMatrixWorld(true)

            startingObjectQuaternion = group.quaternion.normalize().clone()
            startingObjectOffset =  new THREE.Quaternion().clone().inverse().multiply(startingObjectQuaternion)
          }

          if (remoteInput.down) {
            let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            let deviceDifference = startingDeviceQuaternion.clone().inverse().multiply(deviceQuaternion).multiply(startingDeviceOffset).normalize()

            // take object and get difference with world, apply device difference, multiply by starting quat


            let objectQuaternion = startingObjectQuaternion.clone().inverse().multiply(startingObjectOffset)//.multiply(d.inverse())
            objectQuaternion.multiply(deviceDifference)
            objectQuaternion.multiply(startingObjectOffset)


          //  let objectQuaternion = startingObjectQuaternion.clone().multiply(deviceDifference)

          group.quaternion.copy(objectQuaternion)
           helper.quaternion.copy(objectQuaternion)

          }

          renderer.render( scene, camera )
          requestAnimationFrame( animate )
        }
        animate()
      }
    })



    createScene({
      store,
      label: 'difference applied to an object [rotation: 90,0,0 | camera: 0,0,0 ]',
      setup: ({ store, scene, camera, clock, renderer }) => {
        let group = new THREE.Object3D()
        let suzanne = createSuzanne()
        group.add(suzanne)
        // let teapot = createTeapot()
        // group.add(teapot)
        scene.add(group)
        group.rotateY(Math.PI/2)

        //group.updateMatrixWorld()

        let helper = createAxesHelper()
        scene.add(helper)

        camera.position.z = 3
        camera.position.y = 0
        camera.lookAt(0, 0, 0)

        let down = false
        let offset = 0

        let startingDeviceQuaternion = new THREE.Quaternion()
        let startingDeviceOffset = new THREE.Quaternion()

        let startingObjectQuaternion = group.quaternion.clone()
        let startingObjectOffset = new THREE.Quaternion()

        let animate = () => {
          let remoteInput = store.getState().input
          let magValues = remoteInput.mag
          let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)

          if (!remoteInput.down) {
            down = false
            // let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            // startingDeviceOffset =  new THREE.Quaternion().clone().inverse().multiply(deviceQuaternion).normalize().inverse()
          }


          if (remoteInput.down && !down) {
            offset = 0-magValues[0]
            down = true

            let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)
            let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            startingDeviceOffset =  new THREE.Quaternion().clone().inverse().multiply(deviceQuaternion).normalize().inverse()

          //  group.updateMatrixWorld(true)

            startingObjectQuaternion = group.quaternion.normalize().clone()
            startingObjectOffset =  new THREE.Quaternion().clone().inverse().multiply(startingObjectQuaternion)
          }

          if (remoteInput.down) {
            let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            let deviceDifference = startingDeviceQuaternion.clone().inverse().multiply(deviceQuaternion).multiply(startingDeviceOffset).normalize()

            // take object and get difference with world, apply device difference, multiply by starting quat


            let objectQuaternion = startingObjectQuaternion.clone().inverse().multiply(startingObjectOffset)//.multiply(d.inverse())
            objectQuaternion.multiply(deviceDifference)
            objectQuaternion.multiply(startingObjectOffset)


          //  let objectQuaternion = startingObjectQuaternion.clone().multiply(deviceDifference)

          group.quaternion.copy(objectQuaternion)
           helper.quaternion.copy(objectQuaternion)

          }

          renderer.render( scene, camera )
          requestAnimationFrame( animate )
        }
        animate()
      }
    })

    createScene({
      store,
      label: 'difference applied to an object [rotation: 0,0,0 | camera: 90,0,0 ]',
      setup: ({ store, scene, camera, clock, renderer }) => {
        let group = new THREE.Object3D()
        let suzanne = createSuzanne()
        group.add(suzanne)
        // let teapot = createTeapot()
        // group.add(teapot)
        scene.add(group)
        group.rotateY(Math.PI/2)

        //group.updateMatrixWorld()

        let helper = createAxesHelper()
        scene.add(helper)

        // camera.position.x = -3
        // camera.position.z = 2
        // camera.position.y = 5
        camera.position.x = 0
        camera.position.z = 3
        camera.position.y = 0
        camera.lookAt(0, 0, 0)

        let down = false
        let offset = 0

        let startingDeviceQuaternion = new THREE.Quaternion()
        let startingDeviceOffset = new THREE.Quaternion()

        let startingObjectQuaternion = group.quaternion.clone()
        let startingObjectOffset = new THREE.Quaternion()

        let animate = () => {
          let remoteInput = store.getState().input
          let magValues = remoteInput.mag
          let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)

          if (!remoteInput.down) {
            down = false
            // let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            // startingDeviceOffset =  new THREE.Quaternion().clone().inverse().multiply(deviceQuaternion).normalize().inverse()
            // startingObjectQuaternion = group.quaternion.normalize().clone()
            // startingObjectOffset =  new THREE.Quaternion().clone().inverse().multiply(startingObjectQuaternion)

           }


          if (remoteInput.down && !down) {
            offset = 0-magValues[0]
            down = true

            let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)
            let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            startingDeviceOffset =  new THREE.Quaternion().clone().inverse().multiply(deviceQuaternion).normalize().inverse()

            startingObjectQuaternion = group.quaternion.clone()
            startingObjectOffset =  new THREE.Quaternion().clone().inverse().multiply(startingObjectQuaternion)

          }

          if (remoteInput.down) {
            let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            let deviceDifference = new THREE.Quaternion().inverse().multiply(deviceQuaternion).multiply(startingDeviceOffset).normalize()

            let cameraOffset = new THREE.Quaternion().clone().inverse().multiply(camera.quaternion.clone())


            let objectQuaternion = startingObjectQuaternion.clone().inverse()

            objectQuaternion.multiply(startingObjectOffset)
            objectQuaternion.multiply(cameraOffset)
            objectQuaternion.multiply(deviceDifference)
            objectQuaternion.multiply(cameraOffset.inverse())
            objectQuaternion.multiply(startingObjectOffset)

            group.quaternion.copy(objectQuaternion.normalize())
            helper.quaternion.copy(objectQuaternion)

          }

          renderer.render( scene, camera )
          requestAnimationFrame( animate )
        }
        animate()
      }
    })

    createScene({
      store,
      label: 'difference applied to an object [rotation: 90,0,0 | camera: 90,0,0 ]',
      setup: ({ store, scene, camera, clock, renderer }) => {
        let group = new THREE.Object3D()
        let suzanne = createSuzanne()
        group.add(suzanne)
        // let teapot = createTeapot()
        // group.add(teapot)
        scene.add(group)
       // group.rotateY(Math.PI/2)

        //group.updateMatrixWorld()

        let helper = createAxesHelper()
        scene.add(helper)

        // camera.position.x = -3
        // camera.position.z = 2
        // camera.position.y = 5
        camera.position.x = -3
        camera.position.z = 0
        camera.position.y = 0
        camera.lookAt(0, 0, 0)

        let down = false
        let offset = 0

        let startingDeviceQuaternion = new THREE.Quaternion()
        let startingDeviceOffset = new THREE.Quaternion()

        let startingObjectQuaternion = group.quaternion.clone()
        let startingObjectOffset = new THREE.Quaternion()

        let animate = () => {
          let remoteInput = store.getState().input
          let magValues = remoteInput.mag
          let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)

          if (!remoteInput.down) {
            down = false
            // let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            // startingDeviceOffset =  new THREE.Quaternion().clone().inverse().multiply(deviceQuaternion).normalize().inverse()
            // startingObjectQuaternion = group.quaternion.normalize().clone()
            // startingObjectOffset =  new THREE.Quaternion().clone().inverse().multiply(startingObjectQuaternion)

           }


          if (remoteInput.down && !down) {
            offset = 0-magValues[0]
            down = true

            let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)
            let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            startingDeviceOffset =  new THREE.Quaternion().clone().inverse().multiply(deviceQuaternion).normalize().inverse()

            startingObjectQuaternion = group.quaternion.clone()
            startingObjectOffset =  new THREE.Quaternion().clone().inverse().multiply(startingObjectQuaternion)


          }

          if (remoteInput.down) {
            let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            let deviceDifference = new THREE.Quaternion().inverse().multiply(deviceQuaternion).multiply(startingDeviceOffset).normalize()

            let cameraOffset = new THREE.Quaternion().clone().inverse().multiply(camera.quaternion.clone())


            let objectQuaternion = startingObjectQuaternion.clone().inverse()

            objectQuaternion.multiply(startingObjectOffset)
            objectQuaternion.multiply(cameraOffset)
            objectQuaternion.multiply(deviceDifference)
            objectQuaternion.multiply(cameraOffset.inverse())
            objectQuaternion.multiply(startingObjectOffset)

            group.quaternion.copy(objectQuaternion.normalize())
            helper.quaternion.copy(objectQuaternion)

          }

          renderer.render( scene, camera )
          requestAnimationFrame( animate )
        }
        animate()
      }
    })

    createScene({
      store,
      label: 'difference applied to an object [rotation: random | camera: random ]',
      setup: ({ store, scene, camera, clock, renderer }) => {
        let group = new THREE.Object3D()
        let suzanne = createSuzanne()
        group.add(suzanne)
        // let teapot = createTeapot()
        // group.add(teapot)
        scene.add(group)
        group.rotateY(Math.random()*4)
        group.rotateX(Math.random()*4)
        group.rotateZ(Math.random()*4)

        //group.updateMatrixWorld()

        let helper = createAxesHelper()
        scene.add(helper)

        // camera.position.x = -3
        // camera.position.z = 2
        // camera.position.y = 5

        let campos = new THREE.Vector3(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1).normalize().multiplyScalar(2)
        camera.position.x = campos.x
        camera.position.z = campos.y
        camera.position.y = campos.z
        camera.lookAt(0, 0, 0)

        let down = false
        let offset = 0

        let startingDeviceQuaternion = new THREE.Quaternion()
        let startingDeviceOffset = new THREE.Quaternion()

        let startingObjectQuaternion = group.quaternion.clone()
        let startingObjectOffset = new THREE.Quaternion()

        let animate = () => {
          let remoteInput = store.getState().input
          let magValues = remoteInput.mag
          let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)

          if (!remoteInput.down) {
            down = false
            // let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            // startingDeviceOffset =  new THREE.Quaternion().clone().inverse().multiply(deviceQuaternion).normalize().inverse()
            // startingObjectQuaternion = group.quaternion.normalize().clone()
            // startingObjectOffset =  new THREE.Quaternion().clone().inverse().multiply(startingObjectQuaternion)

           }


          if (remoteInput.down && !down) {
            offset = 0-magValues[0]
            down = true

            let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)
            let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            startingDeviceOffset =  new THREE.Quaternion().clone().inverse().multiply(deviceQuaternion).normalize().inverse()

            startingObjectQuaternion = group.quaternion.clone()
            startingObjectOffset =  new THREE.Quaternion().clone().inverse().multiply(startingObjectQuaternion)


          }

          if (remoteInput.down) {
            let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            let deviceDifference = new THREE.Quaternion().inverse().multiply(deviceQuaternion).multiply(startingDeviceOffset).normalize()

            let cameraOffset = new THREE.Quaternion().clone().inverse().multiply(camera.quaternion.clone())


            let objectQuaternion = startingObjectQuaternion.clone().inverse()

            objectQuaternion.multiply(startingObjectOffset)
            objectQuaternion.multiply(cameraOffset)
            objectQuaternion.multiply(deviceDifference)
            objectQuaternion.multiply(cameraOffset.inverse())
            objectQuaternion.multiply(startingObjectOffset)

            group.quaternion.copy(objectQuaternion.normalize())
            helper.quaternion.copy(objectQuaternion)

          }

          renderer.render( scene, camera )
          requestAnimationFrame( animate )
        }
        animate()
      }
    })

    createScene({
      store,
      label: 'difference applied to a specific bone in an object [rotation: 0,0,0 | camera: 0,0,0 ]',
      setup: ({ store, scene, camera, clock, renderer }) => {
        let group = new THREE.Object3D()
       // let suzanne = createSuzanne()
        //group.add(suzanne)
         let snake = createSnake()
         group.add(snake)
         snake.position.y = -1.5
        scene.add(group)
//        group.rotateY(Math.random()*4)

        console.log(snake)
        //group.updateMatrixWorld()
        let helper = createAxesHelper()
        scene.add(helper)

        camera.position.x = 0
        camera.position.z = 6
        camera.position.y = 0

        // let campos = new THREE.Vector3(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1).normalize().multiplyScalar(2)
        // camera.position.x = campos.x
        // camera.position.z = campos.y
        // camera.position.y = campos.z
        camera.lookAt(0, 0, 0)

        let down = false
        let offset = 0

        let startingDeviceQuaternion = new THREE.Quaternion()
        let startingDeviceOffset = new THREE.Quaternion()

        let startingObjectQuaternion = group.quaternion.clone()
        let startingObjectOffset = new THREE.Quaternion()

        let worldObjectOffset = new THREE.Quaternion()

        let targetobject

        let animate = () => {
          let remoteInput = store.getState().input
          let magValues = remoteInput.mag
          let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)



          if (!remoteInput.down) {
            down = false
            // let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            // startingDeviceOffset =  new THREE.Quaternion().clone().inverse().multiply(deviceQuaternion).normalize().inverse()
            // startingObjectQuaternion = group.quaternion.normalize().clone()
            // startingObjectOffset =  new THREE.Quaternion().clone().inverse().multiply(startingObjectQuaternion)

           }


           if (remoteInput.down && !down) {
            offset = 0-magValues[0]
            down = true

            targetobject = snake.children[0].children[2].skeleton.bones[2]

            let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)
            let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            startingDeviceOffset =  new THREE.Quaternion().clone().inverse().multiply(deviceQuaternion).normalize().inverse()

            startingObjectQuaternion = targetobject.quaternion.clone()
            startingObjectOffset =  new THREE.Quaternion().clone().inverse().multiply(startingObjectQuaternion)


          }

          if (remoteInput.down) {
            let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha + (offset*(Math.PI/180)),-gamma, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ))
            let deviceDifference = new THREE.Quaternion().inverse().multiply(deviceQuaternion).multiply(startingDeviceOffset).normalize()

            let cameraOffset = new THREE.Quaternion().clone().inverse().multiply(targetobject.parent.quaternion.clone())

            let parentOffset = new THREE.Quaternion().clone().inverse().multiply(targetobject.parent.parent.quaternion.clone())

            let objectQuaternion = startingObjectQuaternion.clone().inverse()

            objectQuaternion.multiply(startingObjectOffset)
            objectQuaternion.multiply(cameraOffset.inverse())
            objectQuaternion.multiply(parentOffset.inverse())
            objectQuaternion.multiply(deviceDifference)
            objectQuaternion.multiply(parentOffset.inverse())
            objectQuaternion.multiply(cameraOffset.inverse())
            objectQuaternion.multiply(startingObjectOffset)

            targetobject.quaternion.copy(objectQuaternion.normalize())
            helper.quaternion.copy(objectQuaternion)

          }

          renderer.render( scene, camera )
          requestAnimationFrame( animate )
        }
        animate()
      }
    })




    createScene({ store, label: 'difference applied to a specific bone in an object [rotation: 0,0,0 | camera: 90,0,0 ]', setup: () => {} })
    createScene({ store, label: 'difference applied to a specific bone in an object [rotation: 90,0,0 | camera: 90,0,0 ]', setup: () => {} })
    createScene({ store, label: 'difference applied to a specific bone in an object [rotation: 45,0,0 | camera: 200,0,0 ]', setup: () => {} })

// initialize after WebGL
setTimeout(() => {
  createControls({ store })
}, 150)

createServer({
  setInputAccel: payload => store.dispatch({ type: 'SET_INPUT_ACCEL', payload }),
  setInputMag: payload => store.dispatch({ type: 'SET_INPUT_MAG', payload }),
  setInputSensor: payload => store.dispatch({ type: 'SET_INPUT_SENSOR', payload }),
  setInputDown: payload => store.dispatch({ type: 'SET_INPUT_DOWN', payload }),
  setInputMouseMode: payload => store.dispatch({ type: 'SET_INPUT_MOUSEMODE', payload })
})

const throttle = require('lodash.throttle')
const updater = (values, changed) => {
  store.dispatch(updateDevice(
    0,
    {
      analog: {
        ...values.analog
      },
      motion: {
        ...values.motion
      },
      digital: {
        ...values.digital
      }
    }
  ))
}
createDualShockController(throttle(updater, 16, { leading: true }))
