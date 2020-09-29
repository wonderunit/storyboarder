const THREE = require('three')
const { clamp, mapLinear } = require('three').Math
const { useMemo, useRef, useCallback, useEffect } = React = require('react')
const useReduxStore = require('react-redux').useStore
const { useSelector } = require('react-redux')
const { useThree } = require('react-three-fiber')
const { useMachine } = require('@xstate/react')

const { log } = require('../../components/Log')
const uiMachine = require('../../machines/uiMachine')

const R = require('ramda')

const { create } = require('zustand')
const { produce } = require('immer')

const RemoteData = require('../../client/RemoteData')

const useIsXrPresenting = require('../../hooks/use-is-xr-presenting')
const { setCookie, getCookie } = require('../../helpers/cookies')
const isUserModel = require('../../helpers/is-user-model')
const {
  drawText,
  drawImageButton,
  drawButton,
  drawSlider,
  drawToggleButton,
  roundRect,
  drawPaneBGs,
  drawGrid,
  drawRow
} = require('./draw')

const { useTranslation } = require('react-i18next')

const { setupHomePane, setupAddPane, setupHelpPane, setupBoardsPane } = require('./setup')

const [useUiStore] = create((set, get) => ({
  // values
  switchHand: getCookie('switchHand') == 'true',
  showCameras: getCookie('showCameras') !== 'false',
  showHelp: false,
  showHUD: false,

  showConfirm: false,

  boardUid: null,
  serverHash: null,
  serverLastSavedHash: null,

  // actions
  setSwitchHand: value => set(produce(state => { state.switchHand = value })),
  setShowCameras: value => set(produce(state => { state.showCameras = value })),
  setShowHelp: value => set(produce(state => { state.showHelp = value })),
  setShowHUD: value => set(produce(state => { state.showHUD = value })),

  setShowConfirm: value => set(produce(state => { state.showConfirm = value })),

  setBoardUid: value => set(produce(state => { state.boardUid = value })),
  setServerHash: value => set(produce(state => { state.serverHash = value })),
  setServerLastSavedHash: value => set(produce(state => { state.serverLastSavedHash = value })),

  set: fn => set(produce(fn))
}))

// round to nearest step value
const steps = (value, step) => parseFloat((Math.round(value * (1 / step)) * step).toFixed(6))

const lensFactory = (min, max, step = 0.05) => R.lens(
  from => THREE.Math.mapLinear(from, min, max, 0, 1),
  to => {
    let value = mapLinear(to, 0, 1, min, max)
    value = steps(value, step)
    value = clamp(value, min, max)
    return value
  }
)

const lenses = {}

lenses.characterHeight = lensFactory(1.4732, 2.1336)
lenses.childHeight = lensFactory(1.003, 1.384)
lenses.babyHeight = lensFactory(0.492, 0.94)

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
  vin => clamp(mapLinear(vin, 0.1, 100, 0, 1), 0, 1),
  vout => clamp(steps(mapLinear(vout, 0, 1, 0.1, 100), 0.1), 0.1, 100)
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

lenses.opacity = R.lens(
  vin => clamp(mapLinear(vin, 0.1, 1, 0, 1), 0, 1),
  vout => clamp(steps(mapLinear(vout, 0, 1, 0.1, 1), 0.1), 0.1, 1)
)

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
  constructor(size, dispatch, service, send, camera, getRoom, getImageByFilepath, cameraAspectRatio, shotGenerator) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.canvas.height = size
    this.context = this.canvas.getContext('2d')

    this.helpCanvas = document.createElement('canvas')
    this.helpCanvas.width = this.helpCanvas.height = size
    this.helpContext = this.helpCanvas.getContext('2d')

    this.boardsCanvas = document.createElement('canvas')
    this.boardsCanvas.width = this.boardsCanvas.height = size
    this.boardsContext = this.boardsCanvas.getContext('2d')

    this.shotGenerator = shotGenerator
    this.dispatch = dispatch
    this.service = service
    this.send = send
    this.cameraAspectRatio = cameraAspectRatio
    this.getImageByFilepath = getImageByFilepath

    this.state = {
      activeCamera: null,
      selections: [],
      sceneObjects: {},
      world: null,
      poses: {},
      handPoses: {},
      models: {},
      board: {},
      mode: 'home',
      context: {},
      helpIndex: 0,
      showSettings: false,
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
        },
        handPoses: {
          scrollTop: 0
        }
      },
      selectedHand: "BothHands",
      boards: {
        showConfirm: false,
        confirmChange: null,
        confirmDialogType: null,
        startCoords: {},
        prevCoords: {},
        cameras: {
          scrollTop: null
        },
        boards: {
          scrollTop: null
        }
      },
      boardsData: RemoteData.init(),
      sgCurrentState: RemoteData.init(),
      cameraThumbnails: {}
    }

    this.paneComponents = {}

    let ctx = this.context
    drawPaneBGs(ctx)

    this.drawGrid = drawGrid.bind(this)
    this.drawRow = drawRow.bind(this)

    setupHomePane(this.paneComponents, this)
    setupAddPane(this.paneComponents, this)
    this.renderObjects(ctx, this.paneComponents['home'])
    this.renderObjects(ctx, this.paneComponents['add'])
    // setupaddpane
    // setupsettings

    setupHelpPane(this.paneComponents, this)
    setupBoardsPane(this.paneComponents, this)

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

    this.state.boardsData = RemoteData.init()
    this.state.sgCurrentState = RemoteData.init()
    // this.client.getState().then(result => {
    //   this.state.sgCurrentState = RemoteData.success(result)
    //   this.boardsNeedsRender = true
    //   this.send('SET_BOARDUID', { uid: result.board.uid })
    // }).catch(err => {
    //   this.state.sgCurrentState = RemoteData.failure(err)
    //   this.boardsNeedsRender = true
    //   this.send('SET_BOARDUID', { uid: null })
    // })

    this.needsRender = false
  }
  render (t) {
    this.state.boardsData.cata({
      NOT_ASKED: () => {
        console.log('boards list has not loaded')
      },
      LOADING: () => {
        console.log('boards list is loading')
      },
      SUCCESS: data => {
        // console.log('boards list has loaded', data)
        // data.map(board =>
        //   console.log(`board ${board.uid}: sg? ${board.hasSg ? 'yes' : 'no'}, thumbnail: ${board.thumbnail}`)
        // )
      },
      FAILURE: err => {
        console.error('boards list failed', err)
      }
    })

    let canvas = this.canvas
    let ctx = this.context

    let id = this.state.selections[0]
    let sceneObject = this.state.sceneObjects[id]

    // console.log("render")
    if(this.state.context.isUIHidden)  return

    if (this.state.context.locked) {
      // console.log('rendering a locked ui')
    } else {
      // console.log('rendering an unlocked ui')
    }

    // console.log(this.state.mode)
    if (this.state.mode == 'properties' || this.state.mode == 'grid') {
      if (!sceneObject) return

      let modelSettings = this.state.models[sceneObject.model]

      // Earlier sliders stay visible if not overridden with this
      ctx.fillStyle = 'rgba(0,0,0)'
      roundRect(ctx, 554, 6, 439, 666, 25, true, false)

      let characterHeightLens = lenses.characterHeight
      if (sceneObject.model === 'child') characterHeightLens = lenses.childHeight
      if (sceneObject.model === 'baby') characterHeightLens = lenses.babyHeight

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
                label: `${t("xr.controls.width")} - ${sceneObject.width}m`,
                lens: R.compose(R.lensPath(['width']), lenses.width)
              },
              height: {
                label: `${t("xr.controls.height")} - ${sceneObject.height}m`,
                lens: R.compose(R.lensPath(['height']), lenses.height)
              },
              depth: {
                label: `${t("xr.controls.depth")} - ${sceneObject.depth}m`,
                lens: R.compose(R.lensPath(['depth']), lenses.depth)
              }
            }
            : {
              size: {
                label: `${t("xr.controls.size")} - ${sceneObject.height}m`,
                lens: R.compose(R.lensPath(['height']), lenses.height)
              }
            }
        },

        ...(sceneObject.type === 'image') && {
          size: {
            label: `${t("xr.controls.size")} - ${sceneObject.height}m`,
            lens: R.compose(R.lensPath(['height']), lenses.height)
          },
          opacity: {
            label: `${t("xr.controls.opacity")} - ${sceneObject.opacity}`,
            lens: R.compose(R.lensPath(['opacity']), lenses.opacity)
          }
        },

        ...(sceneObject.type === 'character') &&
          {
            ...(isUserModel(sceneObject.model))
              ? {
                scale: {
                  label: `${t("xr.controls.scale")} - ${rounded(percent(sceneObject.height), 1)}%`,
                  lens: R.compose(R.lensPath(['height']), lenses.characterScale)
                }
              }
              : {
                height: {
                  label: `${t("xr.controls.height")} - ${rounded(sceneObject.height)}m`,
                  lens: R.compose(R.lensPath(['height']), characterHeightLens)
                },
                headScale: {
                  label: `${t("xr.controls.head")} - ${rounded(percent(sceneObject.headScale))}%`,
                  lens: R.compose(R.lensPath(['headScale']), lenses.headScale)
                }
              },

            ...(
              modelSettings &&
              modelSettings.validMorphTargets &&
              modelSettings.validMorphTargets.reduce((components, morphTargetName) => {
                let name = t('xr.controls.morph-target')
                if (morphTargetName == 'ectomorphic') name = t('xr.controls.skinny')
                if (morphTargetName == 'mesomorphic') name = t('xr.controls.muscular')
                if (morphTargetName == 'endomorphic') name = t('xr.controls.obese')
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
              label: `${t('xr.controls.intensity')} - ${rounded(sceneObject.intensity)}`,
              lens: R.compose(R.lensPath(['intensity']), lenses.intensity)
            },
            angle: {
              label: `${t('xr.controls.angle')} - ${rounded(THREE.Math.radToDeg(sceneObject.angle), 1)}°`,
              lens: R.compose(R.lensPath(['angle']), lenses.angle)
            },
            distance: {
              label: `${t('xr.controls.distance')} - ${rounded(sceneObject.distance)}`,
              lens: R.compose(R.lensPath(['distance']), lenses.distance)
            },
            penumbra: {
              label: `${t('xr.controls.penumbra')} - ${rounded(percent(sceneObject.penumbra), 1)}%`,
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
          y: 30 + 90 * (i + 1),
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

      this.paneComponents['properties']['title'] = {
        id: 'title',
        type: 'text',
        x: 570,
        y: 30 + 16,
        label: `${sceneObject.name || sceneObject.displayName}`,
        size: 40,
        weight: 'bold'
      }

      if (sceneObject.type === 'image') {
        this.paneComponents['properties']['visible-to-camera'] = {
          id: 'visible-to-camera',
          type: 'slider',
          x: 570,
          y: 30 + 90 * 3,
          width: 420,
          height: 80,
          label: sceneObject.visibleToCam ? t('xr.controls.visible-to-camera') : t('xr.controls.set-visible-to-camera'),
          state: Number(sceneObject.visibleToCam),
          onSelect: () => {
            this.dispatch(
              updateObject(sceneObject.id, {
                visibleToCam: !sceneObject.visibleToCam
              })
            )
            this.needsRender = true
          }
        }
      }

      if (sceneObject.type === 'camera') {
        const isActive = sceneObject.id === this.state.activeCamera

        this.paneComponents['properties']['active-camera'] = {
          id: 'active-camera',
          type: 'slider',
          x: 570,
          y: 30 + 90 * 2,
          width: 420,
          height: 80,
          label: isActive ? t('xr.controls.active-camera') : t('xr.controls.set-active-camera'),
          state: Number(isActive),
          onSelect: () => {
            if (!isActive) {
              this.dispatch(setActiveCamera(sceneObject.id))
              this.needsRender = true
            }
          }
        }
      }

      if (sceneObject.type === 'character') {
        const characterSliders = Object.values(this.paneComponents['properties']).filter(component => component.type === 'slider')

        this.paneComponents['properties']['pose-capture'] = {
          id: 'pose-capture',
          type: 'slider',
          x: 570,
          y: 30 + 90 * (characterSliders.length + 1),
          width: 420,
          height: 80,
          label: t('xr.controls.pose-capture'),
          state: 0,
          onSelect: () => {
            this.interactionServiceSend('POSE_CHARACTER')
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
        const list = grids.tab === 'pose' ? this.state.poses : grids.tab === "handPoses" ? this.state.handPoses : characterModels
        const rowCount = grids.tab === 'character' ? 2 : 4
        let spaceForTitle = titleHeight
        if(grids.tab === "handPoses") spaceForTitle *= 2
        this.drawGrid(ctx, 30, 30 + spaceForTitle, 440 - 55, 670 - 55 - spaceForTitle, list, grids.tab, rowCount, sceneObject, this.state.selectedHand)

        let buttonSize = 310

        this.paneComponents['grid']['poses-title'] = {
          id: 'poses-title',
          type: 'image-button',
          x: 30,
          y: 30,
          width: (buttonSize - 45) / 2,
          height: titleHeight - 10,
          image: 'pose-preset',
          stroke: true,
          state: grids.tab === 'pose',
          drawSquare: true,
          onSelect: () => {
            grids.tab = 'pose'
            this.needsRender = true
          }
        }

        this.paneComponents['grid']['characters-title'] = {
          id: 'characters-title',
          type: 'image-button',
          x: 30 + (buttonSize - 45),
          y: 30,
          width: (buttonSize - 45) / 2,
          height: titleHeight - 10,
          image: 'model-type',
          stroke: true,
          state: grids.tab === 'character',
          drawSquare: true,
          onSelect: () => {
            grids.tab = 'character'
            this.needsRender = true
          }
        }


        this.paneComponents['grid']['hand-poses-title'] = {
          id: 'hand-poses-title',
          type: 'image-button',
          x: 30 + (buttonSize - 45) / 2,
          y: 30,
          width: (buttonSize - 45) / 2,
          height: titleHeight - 10,
          image: 'hand-preset',
          stroke: true,
          state: grids.tab === 'handPoses',
          drawSquare: true,
          onSelect: () => {
            grids.tab = 'handPoses'
            this.needsRender = true
          }
        }



        this.paneComponents['grid']['hand-poses-title']['left-hand'] = {
          id: 'left-hand',
          type: 'slider',
          x: 30,
          y: 30 + 90,
          width: (buttonSize - 45) / 2,
          height: titleHeight - 10,
          label: t('xr.controls.left'),
          state: this.state.selectedHand === 'LeftHand',
          onSelect: () => {
            this.state.selectedHand = "LeftHand"
          }
        }

        this.paneComponents['grid']['hand-poses-title']['both-hands'] = {
          id: 'both-hands',
          type: 'slider',
          x: 30 + (buttonSize - 45) / 2,
          y: 30 + 90,
          width: (buttonSize - 45) / 2,
          height: titleHeight - 10,
          label: t('xr.controls.both'),
          state: this.state.selectedHand === 'BothHands',
          onSelect: () => {
            this.state.selectedHand = "BothHands"
          }
        }

        this.paneComponents['grid']['hand-poses-title']['right-hand'] = {
          id: 'right-hand',
          type: 'slider',
          x: 30 + (buttonSize - 45),
          y: 30 + 90,
          width: (buttonSize - 45) / 2,
          height: titleHeight - 10,
          label: t('xr.controls.right'),
          state: this.state.selectedHand === 'RightHand',
          onSelect: () => {
            this.state.selectedHand = "RightHand"
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
          label: t('xr.controls.objects'),
          state: 1
        }
      }

      this.renderObjects(ctx, this.paneComponents['grid'])
      if(sceneObject && sceneObject.type === 'character' && this.state.grids.tab === 'handPoses')
      this.renderObjects(ctx, this.paneComponents['grid']['hand-poses-title'])
    }
  }

  renderHelp () {

    let canvas = this.helpCanvas
    let ctx = this.helpContext
    if(this.state.context.isUIHidden) {
      return
    }
    // console.log('render help')

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

  renderBoards (t) {

    let canvas = this.boardsCanvas
    let ctx = this.boardsContext

    // Reset all boards items, otherwise many thumbnails buttons exists
    setupBoardsPane(this.paneComponents, this)

    // console.log('render boards')

    ctx.fillStyle = 'rgba(0,0,0)'
    roundRect(ctx, 0, 0, 1024, 400, 25, true, false)

    const sceneCameras = Object.values(this.state.sceneObjects).filter(model => model.type === 'camera')
    const activeCameraIndex = Object.values(sceneCameras).findIndex(camera => camera.id === this.state.activeCamera)

    this.state.boardsData.cata({
      SUCCESS: data => {
        if (this.state.board) {
          this.drawRow(ctx, 15, 15, 1024 - 30, 370 * 0.6 - 15, sceneCameras, 'cameras', activeCameraIndex)

          const sgBoards = data.filter(board => board.hasSg)
          const activeBoardIndex = Object.values(sgBoards).findIndex(board => board.uid === this.state.board.uid)
          this.drawRow(ctx, 15, 15 + 370 * 0.6, 1024 - 30, 370 * 0.4, sgBoards, 'boards', activeBoardIndex)
        }
      }
    })

    if (this.state.boards.showConfirm) {
      ctx.fillStyle = 'rgba(0,0,0)'
      roundRect(ctx, 0, 430 + 18 * 3, 118 + 168 + 18 * 4 + 15, 18 * 3 * 2 + 30, 25, true, false)

      const labels = this.state.boards.confirmDialogType === 'overwrite' ?
        [t(`xr.boards.sg-has-unsaved-changed`), t(`xr.boards.overwrite-with-vr-changes`)] :
        [t(`xr.boards.changes-not-saved`), t(`xr.boards.change-without-saving`)]

      this.paneComponents['boards']['confirm-1'] = {
        id: 'confirm-1',
        type: 'text',
        x: 15,
        y: 430 + 18 * 3 + 15,
        label: labels[0],
        size: 14
      }

      this.paneComponents['boards']['confirm-2'] = {
        id: 'confirm-2',
        type: 'text',
        x: 15,
        y: 430 + 18 * 3 + 15 + 27,
        label: labels[1],
        size: 14
      }

      this.paneComponents['boards']['confirm-ok'] = {
        id: 'confirm-ok',
        type: 'button',
        x: 15,
        y: 430 + 18 * 3 + (18 * 3 * 2 + 30) - 18 * 3 - 15,
        width: 118 + 18 * 2 - 15,
        height: 18 * 3,
        fill: '#737373',
        label: t('xr.boards.ok'),
        fontSize: 18,
        fontWeight: 'bold',

        onSelect: () => {
          this.state.boards.confirmChange = true
        }
      }

      this.paneComponents['boards']['confirm-cancel'] = {
        id: 'confirm-cancel',
        type: 'button',
        x: 118 + 18 * 2 + 15,
        y: 430 + 18 * 3 + (18 * 3 * 2 + 30) - 18 * 3 - 15,
        width: 168 + 18 * 2 - 15,
        height: 18 * 3,
        fill: '#4D4E51',
        label: t('xr.boards.cancel'),
        fontSize: 18,
        fontWeight: 'bold',

        onSelect: () => {
          this.state.boards.confirmChange = false
        }
      }
    }

    if (this.state.showSettings) {
      ctx.fillStyle = 'rgba(0,0,0)'
      roundRect(ctx, 1024 - 439, 483 - 3, 439, 325 - 114, 25, true, false)

      this.paneComponents['boards']['settings'] = {
        id: 'settings',
        type: 'text',
        x: 1024 - 439 + 30,
        y: 483 + 30,
        label: t('xr.boards.settings'),
        size: 36
      }

      this.paneComponents['boards']['show-cameras'] = {
        id: 'show-cameras',
        type: 'text',
        x: 1024 - 439 + 30,
        y: 483 + 20 + 48 + 40 + 40 - 12,
        label: t('xr.boards.show-cameras'),
        size: 24
      }

      this.paneComponents['boards']['show-cameras-toggle'] = {
        id: 'show-cameras-toggle',
        type: 'toggle-button',
        toggle: 'showCameras',
        x: 1024 - 439 + 30 + 200,
        y: 483 + 20 + 48 + 40,
        width: 200,
        height: 80,
        onSelect: () => {
          this.send('TOGGLE_SWITCH', { toggle: 'showCameras' })
        }
      }

      // this.paneComponents['boards']['help-button'] = {
      //   id: 'help-button',
      //   type: 'image-button',
      //   x: 1024 - 64 - 15,
      //   y: 483 + 20,
      //   width: 64,
      //   height: 64,
      //   image: 'help',
      //   drawBG: true,
      //   padding: 6,
      //   fill: '#6E6E6E',

      //   onSelect: () => {
      //     this.send('TOGGLE_HELP')
      //     this.send('GO_HOME')
      //   }
      // }
    }


    this.renderObjects(ctx, this.paneComponents['boards'])

    if (!this.state.boards.showConfirm) {
      ctx.clearRect(0, 430 + 18 * 3, 118 + 168 + 18 * 4 + 15, 18 * 3 * 2 + 30)
    }

    if (!this.state.showSettings) {
      ctx.clearRect(1024 - 439, 483 - 3, 439, 325 - 114)
    }
  }

  drawLoadableImage (filepath, onSuccess, onFail) {
    let image = THREE.Cache.get(filepath)
    if (image) {
      onSuccess(image)
    } else {
      SG.getResource('image', filepath)
      .then(({type, filePath, data}) => {
        onBitmapImageBufferLoad(filepath, data)
        .then((bitmap) => {
          console.log('BITMAP LOADED: ', filepath)
          THREE.Cache.add( filepath, bitmap )
          this.requestRender()
        })
        .catch(err => {
          console.log('BITMAP ERROR', err)
        })
      })
      //ImageBitmapLoader
      onFail()
    }
  }

  requestRender () {
    this.needsRender = true
    this.boardsNeedsRender = true
  }

  renderObjects (ctx, objects) {
    if(this.state.context.isUIHidden)  return
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
        for(let subComponentId in this.paneComponents[paneId][componentId]) {
          if(this.paneComponents[paneId][componentId][subComponentId] instanceof Object) {
              if (subComponentId == id) return this.paneComponents[paneId][componentId][subComponentId]
            }
        }
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

  onHide () {
    this.context.clearRect(0, 0, 1000, 1000,)
   // this.helpContext.clearRect(-10000, -10000, 120000, 120000)
   // useUiStore(state => state.setShowHelp)(false)
  }

  onShow (t) {
    let ctx =  this.context
    this.state.context.isUIHidden = false
    drawPaneBGs(ctx)
    this.renderObjects(ctx, this.paneComponents['home'])
    this.renderObjects(ctx, this.paneComponents['add'])
    this.renderObjects(ctx, this.paneComponents['settings'])
    this.render(t)
  }

  getCanvasIntersection (u, v, ignoreInvisible = true, intersectHelp = false) {
    let x = u * this.canvas.width
    let y = v * this.canvas.height

    for (let paneId in this.paneComponents) {
      if (paneId === 'help' && !intersectHelp) continue

      if (paneId === 'boards') x = (u - 1) * this.canvas.width
      else x = u * this.canvas.width

      for (let componentId in this.paneComponents[paneId]) {
        if (paneId === 'boards' && componentId.includes('-background')) continue

        let component = this.paneComponents[paneId][componentId]
        for (let subComponentId in this.paneComponents[paneId][componentId]) {
          let subComponent = this.paneComponents[paneId][componentId][subComponentId]
          if (ignoreInvisible && subComponent.invisible) continue
          let { id, type } = subComponent
          if (
            x > subComponent.x && x < subComponent.x + subComponent.width &&
            y > subComponent.y && y < subComponent.y + subComponent.height
            ) {
          // TODO include local x,y? and u,v?
            return { id, type }
          }
        }
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

    for (let componentId in this.paneComponents['boards']) {
      x = (u - 1) * this.canvas.width

      let component = this.paneComponents['boards'][componentId]
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

    return null
  }
}

const {
  getSceneObjects,
  getSelections,
  getWorld,
  createObject,
  selectObject,
  updateObject,
  deleteObjects,
  duplicateObjects,
  getActiveCamera,
  setActiveCamera,
  undoGroupStart,
  undoGroupEnd,
  loadScene,

  getDefaultPosePreset,

  setBoard,
  reducer,
  getHash
} = require('../../../../shared/reducers/shot-generator')
const { onBitmapImageBufferLoad } = require('../../helpers/resourceLoaders')

// the 'stand' pose preset used for new characters
const defaultPosePreset = getDefaultPosePreset()

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

const useUiManager = ({ playSound, stopSound, SG }) => {
  const { scene, camera, gl } = useThree()
  const { t } = useTranslation()
  const store = useReduxStore()

  const setSwitchHand = useUiStore(state => state.setSwitchHand)
  const setShowCameras = useUiStore(state => state.setShowCameras)
  const setShowHelp = useUiStore(state => state.setShowHelp)
  const setShowHUD = useUiStore(state => state.setShowHUD)

  const setBoardUid = useUiStore(state => state.setBoardUid)

  const setShowConfirm = useUiStore(state => state.setShowConfirm)

  const showHelp = useUiStore(state => state.showHelp)
  const showHUD = useUiStore(state => state.showHUD)

  // for now, preload pose, character, and model images to THREE.Cache
  const presets = useSelector(state => state.presets)
  const board = useSelector(state => state.board)
  const models = useSelector(state => state.models)
  const cameraAspectRatio = useSelector(state => state.aspectRatio)
  const poses = useMemo(() =>
    Object.values(presets.poses)
      .sort(comparePresetNames)
      .sort(comparePresetPriority)
  , [presets.poses])

  const handPoses = useMemo(() =>
  Object.values(presets.handPoses)
    .sort(comparePresetNames)
    .sort(comparePresetPriority)
, [presets.handPoses])

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
      .map(filepath => {
        SG.getResource('image', filepath)
        .then(({type, filePath, data}) => {
          onBitmapImageBufferLoad(filepath, data)
          .then((bitmap) => {
            console.log('BITMAP LOADED: ', filepath)
            THREE.Cache.add( filepath, bitmap )
          })
          .catch(err => {
            console.log('BITMAP ERROR', err)
          })
        })
      })
      //.map(filepath => new THREE.ImageBitmapLoader().load(filepath))

    objectModels
      .map(model => model.id)
      .map(getModelImageFilepathById)
      .map(filepath => {
        SG.getResource('image', filepath)
        .then(({type, filePath, data}) => {
          onBitmapImageBufferLoad(filepath, data)
          .then((bitmap) => {
            console.log('BITMAP LOADED: ', filepath)
            THREE.Cache.add( filepath, bitmap )
          })
          .catch(err => {
            console.log('BITMAP ERROR', err)
          })
        })
      })
      //.map(filepath => new THREE.ImageBitmapLoader().load(filepath))
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
                  z: newPos.y - camera.position.y * 0.5,
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

                  posePresetId: defaultPosePreset.id,
                  skeleton: defaultPosePreset.state.skeleton,
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
          uiSend('GO_HOME')
        },

        onDuplicate (context, event) {
          const { selections } = event
          const id = THREE.Math.generateUUID()
          if (selections.length) {
            store.dispatch(duplicateObjects([selections[0]], [id]))
            playSound('create')
            uiSend('GO_HOME')
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
            uiSend('GO_HOME')
          }
        },

        onToggleSwitch (context, event) {
          const { toggle } = event
          const cookie = getCookie(toggle)
          const value = !('switchHand' ? cookie == 'true' : cookie !== 'false')
          setCookie(toggle, value, 90)

          if (toggle === 'switchHand') setSwitchHand(value)
          if (toggle === 'showCameras') setShowCameras(value)
          getCanvasRenderer().boardsNeedsRender = true
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
        },

        onHideUI (context, event) {
          getCanvasRenderer().onHide()
          if(showHelp) setShowHelp(!showHelp)
        },

        onShowUI (context, event) {
          getCanvasRenderer().onShow(t)
        },

        onToggleHUD (context, event) {
          setShowHUD(!showHUD)
        },

        onToggleSettings (context, event) {
          let cr = getCanvasRenderer()
          cr.state.showSettings = !cr.state.showSettings
          cr.boardsNeedsRender = true
        },

        onSetBoardUid (context, event) {
          setBoardUid(event.uid)
        },

        async onChangeBoard (context, event) {
          if (!event.uid) {
            return false
          }
          
          let cr = getCanvasRenderer()

          let hasUnsavedChanges = await checkForUnsavedChanges()
          if (hasUnsavedChanges) {
            let confirmed = await checkConfirmStatus('unsaved')
            if (!confirmed) return
          }

          try {
            await cr.shotGenerator.setBoard(event.uid)
            
            cr.boardsNeedsRender = true
            setBoardUid(board.uid)
          } catch (err) {
            // TODO if the uid does not match, notify user, reload
            alert('Error\n' + err)
          }
        },

        async onSaveBoard () {
          let cr = getCanvasRenderer()

          let hasUnsavedChanges = await checkForUnsavedChanges()
          if (hasUnsavedChanges) {
            let confirmed = await checkConfirmStatus('overwrite')
            if (!confirmed) return
          }

          try {
            await cr.shotGenerator.saveShot()

            cr.state.boardsData.cata({
              SUCCESS: data => {
                const item = data.find(board => board.uid === cr.state.sgCurrentState.board.uid)
                const filepath = cr.client.uriForThumbnail(item.thumbnail)
                THREE.Cache.remove(filepath)
              }
            })

            cr.boardsNeedsRender = true
          } catch (err) {
            cr.shotGenerator.log('Could not save board\n' + err)
          }
        },

        async onInsertBoard () {
          let cr = getCanvasRenderer()

          let hasUnsavedChanges = await checkForUnsavedChanges()

          if (hasUnsavedChanges) {
            let confirmed = await checkConfirmStatus('overwrite')
            if (!confirmed) return
          }

          try {
            let board = await cr.shotGenerator.insertShot()
            setBoardUid(board.uid)
            cr.boardsNeedsRender = true;
          } catch (err) {
            alert('Could not insert\n' + err)
          }
        }
      }
    }
  )

  const checkForUnsavedChanges = async () => {
    return await getCanvasRenderer().shotGenerator.isSceneDirty()
  }

  const checkConfirmStatus = async (type) => {
    const cr = getCanvasRenderer()
    cr.state.boards.showConfirm = true
    cr.state.boards.confirmDialogType = type
    cr.boardsNeedsRender = true
    setShowConfirm(true)

    return new Promise(resolve => {
      const checkConfirmInterval = setInterval(() => {
        if (cr.state.boards.confirmChange !== null) {
          clearInterval(checkConfirmInterval)

          const confirm = cr.state.boards.confirmChange
          cr.state.boards.showConfirm = false
          cr.state.boards.confirmChange = null
          cr.state.boards.confirmDialogType = null
          cr.boardsNeedsRender = true
          setShowConfirm(false)

          resolve(confirm)
        }
      }, 500)
    })
  }

  const canvasRendererRef = useRef(null)
  const getCanvasRenderer = useCallback(() => {
    if (canvasRendererRef.current === null) {
      const getRoom = () => scene.getObjectByName('room' )
      const getImageByFilepath = filepath => THREE.Cache.get(filepath)

      canvasRendererRef.current = new CanvasRenderer(
        1024,
        store.dispatch,
        uiService,
        uiSend,
        camera,
        getRoom,
        getImageByFilepath,
        cameraAspectRatio,
        SG
      )
    }
    return canvasRendererRef.current
  }, [])

  const selections = useSelector(getSelections)
  const sceneObjects = useSelector(getSceneObjects)
  const world = useSelector(getWorld)

  useMemo(() => {
    getCanvasRenderer().state.board = board
    getCanvasRenderer().state.selections = selections
    getCanvasRenderer().state.sceneObjects = sceneObjects
    getCanvasRenderer().state.poses = poses
    getCanvasRenderer().state.handPoses = handPoses
    getCanvasRenderer().state.models = models
    getCanvasRenderer().state.activeCamera = activeCamera
    getCanvasRenderer().state.world = world
    getCanvasRenderer().needsRender = true
    getCanvasRenderer().helpNeedsRender = true
    getCanvasRenderer().boardsNeedsRender = true

    if (selections.length) {
      uiSend('GO_PROPERTIES')
    } else {
      //uiSend('GO_HOME')
    }
  }, [selections, sceneObjects, poses, models, activeCamera, world, handPoses, board])
  
  useEffect(() => {
    const renderer = getCanvasRenderer()
    renderer.shotGenerator.getBoards().then(result => {
      renderer.state.boardsData = RemoteData.success(result)
      renderer.boardsNeedsRender = true
    }).catch(err => {
      renderer.state.boardsData = RemoteData.failure(err)
      renderer.boardsNeedsRender = true
    })
  }, [board.uid])

  useMemo(() => {
    if (selections.length === 0 && getCanvasRenderer().state.mode === 'properties') {
      uiSend('GO_HOME')
    }
  }, [selections.length])

  useMemo(() => {
    getCanvasRenderer().state.mode = uiCurrent.value.controls
    getCanvasRenderer().needsRender = true
  }, [uiCurrent.value.controls])

  useMemo(() => {
    getCanvasRenderer().state.context = uiCurrent.context
    getCanvasRenderer().needsRender = true
  }, [uiCurrent.context])

  const isXrPresenting = useIsXrPresenting()
  useEffect(() => {
    if (!isXrPresenting) return

    // if the user hasn't seen help before
    if (getCookie('sawHelp') !== 'true') {
      // HACK wait 2s so controllers can attach and scene can render
      setTimeout(() => {
        if (!showHelp) {
          setShowHelp(true)
          playSound(`help${getCanvasRenderer().state.helpIndex + 1}`)
          setCookie('sawHelp', 'true', 365)
        }
      }, 2000)
    }
  }, [isXrPresenting])

  return { uiService, uiCurrent, getCanvasRenderer, canvasRendererRef }
}

const UI_ICON_NAMES = [
  'selection', 'duplicate', 'add', 'erase', 'arrow', 'hand', 'help',
  'close', 'settings', 'hud', 'pose-preset', 'model-type', 'hand-preset',

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
