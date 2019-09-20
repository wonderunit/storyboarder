const THREE = require('three')
const { clamp, mapLinear } = require('three').Math
const { useState, useMemo, useRef, useCallback } = React = require('react')
const useReduxStore = require('react-redux').useStore
const { useSelector } = require('react-redux')
const { useRender, useThree } = require('react-three-fiber')
const { useMachine } = require('@xstate/react')

const { log } = require('./components/Log')
const uiMachine = require('./machines/uiMachine')

const R = require('ramda')

// all pose presets (so we can use `stand` for new characters)
const defaultPosePresets = require('../../shared/reducers/shot-generator-presets/poses.json')
// id of the pose preset used for new characters
const DEFAULT_POSE_PRESET_ID = '79BBBD0D-6BA2-4D84-9B71-EE661AB6E5AE'

const { create } = require('zustand')
const { produce } = require('immer')
const { setCookie, getCookie } = require('./helpers/cookies')

const [useUiStore] = create((set, get) => ({
  // values
  switchHand: getCookie('switchHand') == 'true',
  showCameras: getCookie('showCameras') == 'true',

  // actions
  setSwitchHand: value => set(produce(state => { state.switchHand = value })),
  setShowCameras: value => set(produce(state => { state.showCameras = value })),

  set: fn => set(produce(fn))
}))

// round to nearest step value
const steps = (value, step) => parseFloat((Math.round(value * (1 / step)) * step).toFixed(6))

function drawText({ ctx, label, size, align = 'left', baseline = 'top', color = '#fff' }) {
  ctx.save()
  ctx.font = `${size}px Arial`
  ctx.textAlign = align
  ctx.textBaseline = baseline
  ctx.fillStyle = color
  ctx.fillText(label, 0, 0)
  ctx.restore()
}

function drawImageButton ({ ctx, width, height, image }) {
  ctx.save()

  ctx.drawImage(image, 0, 0, width, height)

  // ctx.fillStyle = '#eee'
  // ctx.fillRect(0, 0, width, height)
  // ctx.translate(width / 2, height / 2)
  // ctx.font = '20px Arial'
  // ctx.textAlign = 'center'
  // ctx.textBaseline = 'middle'
  // ctx.fillStyle = 'black'
  ctx.restore()
}

function drawButton ({ ctx, width, height, state, label }) {
  ctx.save()
  ctx.fillStyle = '#eee'
  ctx.fillRect(0, 0, width, height)
  ctx.translate(width / 2, height / 2)
  ctx.font = '20px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'black'
  ctx.fillText(label, 0, 0)
  ctx.restore()
}


function drawSlider ({ ctx, width, height, state, label }) {
  // value
  ctx.save()
  ctx.fillStyle = '#6E6E6E'
  if (state !== 0) roundRect(ctx, 0, 0, (width - 10) * state, height, 12, true, false)

  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 3
  roundRect(ctx, 0, 0, width - 10, height, 12, false, true)

  // label
  ctx.translate(width / 2, height / 2)
  ctx.font = '24px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(label.charAt(0).toUpperCase() + label.slice(1), 0, 0)
  ctx.restore()
}

function drawToggleButton({ ctx, width, height, cookieBoolean }) {
  ctx.save()
  ctx.fillStyle = '#000'
  roundRect(ctx, 0, 0, width - 10, height, 36, true, false)

  ctx.fillStyle = '#6E6E6E'
  roundRect(ctx, (width - 10) * (cookieBoolean ? 0.5 : 0), 0, (width - 10) * 0.5, height, 36, true, false)

  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 3
  roundRect(ctx, 0, 0, width - 10, height, 36, false, true)
  ctx.restore()
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof stroke == 'undefined') {
    stroke = true;
  }
  if (typeof radius === 'undefined') {
    radius = 5;
  }
  if (typeof radius === 'number') {
    radius = {tl: radius, tr: radius, br: radius, bl: radius};
  } else {
    var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
    for (var side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

function wrapText (context, text, x, y, maxWidth, lineHeight) {

  var words = text.split(' '),
      line = '',
      lineCount = 0,
      i,
      test,
      metrics;

  for (i = 0; i < words.length; i++) {
      test = words[i];
      metrics = context.measureText(test);
      while (metrics.width > maxWidth) {
          // Determine how much of the word will fit
          test = test.substring(0, test.length - 1);
          metrics = context.measureText(test);
      }
      if (words[i] != test) {
          words.splice(i + 1, 0,  words[i].substr(test.length))
          words[i] = test;
      }

      test = line + words[i] + ' ';
      metrics = context.measureText(test);

      if (metrics.width > maxWidth && i > 0) {
          context.fillText(line, x, y);
          line = words[i] + ' ';
          y += lineHeight;
          lineCount++;
      }
      else {
          line = test;
      }
  }

  context.fillText(line, x, y);
}



function drawGrid(ctx, x, y , width, height, items) {
  ctx.save()
  ctx.fillStyle = '#aaa'
  //ctx.fillRect(x, y, width, height)
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()

  let cols = 5
  let itemHeight = 150
  let gutter = 5
  let offset = 910

  let itemWidth = (width-gutter*(cols-1)) / cols

  let visibleRows = Math.ceil(height / itemHeight)+1

  let startItem = Math.floor(offset / itemHeight)*cols

  offset = offset % itemHeight

  //let startItem = 0

  ctx.font = '30px Arial'
  ctx.textBaseline = 'top'

  for (let i2 = 0; i2 < visibleRows; i2++) {
    for (let i = 0; i < cols; i++) {
      ctx.fillStyle = '#f00'
      ctx.fillRect(x+(i*itemWidth)+(i*gutter), y+(itemHeight*i2)-offset, itemWidth, itemHeight-5)
      ctx.fillStyle = 'white'
      ctx.font = '30px Arial'
      ctx.textBaseline = 'top'
      ctx.fillText(startItem, x+(i*itemWidth)+(i*gutter), y+(itemHeight*i2)-offset)

      ctx.font = '10px Arial'
      ctx.textBaseline = 'bottom'
      ctx.fillText('Pose: ' + startItem, x+(i*itemWidth)+(i*gutter), y+(itemHeight*i2)-offset+itemHeight-5)
      startItem++
    }
  }


  ctx.restore()

}

function drawPaneBGs(ctx) {
  ctx.fillStyle = 'rgba(0,0,0)'
  // property
  roundRect(ctx, 4, 6, 439, 666, 25, true, false)
  // extended property
  roundRect(ctx, 554, 6, 439, 666, 25, true, false)
  roundRect(ctx, 6, 682, 439, 325, 25, true, false)
  roundRect(ctx, 483, 288, 66, 105, 25, true, false)
  // home
  roundRect(ctx, 667, 684, 200, 200, 25, true, false)
  //roundRect(ctx, 667, 684, 200, 200, 25, true, false)
  roundRect(ctx, 456, 684, 200, 200, 25, true, false)
  roundRect(ctx, 909, 684, 88, 88, 25, true, false)
  // back plane
  roundRect(ctx, 453, 889, 440, 132, 25, true, false)
}

function setupHomePane (paneComponents, self) {
  // 4 image buttons
  paneComponents['home'] = {
    'select-button': {
      id: 'select-button',
      type: 'image-button',
      x: 667 + 10 + 10,
      y: 684 + 10 + 10,
      width: 64,
      height: 64,
      image: 'selection',
      onSelect: () => {
        self.send('GO_HOME')
      }
    },
    'add-button': {
      id: 'add-button',
      type: 'image-button',
      x: 667 + 10 + 10,
      y: 684 + 105 + 10,
      width: 64,
      height: 64,
      image: 'add',
      onSelect: () => {
        self.send('GO_ADD')
      }
    },
    'duplicate-button': {
      id: 'duplicate-button',
      type: 'image-button',
      x: 667 + 105 + 10,
      y: 684 + 10 + 10,
      width: 64,
      height: 64,
      image: 'duplicate',
      onSelect: () => {
        self.send('REQUEST_DUPLICATE', { selections: self.state.selections })
      }
    },
    'delete-button': {
      id: 'delete-button',
      type: 'image-button',
      x: 667 + 105 + 10,
      y: 684 + 105 + 10,
      width: 64,
      height: 64,
      image: 'erase',
      onSelect: () => {
        self.send('REQUEST_DELETE', { selections: self.state.selections })
      }
    },
    'settings-button': {
      id: 'settings-button',
      type: 'image-button',
      x: 909 + 10,
      y: 684 + 10,
      width: 64,
      height: 64,
      image: 'help',

      onSelect: () => {
        self.send('TOGGLE_SETTINGS')
        console.log('sup')
      }
    },
    'extend-button': {
      id: 'extend-button',
      type: 'image-button',
      x: 483 - 32 + 66 * 0.5,
      y: 288 - 32 + 105 * 0.5,
      width: 64,
      height: 64,
      image: 'arrow',

      onSelect: () => {
        self.send('TOGGLE_GRID')
      }
    }
  }
}

function setupAddPane (paneComponents, self) {
  // 4 image buttons
  paneComponents['add'] = {
    'add-camera': {
      id: 'add-camera',
      type: 'image-button',
      x: 456 + 10 + 10,
      y: 684 + 10 + 10,
      width: 64,
      height: 64,
      image: 'icon-toolbar-camera',

      onSelect: () => {
        self.send('ADD_OBJECT', { object: 'camera' })
      }
    },

    'add-object': {
      id: 'add-object',
      type: 'image-button',
      x: 456 + 105 + 10,
      y: 684 + 10 + 10,
      width: 64,
      height: 64,
      image: 'icon-toolbar-object',

      onSelect: () => {
        self.send('ADD_OBJECT', { object: 'object' })
      }
    },

    'add-character': {
      id: 'add-character',
      type: 'image-button',
      x: 456 + 10 + 10,
      y: 684 + 105 + 10,
      width: 64,
      height: 64,
      image: 'icon-toolbar-character',

      onSelect: () => {
        self.send('ADD_OBJECT', { object: 'character' })
        // undoGroupStart()
        // console.log(deleteObjects([sceneObject.id]))
        // this.dispatch(deleteObjects([sceneObject.id]))
        // this.dispatch(selectObject(null))
        // selectObject(id)
        // undoGroupEnd()
      }
    },

    'add-light': {
      id: 'add-light',
      type: 'image-button',
      x: 456 + 105 + 10,
      y: 684 + 105 + 10,
      width: 64,
      height: 64,
      image: 'icon-toolbar-light',

      onSelect: () => {
        self.send('ADD_OBJECT', { object: 'light' })
      }
    }
  }
}

function setupSettingsPane(paneComponents, self) {
  paneComponents['settings'] = {
    settings: {
      id: 'settings',
      type: 'text',
      x: 0 + 30,
      y: 684 + 20,
      label: 'Settings',
      size: 48
    },

    'switch-hand': {
      id: 'switch-hand',
      type: 'text',
      x: 0 + 30,
      y: 684 + 20 + 48 + 30 + 40 - 12,
      label: 'Switch Hand',
      size: 24
    },

    'show-cameras': {
      id: 'show-cameras',
      type: 'text',
      x: 0 + 30,
      y: 684 + 20 + 48 + 30 + 80 + 30 + 40 - 12,
      label: 'Show Cameras',
      size: 24,
    },

    'switch-hand-toggle': {
      id: 'switch-hand-toggle',
      type: 'toggle-button',
      toggle: 'switchHand',
      x: 0 + 30 + 200,
      y: 684 + 20 + 48 + 30,
      width: 200,
      height: 80,
      onSelect: () => {
        self.send('TOGGLE_SWITCH', { toggle: 'switchHand' })
      }
    },

    'show-cameras-toggle': {
      id: 'show-cameras-toggle',
      type: 'toggle-button',
      toggle: 'showCameras',
      x: 0 + 30 + 200,
      y: 684 + 20 + 48 + 30 + 80 + 30,
      width: 200,
      height: 80,
      onSelect: () => {
        self.send('TOGGLE_SWITCH', { toggle: 'showCameras' })
      }
    }
  }
}

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

lenses.headScale = R.lens(
  vin => clamp(mapLinear(vin, 0.8, 1.2, 0, 1), 0, 1),
  vout => clamp(mapLinear(steps(vout, 0.1), 0, 1, 0.8, 1.2), 0.8, 1.2)
)

for (let propertyName of ['intensity', 'penumbra']) {
  lenses[propertyName] = R.lens(
  vin => clamp(vin, 0, 1),
  vout => clamp(steps(vout, 0.1), 0, 1)
  )
}

lenses.angle = R.lens(
  vin => clamp(mapLinear(vin, 0, 1.57, 0, 1), 0, 1),
  vout => clamp(mapLinear(steps(vout, 0.1), 0, 1, 0, 1.57), 0, 1.57)
)

lenses.fov = R.lens(
  vin => clamp(mapLinear(vin, 3, 71, 0, 1), 0, 1),
  vout => clamp(mapLinear(steps(vout, 0.01), 0, 1, 3, 71), 3, 71)
)

for (let propertyName of ['width', 'height', 'depth']) {
  lenses[propertyName] = R.lens(
    vin => clamp(mapLinear(vin, 0.1, 5, 0, 1), 0, 1),
    vout => clamp(mapLinear(steps(vout, 0.1), 0, 1, 0.1, 5), 0.1, 5)
  )
}

lenses.morphTargets = R.lens(
  // from morphTarget value to slider internal value
  from => clamp(from, 0, 1),
  // from slider internal value to morphTarget value
  to => clamp(steps(to, 0.1), 0, 1)
)
lenses.ectomorphic = lenses.morphTargets
lenses.mesomorphic = lenses.morphTargets
lenses.endomorphic = lenses.morphTargets

class CanvasRenderer {
  constructor(size, dispatch, service, send, camera, getRoom, getImageByFilepath) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.canvas.height = size
    this.context = this.canvas.getContext('2d')

    this.dispatch = dispatch
    this.service = service
    this.send = send
    this.getImageByFilepath = getImageByFilepath

    this.state = {
      selections: [],
      sceneObjects: {},
      poses: {},
      models: {},
      mode: 'home',
      context: {}
    }

    this.paneComponents = {}

    let ctx = this.context
    drawPaneBGs(ctx)



    setupHomePane(this.paneComponents, this)
    setupAddPane(this.paneComponents, this)
    setupSettingsPane(this.paneComponents, this)
    this.renderObjects(ctx, this.paneComponents['home'])
    this.renderObjects(ctx, this.paneComponents['add'])
    this.renderObjects(ctx, this.paneComponents['settings'])
    // setupaddpane
    // setupsettings


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

    // drawGrid(ctx, 570, 130 , 380, 500, 4)

    this.needsRender = false
  }
  render () {


    let canvas = this.canvas
    let ctx = this.context

    console.log("render")

    if (this.state.context.locked) {
      console.log('rendering a locked ui')
    } else {
      console.log('rendering an unlocked ui')
    }

    console.log(this.state.mode)
    if (this.state.mode == 'properties') {
      let id = this.state.selections[0]
      let sceneObject = this.state.sceneObjects[id]

      let modelSettings = this.state.models[sceneObject.model]

      // Earlier sliders stay visible if not overridden with this
      ctx.fillStyle = 'rgba(0,0,0)'
      roundRect(ctx, 554, 6, 439, 666, 25, true, false)

      const propertyArray = []
      switch (sceneObject.type) {
        case 'camera':
          propertyArray.push({ name: 'fov', label: 'F.O.V', rounding: 1 })
          break
        case 'object':
          if (sceneObject.model === 'box') propertyArray.push({ name: 'width' }, { name: 'height' }, { name: 'depth' })
          else propertyArray.push({ name: 'height', label: 'size' })
          break
        case 'character':
          propertyArray.push({ name: 'height', lens: 'characterHeight' }, { name: 'headScale', label: 'head' })
          break
        case 'light':
          propertyArray.push({ name: 'intensity' }, { name: 'angle' }, { name: 'penumbra' })
          break
      }

      if (modelSettings && modelSettings.validMorphTargets) {
        modelSettings.validMorphTargets.forEach((morphTargetName) => {
          let label = 'Morph Target'
          if (morphTargetName == 'ectomorphic') label = 'Skinny'
          if (morphTargetName == 'mesomorphic') label = 'Muscular'
          if (morphTargetName == 'endomorphic') label = 'Obsese'
          propertyArray.push({
            name: morphTargetName,
            label
          })
        })
      }

      this.paneComponents['properties'] = {}
      for (let [i, property] of propertyArray.entries()) {
        const { name, label, lens, rounding } = property
        let labelValue = Math.round(sceneObject[name] * (rounding || 100)) / (rounding || 100)
        if (name.includes('morphic')) labelValue = Math.round(sceneObject.morphTargets[name] * 100) + '%'

        this.paneComponents['properties'][name] = {
          id: name,
          type: 'slider',
          x: 570,
          y: 30 + 90 * i,
          width: 420,
          height: 80,

          label: `${label || name} - ${labelValue}`,
          state: R.view(lenses[lens || name], name.includes('morphic') ? sceneObject.morphTargets[name] : sceneObject[name]),

          setState: value => {

            // Object sizes
            if (label === 'size') {
              this.dispatch(
                updateObject(sceneObject.id, {
                  width: R.set(lenses[name], value, sceneObject[name]),
                  height: R.set(lenses[name], value, sceneObject[name]),
                  depth: R.set(lenses[name], value, sceneObject[name])
                })
              )
            }

            // MorphTargets
            else if (name.includes('morphic'))
              this.dispatch(
                updateObject(sceneObject.id, {
                  morphTargets: { [name]: R.set(lenses[name], value, sceneObject.morphTargets[name]) }
                })
              )

            // Everything else
            else this.dispatch(updateObject(sceneObject.id, { [name]: R.set(lenses[lens || name], value, sceneObject[name]) }))
          }
        }

        this.paneComponents['properties'][name].onDrag =
        this.paneComponents['properties'][name].onDrop =
        this.paneComponents['properties'][name].setState
      }

      this.renderObjects(ctx, this.paneComponents['properties'])

      // FOR TESTING: draw some images
      // ctx.drawImage(this.getImageByFilepath(getIconFilepathByName('eye')), 570, 130)
      // ctx.drawImage(this.getImageByFilepath(getPoseImageFilepathById('8af56a03-2078-402a-9407-33cfecfcf460')), 770, 130)
      // ctx.drawImage(this.getImageByFilepath(getCharacterImageFilepathById('adult-female')), 570, 430)
      // ctx.drawImage(this.getImageByFilepath(getModelImageFilepathById('box')), 770, 430)

      // FOR TESTING: draw a loadable image
      // let list = this.state.poses.slice(0, 6)
      // list.forEach((pose, n) => {
      //   let filepath = getPoseImageFilepathById(pose.id)

      //   let r = n % 3
      //   let c = Math.floor(n / 3)

      //   let x = 570 + (r * 140)
      //   let y = 130 + (c * 205)
      //   this.drawLoadableImage(
      //     filepath,

      //     image => {
      //       // loaded state
      //       // object should allow selection
      //       ctx.drawImage(image, x, y)
      //     },

      //     () => {
      //       // loading state
      //       // object should not allow selection
      //       ctx.save()
      //       ctx.fillStyle = '#222'
      //       ctx.fillRect(x, y, 135, 200)
      //       ctx.restore()
      //     }
      //   )
      // })
    }

    if (this.state.mode == 'grid') {
      let id = this.state.selections[0]
      let sceneObject = this.state.sceneObjects[id]
      drawGrid(ctx, 30, 30, 440 - 55, 670 - 55, 4)
    }

    if (this.state.mode == 'settings') {
      this.renderObjects(ctx, this.paneComponents['settings'])
    }

    /*

    if mode == properties
      clear paneCompenets['properties']
      set them
      render properties

    */

    // // this.context.fillStyle = 'white'
    // // this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // this.objects = {
    //   'create-object': {
    //     id: 'create-object',
    //     type: 'button',
    //     x: 15,
    //     y: 285,
    //     width: 420,
    //     height: 40,

    //     label: 'Add Object',

    //     onSelect: () => {
    //       let id = THREE.Math.generateUUID()
    //       // undoGroupStart()
    //       //this.dispatch(
    //         console.log("CREATE OBJECT")
    //         // TODO make a fake camera Object3D
    //         //      with the camera + teleport pos integrated
    //         //SceneObjectCreators.createModelObject(id, this.camera, this.getRoom())
    //       //)
    //       // selectObject(id)
    //       // undoGroupEnd()
    //     }
    //   }
    // }

    // this.objects = {
    //   ...this.objects,
    //   'test-toggle-modes': {
    //     id: 'test-toggle-modes',
    //     type: 'button',
    //     x: 15,
    //     y: 500,
    //     width: 420,
    //     height: 40,

    //     label: `Toggle Mode`,

    //     onSelect: () => {
    //       if (this.state.mode == 'idle') {
    //         this.send('SELECT_OBJECT')
    //       } else {
    //         this.send('DESELECT_OBJECT')
    //       }
    //     }
    //   }
    // }

    // if (this.state.selections.length) {
    //   let id = this.state.selections[0]
    //   let sceneObject = this.state.sceneObjects[id]

    //   this.objects = {
    //     ...this.objects,
    //     'delete-selected-object': {
    //       id: 'delete-selected-object',
    //       type: 'button',
    //       x: 15,
    //       y: 195 + 10,
    //       width: 420,
    //       height: 40,

    //       label: 'Delete Object',

    //       onSelect: () => {
    //         // undoGroupStart()
    //         // console.log(deleteObjects([sceneObject.id]))
    //         this.dispatch(deleteObjects([sceneObject.id]))
    //         this.dispatch(selectObject(null))
    //         // selectObject(id)
    //         // undoGroupEnd()
    //       }
    //     }
    //   }

    //   if (sceneObject.type == 'character') {
    //     this.objects = {
    //       ...this.objects,
    //       ...this.getObjectsForCharacter(sceneObject)
    //     }
    //   }

    //   ctx.save()

    //   // name
    //   ctx.save()
    //   let string = `${sceneObject.name || sceneObject.displayName}`
    //   ctx.font = '40px Arial'
    //   ctx.textBaseline = 'top'
    //   ctx.fillStyle = 'black'
    //   ctx.translate(15, 20)
    //   ctx.fillText(string, 0, 0)
    //   ctx.restore()

    //   // spacer
    //   ctx.translate(0, 60)

    //   //
    //   ctx.save()
    //   ctx.font = '30px Arial'
    //   ctx.textBaseline = 'top'
    //   ctx.fillStyle = 'black'
    //   ctx.translate(15, 20)
    //   sceneObject.rotation.y
    //     ? ctx.fillText('rotation:' + (sceneObject.rotation.y * THREE.Math.RAD2DEG).toFixed(4) + '°', 0, 0)
    //     : ctx.fillText('rotation:' + (sceneObject.rotation * THREE.Math.RAD2DEG).toFixed(4) + '°', 0, 0)
    //   ctx.restore()

    //   // spacer
    //   ctx.translate(0, 60)

    //   ctx.restore()
    // }

    // objects

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
        const cookieBoolean = getCookie(object.toggle) == 'true'

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

  onSelect (id) {
    let component = this.getComponentById(id)
    if (component && component.onSelect) {
      component.onSelect()
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
      component.onDrop(x, y)
    }
  }

  // drawCircle (u, v) {
  //   let ctx = this.context

  //   let x = u * this.canvas.width
  //   let y = v * this.canvas.height

  //   ctx.beginPath()
  //   ctx.arc(x, y, 20, 0, Math.PI * 2)
  //   ctx.fillStyle = 'red'
  //   ctx.fill()

  //   this.needsRender = true
  // }

  /*
  objects = {
    'home' = {
      'add-button' = {ksajdka sdajks djk },
      'delete-button' = {ksajdka sdajks djk },

    }
  }
  */

  getCanvasIntersection (u, v) {
    let x = u * this.canvas.width
    let y = v * this.canvas.height

    for (let paneId in this.paneComponents) {
      for (let componentId in this.paneComponents[paneId]) {
        let component = this.paneComponents[paneId][componentId]
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
  undoGroupStart,
  undoGroupEnd
} = require('../../shared/reducers/shot-generator')

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

  // for now, preload pose, character, and model images to THREE.Cache
  const presets = useSelector(state => state.presets)
  const models = useSelector(state => state.models)

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

          let canvasIntersection = cr.getCanvasIntersection(u, v)

          if (canvasIntersection) {
            let { id } = canvasIntersection

            if (canvasIntersection.type == 'button') {
              playSound('select')
              cr.onSelect(id)
            }

            if (canvasIntersection.type == 'image-button') {
              playSound('select')
              cr.onSelect(id)
            }

            if (canvasIntersection.type == 'toggle-button') {
              playSound('select')
              cr.onSelect(id)
            }

            if (canvasIntersection.type == 'slider') {
              playSound('select')
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
          const value = !(cookie == 'true')
          setCookie(toggle, value, 90)

          if (toggle === 'switchHand') setSwitchHand(value)
          if (toggle === 'showCameras') setShowCameras(value)
          getCanvasRenderer().needsRender = true
          playSound('select')
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
        getImageByFilepath
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
    getCanvasRenderer().needsRender = true

    if (selections.length) {
      uiSend('GO_PROPERTIES')
    } else {
      uiSend('GO_HOME')
    }
  }, [selections, sceneObjects, poses, models])

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
  'close',

  'camera', 'eye',

  'icon-toolbar-camera',
  'icon-toolbar-object',
  'icon-toolbar-character',
  'icon-toolbar-light',

  'pose', 'object',

  'help_1', 'help_2', 'help_3', 'help_4', 'help_5', 'help_6', 'help_7',
  'help_8'
]

const UI_ICON_FILEPATHS = UI_ICON_NAMES.map(getIconFilepathByName)

module.exports = {
  useUiStore,
  useUiManager,
  UI_ICON_FILEPATHS
}
