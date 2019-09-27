const THREE = require('three')
const { clamp, mapLinear } = require('three').Math
const { useMemo, useRef, useCallback } = React = require('react')
const useReduxStore = require('react-redux').useStore
const { useSelector } = require('react-redux')
const { useThree } = require('react-three-fiber')
const { useMachine } = require('@xstate/react')

const { log } = require('../../components/Log')
const uiMachine = require('../../machines/uiMachine')

const R = require('ramda')

// all pose presets (so we can use `stand` for new characters)
const defaultPosePresets = require('../../../../shared/reducers/shot-generator-presets/poses.json')
// id of the pose preset used for new characters
const DEFAULT_POSE_PRESET_ID = '79BBBD0D-6BA2-4D84-9B71-EE661AB6E5AE'

const { create } = require('zustand')
const { produce } = require('immer')
const { setCookie, getCookie } = require('../../helpers/cookies')
const isUserModel = require('../../helpers/is-user-model')
const {
  drawText,
  drawImageButton,
  drawButton,
  drawSlider,
  drawToggleButton,
  roundRect,
  wrapText,
  drawPaneBGs,
  drawGrid
} = require('./draw')

const { setupHomePane, setupAddPane, setupSettingsPane, setupHelpPane } = require('./setup')

const [useUiStore] = create((set, get) => ({
  // values
  switchHand: getCookie('switchHand') == 'true',
  showCameras: getCookie('showCameras') !== 'false',
  showHelp: false,

  // actions
  setSwitchHand: value => set(produce(state => { state.switchHand = value })),
  setShowCameras: value => set(produce(state => { state.showCameras = value })),
  setShowHelp: value => set(produce(state => { state.showHelp = value })),

  set: fn => set(produce(fn))
}))

// round to nearest step value
const steps = (value, step) => parseFloat((Math.round(value * (1 / step)) * step).toFixed(6))

const lenses = {}

let height_step = 0.05
let height_min = 1.4732
let height_max = 2.1336
lenses.characterHeight = R.lens(
  vin => THREE.Math.mapLinear(vin, height_min, height_max, 0, 1),
  vout => {
    let height = mapLinear(vout, 0, 1, height_min, height_max)
    height = steps(height, height_step)
    height = clamp(height, height_min, height_max)
    return height
  }
)
lenses.characterScale = R.lens(
  from => clamp(mapLinear(from, 0.3, 3, 0, 1), 0, 1),
  to => mapLinear(clamp(to, 0, 1), 0, 1, 0.3, 3)
)

lenses.headScale = R.lens(
  vin => clamp(mapLinear(vin, 0.8, 1.2, 0, 1), 0, 1),
  vout => clamp(steps(mapLinear(vout, 0, 1, 0.8, 1.2), 0.01), 0.8, 1.2)
)

for (let propertyName of ['intensity', 'penumbra']) {
  lenses[propertyName] = R.lens(
  vin => clamp(vin, 0, 1),
  vout => clamp(steps(vout, 0.1), 0, 1)
  )
}

lenses.distance = R.lens(
  vin => clamp(mapLinear(vin, 0, 100, 0, 1), 0, 1),
  vout => clamp(steps(mapLinear(vout, 0, 1, 0, 100), 0.1), 0, 100)
)

lenses.angle = R.lens(
  vin => clamp(mapLinear(vin, 0.025, Math.PI / 2, 0, 1), 0, 1),
  vout => clamp(steps(mapLinear(vout, 0, 1, 0.025, Math.PI / 2), 0.01), 0.025, Math.PI / 2)
)

lenses.fov = R.lens(
  from => mapLinear(clamp(from, 3, 71), 3, 71, 1, 0),
  to => mapLinear(clamp(steps(to, 0.01), 0, 1), 1, 0, 3, 71)
)

for (let propertyName of ['width', 'height', 'depth']) {
  lenses[propertyName] = R.lens(
    vin => clamp(mapLinear(vin, 0.1, 5, 0, 1), 0, 1),
    vout => clamp(steps(mapLinear(vout, 0, 1, 0.1, 5), 0.1), 0.1, 5)
  )
}

lenses.morphTargets = R.lens(
  // from morphTarget value to slider internal value
  from => clamp(from, 0, 1),
  // from slider internal value to morphTarget value
  to => clamp(steps(to, 0.1), 0, 1)
)

const rounded = (value, n = 100) => Math.round(value * n) / n

const percent = value => `${value * 100}`

const getFovAsFocalLength = (fov, aspect) => new THREE.PerspectiveCamera(fov, aspect).getFocalLength()

class CanvasRenderer {
  constructor(size, dispatch, service, send, camera, getRoom, getImageByFilepath, cameraAspectRatio) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.canvas.height = size
    this.context = this.canvas.getContext('2d')

    this.helpCanvas = document.createElement('canvas')
    this.helpCanvas.width = this.helpCanvas.height = size
    this.helpContext = this.helpCanvas.getContext('2d')

    this.dispatch = dispatch
    this.service = service
    this.send = send
    this.cameraAspectRatio = cameraAspectRatio
    this.getImageByFilepath = getImageByFilepath

    this.state = {
      activeCamera: null,
      selections: [],
      sceneObjects: {},
      poses: {},
      models: {},
      mode: 'home',
      context: {},
      helpIndex: 0,
      grids: {
        tab: 'pose',
        startCoords: {},
        prevCoords: {},
        character: {
          scrollTop: 0
        },
        object: {
          scrollTop: 0
        },
        pose: {
          scrollTop: 0
        }
      }
    }

    this.paneComponents = {}

    let ctx = this.context
    drawPaneBGs(ctx)

    this.drawGrid = drawGrid.bind(this)

    setupHomePane(this.paneComponents, this)
    setupAddPane(this.paneComponents, this)
    setupSettingsPane(this.paneComponents, this)
    this.renderObjects(ctx, this.paneComponents['home'])
    this.renderObjects(ctx, this.paneComponents['add'])
    this.renderObjects(ctx, this.paneComponents['settings'])
    // setupaddpane
    // setupsettings

    setupHelpPane(this.paneComponents, this)

    // setup each pane


    // ctx.font = '24px/1.4 arial, sans-serif';
    // ctx.fillStyle = 'white';
    // ctx.textBaseline = 'top'
    // wrapText(ctx, '“If You Are Working On Something That You Really Care About, You Don’t Have To Be Pushed. The Vision Pulls You.” – Abraham Lincoln', 463, 899, 422, 26);


    // // home buttons
    // ctx.fillStyle = 'rgba(30,30,30)'
    // roundRect(ctx, 667+8, 684+7, 89, 89, 15, true, false)
    // roundRect(ctx, 667+8+88+7, 684+7, 89, 89, 15, true, false)
    // roundRect(ctx, 667+8, 684+7+88+7, 89, 89, 15, true, false)
    // roundRect(ctx, 667+8+88+7, 684+7+88+7, 89, 89, 15, true, false)

    // ctx.lineWidth = 6
    // ctx.strokeStyle = 'rgba(255,255,255)'
    // ctx.fillStyle = 'rgba(30,30,30)'
    // roundRect(ctx, 570, 30, 380, 89, 17, true, true)

    // ctx.fillStyle = 'rgba(60,60,60)'
    // roundRect(ctx, 570+3, 30+3, 330-6, 89-6, {tl: 15, tr: 0, br: 0, bl: 15}, true, false)

    this.needsRender = false
  }
  render () {


    let canvas = this.canvas
    let ctx = this.context

    let id = this.state.selections[0]
    let sceneObject = this.state.sceneObjects[id]

    console.log("render")

    if (this.state.context.locked) {
      console.log('rendering a locked ui')
    } else {
      console.log('rendering an unlocked ui')
    }

    console.log(this.state.mode)
    if (this.state.mode == 'properties' || this.state.mode == 'grid') {
      if (!sceneObject) return

      let modelSettings = this.state.models[sceneObject.model]

      // Earlier sliders stay visible if not overridden with this
      ctx.fillStyle = 'rgba(0,0,0)'
      roundRect(ctx, 554, 6, 439, 666, 25, true, false)

      this.paneComponents['properties'] = {
        ...(sceneObject.type === 'camera') &&
          {
            fov: {
              label: `Focal Length - ${rounded(getFovAsFocalLength(sceneObject.fov, this.cameraAspectRatio), 1)}mm`,
              lens: R.compose(R.lensPath(['fov']), lenses.fov)
            }
          },

        ...(sceneObject.type === 'object') && {
          ...(sceneObject.model === 'box')
            ? {
              width: {
                label: `Width - ${sceneObject.width}m`,
                lens: R.compose(R.lensPath(['width']), lenses.width)
              },
              height: {
                label: `Height - ${sceneObject.height}m`,
                lens: R.compose(R.lensPath(['height']), lenses.height)
              },
              depth: {
                label: `Depth - ${sceneObject.depth}m`,
                lens: R.compose(R.lensPath(['depth']), lenses.depth)
              }
            }
            : {
              size: {
                label: `Size - ${sceneObject.height}m`,
                lens: R.compose(R.lensPath(['height']), lenses.height)
              }
            }
        },

        ...(sceneObject.type === 'character') &&
          {
            ...(isUserModel(sceneObject.model))
              ? {
                scale: {
                  label: `Scale - ${rounded(percent(sceneObject.height), 1)}%`,
                  lens: R.compose(R.lensPath(['height']), lenses.characterScale)
                }
              }
              : {
                height: {
                  label: `Height - ${rounded(sceneObject.height)}m`,
                  lens: R.compose(R.lensPath(['height']), lenses.characterHeight)
                },
                headScale: {
                  label: `Head - ${rounded(percent(sceneObject.headScale))}%`,
                  lens: R.compose(R.lensPath(['headScale']), lenses.headScale)
                }
              },

            ...(
              modelSettings &&
              modelSettings.validMorphTargets &&
              modelSettings.validMorphTargets.reduce((components, morphTargetName) => {
                let name = 'Morph Target'
                if (morphTargetName == 'ectomorphic') name = 'Skinny'
                if (morphTargetName == 'mesomorphic') name = 'Muscular'
                if (morphTargetName == 'endomorphic') name = 'Obese'
                let pathLens = R.lensPath(['morphTargets', morphTargetName])
                components[morphTargetName] = {
                  label: `${name} - ${Math.round(R.view(pathLens, sceneObject) * 100)}%`,
                  lens: R.compose(pathLens, lenses.morphTargets)
                }
                return components
              }, {})
            )
          },

        ...(sceneObject.type === 'light') &&
          {
            intensity: {
              label: `Intensity - ${rounded(sceneObject.intensity)}`,
              lens: R.compose(R.lensPath(['intensity']), lenses.intensity)
            },
            angle: {
              label: `Angle - ${rounded(THREE.Math.radToDeg(sceneObject.angle), 1)}°`,
              lens: R.compose(R.lensPath(['angle']), lenses.angle)
            },
            distance: {
              label: `Distance - ${rounded(sceneObject.distance)}`,
              lens: R.compose(R.lensPath(['distance']), lenses.distance)
            },
            penumbra: {
              label: `Penumbra - ${rounded(percent(sceneObject.penumbra), 1)}%`,
              lens: R.compose(R.lensPath(['penumbra']), lenses.penumbra)
            }
          }
      }


      let i = -1
      this.paneComponents['properties'] = Object.entries(this.paneComponents['properties']).reduce((components, [key, component]) => {
        i++

        let label = component.label

        let state = R.view(component.lens, sceneObject)

        let setState = value => {
          let result = R.set(component.lens, value, sceneObject)

          // Object sizes
          if (key === 'size') {
            this.dispatch(
              updateObject(sceneObject.id, {
                width: result.height,
                height: result.height,
                depth: result.height
              })
            )

          // character scale
          } else if (key === 'scale') {
            this.dispatch(
              updateObject(sceneObject.id, {
                height: result.height,
              })
            )

          // MorphTargets
          } else if (key.includes('morphic')) {
            this.dispatch(
              updateObject(sceneObject.id, {
                morphTargets: {
                  [key]: result.morphTargets[key]
                }
              })
            )

          // Everything else
          } else {
            this.dispatch(
              updateObject(sceneObject.id, {
                [key]: result[key]
              })
            )
          }
        }

        let onDrag = setState
        let onDrop = setState

        components[key] = {
          ...component,

          id: key,

          type: 'slider',
          x: 570,
          y: 30 + 90 * i,
          width: 420,
          height: 80,

          label,
          state,

          setState,
          onDrag,
          onDrop
        }
        return components
      }, {})

      if (sceneObject.type === 'camera') {
        const isActive = sceneObject.id === this.state.activeCamera

        console.log(this.state.activeCamera, 'moi')

        this.paneComponents['properties']['active-camera'] = {
          id: 'active-camera',
          type: 'slider',
          x: 570,
          y: 30 + 90,
          width: 420,
          height: 80,
          label: isActive ? 'Active Camera' : 'Set as Active Camera',
          state: Number(isActive),
          onSelect: () => {
            if (!isActive) {
              this.dispatch(setActiveCamera(sceneObject.id))
              this.needsRender = true
            }
          }
        }
      }

      if (sceneObject.type === 'character' || sceneObject.type === 'object') {
        roundRect(ctx, 483, 288, 66, 105, 25, true, false)
        this.paneComponents['properties']['extend-button'] = {
          id: 'extend-button',
          type: 'image-button',
          x: 483 - 32 + 66 * 0.5,
          y: 288 - 32 + 105 * 0.5,
          width: 64,
          height: 64,
          image: 'arrow',
          flip: true,

          onSelect: () => {
            this.send('TOGGLE_GRID')
          }
        }
      } else {
        ctx.clearRect(483, 288, 66, 105)
      }
      
      this.renderObjects(ctx, this.paneComponents['properties'])
    }

    if (this.state.mode == 'grid') {
      if (!sceneObject || (sceneObject.type !== 'character' && sceneObject.type !== 'object')) {
        ctx.clearRect(4, 6, 439, 666, 25)
        return
      }

      let titleHeight = 90

      ctx.fillStyle = '#000'
      roundRect(ctx, 4, 6, 439, 666, 25, true, false)

      this.paneComponents['grid'] = {}
      if (sceneObject && sceneObject.type == 'character') {
        const { grids } = this.state
        const characterModels = Object.values(this.state.models).filter(model => model.type === 'character')

        const list = grids.tab === 'pose' ? this.state.poses : characterModels
        this.drawGrid(ctx, 30, 30 + titleHeight, 440 - 55, 670 - 55 - titleHeight, list, grids.tab)

        this.paneComponents['grid']['poses-title'] = {
          id: 'poses-title',
          type: 'slider',
          x: 30,
          y: 30,
          width: (440 - 45) / 2,
          height: titleHeight - 10,
          label: 'Poses',
          state: grids.tab === 'pose',
          onSelect: () => {
            grids.tab = 'pose'
            this.needsRender = true
          }
        }

        this.paneComponents['grid']['characters-title'] = {
          id: 'characters-title',
          type: 'slider',
          x: 30 + (440 - 45) / 2,
          y: 30,
          width: (440 - 45) / 2,
          height: titleHeight - 10,
          label: 'Characters',
          state: grids.tab === 'character',
          onSelect: () => {
            grids.tab = 'character'
            this.needsRender = true
          }
        }
      } else if (sceneObject && sceneObject.type == 'object') {
        const objectModels = Object.values(this.state.models).filter(model => model.type === 'object')
        this.drawGrid(ctx, 30, 30 + titleHeight, 440 - 55, 670 - 55 - titleHeight, objectModels, 'object')

        this.paneComponents['grid']['objects-title'] = {
          id: 'objects-title',
          type: 'slider',
          x: 30,
          y: 30,
          width: 440 - 45,
          height: titleHeight - 10,
          label: 'Objects',
          state: 1
        }
      }

      this.renderObjects(ctx, this.paneComponents['grid'])
    }

    if (this.state.mode == 'settings') {
      this.renderObjects(ctx, this.paneComponents['settings'])
    }
  }

  renderHelp () {

    let canvas = this.helpCanvas
    let ctx = this.helpContext

    console.log('render help')

    this.paneComponents['help']['help-image'] = {
      id: 'help-image',
      type: 'image-button',
      x: 0,
      y: 1024 - 1024 * 0.775 - (230 - 6 - 22 - 48 + 6),
      width: 1024,
      height: 1024 * 0.775,
      image: `help_${this.state.helpIndex + 1}`,
      flipY: true,
      invisible: true
    }

    this.renderObjects(ctx, this.paneComponents['help'])
  }

  drawLoadableImage (filepath, onSuccess, onFail) {
    let image = THREE.Cache.get(filepath)
    if (image) {
      onSuccess(image)
    } else {
      new THREE.ImageBitmapLoader().load(filepath, this.requestRender.bind(this))
      onFail()
    }
  }

  requestRender () {
    this.needsRender = true
  }

  renderObjects (ctx, objects) {
    // TODO: render only what is dirty
    for (let object of Object.values(objects)) {
      let { type, x, y, width, height, image, ...props } = object

      if (object.type === 'text') {
        ctx.save()
        ctx.translate(x, y)
        drawText({
          ctx,

          ...props
        })
        ctx.restore()
      }

      if (object.type === 'toggle-button') {
        const cookieBoolean =
          object.toggle === 'switchHand' ? getCookie(object.toggle) == 'true' : getCookie(object.toggle) !== 'false'

        ctx.save()
        ctx.translate(x, y)
        drawToggleButton({
          ctx,
          width,
          height,
          cookieBoolean,

          ...props
        })
        ctx.restore()
      }

      if (object.type === 'button') {
        ctx.save()
        ctx.translate(x, y)
        drawButton({
          ctx,
          width,
          height,

          ...props
        })
        ctx.restore()
      }

      if (object.type === 'image-button') {
        ctx.save()
        ctx.translate(x, y)
        drawImageButton({
          ctx,
          width,
          height,
          image: this.getImageByFilepath(getIconFilepathByName(image)),

          ...props
        })
        ctx.restore()
      }

      if (object.type === 'slider') {
        ctx.save()
        ctx.translate(x, y)
        drawSlider({
          ctx,
          width,
          height,

          ...props
        })
        ctx.restore()
      }
    }
  }

  // getObjectsForCharacter (sceneObject) {
  //   // const getCharacterRotationSlider = sceneObject => {
  //   //   let characterRotation = mappers.fromRotation(sceneObject.rotation)

  //   //   // TODO when dragging, set to a function which modifies local THREE object
  //   //   //      when dropping, set to a function which dispatches to store
  //   //   let setCharacterRotation = value => {
  //   //     let rotation = mappers.toRotation(THREE.Math.clamp(value, 0, 1))
  //   //     rotation = steps(rotation, THREE.Math.DEG2RAD)

  //   //     this.dispatch(
  //   //       updateObject(
  //   //         sceneObject.id,
  //   //         { rotation }
  //   //       )
  //   //     )
  //   //   }

  //   //   let label = 'rotation:' + mappers.toRotation(value).toFixed(3) + ' rad'

  //   //   let onDrag = (x, y) => setCharacterRotation(x)

  //   //   let onDrop = onDrag

  //   //   return {
  //   //     state: characterRotation,
  //   //     label,
  //   //     onDrag,
  //   //     onDrop
  //   //   }
  //   // }



  //   // TODO for each valid morph target, add a slider

  //   return {
  //     'character-height': {
  //       id: 'character-height',
  //       type: 'slider',
  //       x: 15,
  //       y: 145,
  //       width: 420,
  //       height: 40,

  //       ...getCharacterHeightSlider(sceneObject)
  //     },

  //     // 'character-rotation': {
  //     //   id: 'character-rotation',
  //     //   type: 'slider',
  //     //   x: 15,
  //     //   y: 195 + 60,
  //     //   width: 420,
  //     //   height: 40,
  //     //   ...getCharacterRotationSlider(sceneObject)
  //     // }
  //   }
  // }

  getComponentById (id) {
    for (let paneId in this.paneComponents) {
      for (let componentId in this.paneComponents[paneId]) {
        if (componentId == id) return this.paneComponents[paneId][componentId]
      }
    }
  }

  onSelect (id, u, v) {
    let component = this.getComponentById(id)
    if (component && component.onSelect) {
      let x = u * this.canvas.width
      let y = v * this.canvas.height
      x -= component.x
      y -= component.y
      x = x / component.width
      y = y / component.height
      component.onSelect(x, y)
    }
  }

  onDrag (id, u, v) {
    let component = this.getComponentById(id)
    if (component && component.onDrag) {
      let x = u * this.canvas.width
      let y = v * this.canvas.height
      x -= component.x
      y -= component.y
      x = x / component.width
      y = y / component.height
      component.onDrag(x, y)
    }
  }

  onDrop(id, u, v) {
    let component = this.getComponentById(id)
    if (component && component.onDrop) {
      let x = u * this.canvas.width
      let y = v * this.canvas.height
      x -= component.x
      y -= component.y
      x = x / component.width
      y = y / component.height
      component.onDrop(x, y, u, v)
    }
  }

  getCanvasIntersection (u, v, ignoreInvisible = true, intersectHelp = false) {
    let x = u * this.canvas.width
    let y = v * this.canvas.height

    for (let paneId in this.paneComponents) {
      if (paneId === 'help' && !intersectHelp) continue
      for (let componentId in this.paneComponents[paneId]) {
        let component = this.paneComponents[paneId][componentId]
        if (ignoreInvisible && component.invisible) continue
        let { id, type } = component
        if (
          x > component.x && x < component.x + component.width &&
          y > component.y && y < component.y + component.height
        ) {
        // TODO include local x,y? and u,v?
          return { id, type }
        }
      }
    }
    return null
  }
}

const {
  getSceneObjects,
  getSelections,
  createObject,
  selectObject,
  updateObject,
  deleteObjects,
  duplicateObjects,
  getActiveCamera,
  setActiveCamera,
  undoGroupStart,
  undoGroupEnd
} = require('../../../../shared/reducers/shot-generator')

// via PosePresetsEditor.js
const comparePresetNames = (a, b) => {
  var nameA = a.name.toUpperCase()
  var nameB = b.name.toUpperCase()

  if (nameA < nameB) {
    return -1
  }
  if (nameA > nameB) {
    return 1
  }
  return 0
}
const comparePresetPriority = (a, b) => b.priority - a.priority

const getIconFilepathByName = name => `/data/system/xr/${name}.png`
const getPoseImageFilepathById = id => `/data/presets/poses/${id}.jpg`
const getModelImageFilepathById = id => `/data/system/objects/${id}.jpg`
const getCharacterImageFilepathById = id => `/data/system/dummies/gltf/${id}.jpg`

const useUiManager = ({ playSound, stopSound }) => {
  const { scene, camera } = useThree()

  const store = useReduxStore()

  const setSwitchHand = useUiStore(state => state.setSwitchHand)
  const setShowCameras = useUiStore(state => state.setShowCameras)
  const setShowHelp = useUiStore(state => state.setShowHelp)
  const showHelp = useUiStore().showHelp

  // for now, preload pose, character, and model images to THREE.Cache
  const presets = useSelector(state => state.presets)
  const models = useSelector(state => state.models)
  const cameraAspectRatio = useSelector(state => state.aspectRatio)

  const poses = useMemo(() =>
    Object.values(presets.poses)
      .sort(comparePresetNames)
      .sort(comparePresetPriority)
  , [presets.poses])

  const activeCamera = useSelector(getActiveCamera)

  const [characterModels, objectModels] = useMemo(() =>
    [
      Object.values(models)
        .filter(model => model.type === 'character'),
      Object.values(models)
        .filter(model => model.type === 'object')
    ]
  , [models])

  useMemo(() => {
    // poses
    //   .map(model => model.id)
    //   .map(getPoseImageFilepathById)
    //   .map(THREE.ImageBitmapLoader.load)

    characterModels
      .map(model => model.id)
      .map(getCharacterImageFilepathById)
      .map(filepath => new THREE.ImageBitmapLoader().load(filepath))

    objectModels
      .map(model => model.id)
      .map(getModelImageFilepathById)
      .map(filepath => new THREE.ImageBitmapLoader().load(filepath))
  }, [])

  const [uiCurrent, uiSend, uiService] = useMachine(
    uiMachine,
    {
      immediate: true,
      actions: {
        onTriggerStart (context, event) {
          let u = event.intersection.uv.x
          let v = event.intersection.uv.y

          let cr = getCanvasRenderer()

          let canvasIntersection = cr.getCanvasIntersection(u, v, true, showHelp)

          if (canvasIntersection) {
            let { id } = canvasIntersection

            if (canvasIntersection.type == 'button') {
              playSound('select')
              cr.onSelect(id, u, v)
              uiService.send({ type: 'REQUEST_DRAG', controller: event.controller, id })
            }

            if (canvasIntersection.type == 'image-button') {
              playSound('select')
              cr.onSelect(id, u, v)
            }

            if (canvasIntersection.type == 'toggle-button') {
              playSound('select')
              cr.onSelect(id, u, v)
            }

            if (canvasIntersection.type == 'slider') {
              playSound('select')
              cr.onSelect(id, u, v)
              uiService.send({ type: 'REQUEST_DRAG', controller: event.controller, id })
            }
          }
        },

        onDraggingEntry (context, event) {
        },

        onDraggingExit (context, event) {
          if (event.intersection) {
            let u = event.intersection.uv.x
            let v = event.intersection.uv.y
            getCanvasRenderer().onDrop(context.selection, u, v)
          }
        },

        onDrag (context, event) {
          let u = event.intersection.uv.x
          let v = event.intersection.uv.y
          getCanvasRenderer().onDrag(context.selection, u, v)
        },

        onAddObject (context, event) {
          const { object } = event
          const id = THREE.Math.generateUUID()

          let offsetVector = new THREE.Vector3(0, 0, -2)
          if (object === 'camera') offsetVector.normalize()

          // TODO WorldScale multipliers
          offsetVector.applyMatrix4(new THREE.Matrix4().extractRotation(camera.matrixWorld))
          offsetVector.multiply(new THREE.Vector3(1, 0, 1))
          const newPos = camera.parent.position
            .clone()
            .add(camera.position)
            .add(offsetVector)

          const rotation = new THREE.Vector2(offsetVector.x, offsetVector.z).normalize().angle() * -1 - Math.PI / 2

          switch (object) {
            case 'camera':
              store.dispatch(
                createObject({
                  id,
                  type: 'camera',
                  fov: 22.25,
                  x: newPos.x,
                  y: newPos.z,
                  z: newPos.y,
                  rotation: rotation,
                  tilt: 0,
                  roll: 0
                })
              )
              break
            case 'object':
              store.dispatch(
                createObject({
                  id,
                  type: 'object',
                  model: 'box',
                  width: 1,
                  height: 1,
                  depth: 1,
                  x: newPos.x,
                  y: newPos.z,
                  z: 0,
                  rotation: { x: 0, y: rotation, z: 0 },
                  visible: true
                })
              )
              break
            case 'character':
              store.dispatch(
                createObject({
                  id,
                  type: 'character',
                  height: 1.8,
                  model: 'adult-male',
                  x: newPos.x,
                  y: newPos.z,
                  z: 0,
                  rotation: rotation,
                  headScale: 1,

                  morphTargets: {
                    mesomorphic: 0,
                    ectomorphic: 0,
                    endomorphic: 0
                  },

                  posePresetId: DEFAULT_POSE_PRESET_ID,
                  skeleton: defaultPosePresets[DEFAULT_POSE_PRESET_ID].state.skeleton,
                  visible: true
                })
              )
              break
            case 'light':
              store.dispatch(
                createObject({
                  id,
                  type: 'light',
                  x: newPos.x,
                  y: newPos.z,
                  z: newPos.y,
                  intensity: 0.8,
                  angle: 1.04,
                  distance: 5,
                  penumbra: 1.0,
                  decay: 1,
                  rotation: 0,
                  tilt: 0,
                  visible: true
                })
              )
              break
          }

          playSound('create')
        },

        onDuplicate (context, event) {
          const { selections } = event
          const id = THREE.Math.generateUUID()
          if (selections.length) {
            store.dispatch(duplicateObjects([selections[0]], [id]))
            playSound('create')
          }
        },

        onDelete (context, event) {
          const { selections } = event
          // deselect object before deleting
          if (selections.length && selections[0] !== activeCamera) {
            store.dispatch(undoGroupStart())
            store.dispatch(selectObject(null))
            store.dispatch(deleteObjects([selections[0]]))
            store.dispatch(undoGroupEnd())
            playSound('delete')
          }
        },

        onToggleSwitch (context, event) {
          const { toggle } = event
          const cookie = getCookie(toggle)
          const value = !('switchHand' ? cookie == 'true' : cookie !== 'false')
          setCookie(toggle, value, 90)

          if (toggle === 'switchHand') setSwitchHand(value)
          if (toggle === 'showCameras') setShowCameras(value)
          getCanvasRenderer().needsRender = true
          playSound('select')
        },

        onToggleHelp (context, event) {
          // if show help is being shown ...
          if (showHelp) {
            // ... we're about to hide it, so stop the help sounds
            stopSound('help')
          } else {
            playSound(`help${getCanvasRenderer().state.helpIndex + 1}`)
          }
          setShowHelp(!showHelp)
        },

        onIncrementHelp (context, event) {
          const slideCount = 10
          const { direction } = event
          const { helpIndex } = getCanvasRenderer().state

          if (direction === 'increment') {
            getCanvasRenderer().state.helpIndex = (helpIndex + 1) % slideCount
          } else {
            const value = helpIndex - 1
            getCanvasRenderer().state.helpIndex = value < 0 ? slideCount - 1 : value
          }
          playSound(`help${getCanvasRenderer().state.helpIndex + 1}`)

          getCanvasRenderer().helpNeedsRender = true
        }
      }
    }
  )

  const canvasRendererRef = useRef(null)
  const getCanvasRenderer = useCallback(() => {
    if (canvasRendererRef.current === null) {
      const getRoom = () => scene.getObjectByName('room')
      const getImageByFilepath = filepath => THREE.Cache.get(filepath)

      canvasRendererRef.current = new CanvasRenderer(
        1024,
        store.dispatch,
        uiService,
        uiSend,
        camera,
        getRoom,
        getImageByFilepath,
        cameraAspectRatio
      )
    }
    return canvasRendererRef.current
  }, [])

  const selections = useSelector(getSelections)
  const sceneObjects = useSelector(getSceneObjects)

  useMemo(() => {
    getCanvasRenderer().state.selections = selections
    getCanvasRenderer().state.sceneObjects = sceneObjects
    getCanvasRenderer().state.poses = poses
    getCanvasRenderer().state.models = models
    getCanvasRenderer().state.activeCamera = activeCamera
    getCanvasRenderer().needsRender = true
    getCanvasRenderer().helpNeedsRender = true

    if (selections.length) {
      uiSend('GO_PROPERTIES')
    } else {
      uiSend('GO_HOME')
    }
  }, [selections, sceneObjects, poses, models, activeCamera])

  useMemo(() => {
    getCanvasRenderer().state.mode = uiCurrent.value.controls
    getCanvasRenderer().needsRender = true
  }, [uiCurrent.value.controls])

  useMemo(() => {
    getCanvasRenderer().state.context = uiCurrent.context
    getCanvasRenderer().needsRender = true
  }, [uiCurrent.context])

  return { uiService, uiCurrent, getCanvasRenderer }
}

const UI_ICON_NAMES = [
  'selection', 'duplicate', 'add', 'erase', 'arrow', 'hand', 'help',
  'close', 'settings',

  'camera', 'eye',

  'icon-toolbar-camera',
  'icon-toolbar-object',
  'icon-toolbar-character',
  'icon-toolbar-light',

  'pose', 'object',

  'help_1', 'help_2', 'help_3', 'help_4', 'help_5', 'help_6', 'help_7',
  'help_8', 'help_9', 'help_10'
]

const UI_ICON_FILEPATHS = UI_ICON_NAMES.map(getIconFilepathByName)

module.exports = {
  useUiStore,
  useUiManager,
  UI_ICON_FILEPATHS
}
