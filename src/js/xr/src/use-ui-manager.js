const { useState, useMemo, useRef, useCallback } = React = require('react')
const useReduxStore = require('react-redux').useStore
const { useRender, useThree } = require('react-three-fiber')
const { interpret } = require('xstate/lib/interpreter')
const { assign } = require('xstate/lib/actions')

const { log } = require('./components/Log')
const uiMachine = require('./machines/uiMachine')
const getControllerIntersections = require('./helpers/get-controller-intersections')

const SceneObjectCreators = require('../../shared/actions/scene-object-creators')

// const toRotation = value => (value * 2 - 1) * Math.PI
// const fromRotation = value => (value / (Math.PI) + 1) / 2
// const mappers = {
//   toRotation,
//   fromRotation
// }
// round to nearest step value
const steps = (value, step) => parseFloat((Math.round(value * (1 / step)) * step).toFixed(6))

function drawButton ({ ctx, width, height, state, getLabel }) {
  ctx.save()
  ctx.fillStyle = '#eee'
  ctx.fillRect(0, 0, width, height)
  ctx.translate(width / 2, height / 2)
  ctx.font = '20px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'black'
  ctx.fillText(getLabel(state), 0, 0)
  ctx.restore()
}

function drawSlider ({ ctx, width, height, state, getLabel }) {
  ctx.save()
  ctx.fillStyle = '#aaa'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#eee'
  ctx.fillRect(5, 5, width - 10, height - 10)

  // value
  ctx.translate(5, 5)
  ctx.fillStyle = '#ccc'

  ctx.fillRect(0, 0, (width - 10) * state, height - 10)
  ctx.translate(-5, -5)

  // label
  ctx.translate(width / 2, height / 2)
  ctx.font = '20px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#333'
  ctx.fillText(getLabel(state), 0, 0)
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




class CanvasRenderer {
  constructor (size, dispatch, service, camera, getRoom) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.canvas.height = size
    this.context = this.canvas.getContext('2d')

    this.dispatch = dispatch
    this.service = service
    this.camera = camera
    this.getRoom = getRoom

    this.state = {
      selections: [],
      sceneObjects: {}
    }

    this.objects = {}

    let ctx = this.context
    this.context.fillStyle = 'rgba(255,0,0,1)'
    // this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.fillStyle = 'rgba(0,0,0)'

    // property
    roundRect(ctx, 4, 6, 439, 666, 20, true, false)
    roundRect(ctx, 554, 6, 439, 666, 20, true, false)
    roundRect(ctx, 6, 682, 439, 325, 20, true, false)

    roundRect(ctx, 483, 288, 66, 105, 20, true, false)

    // home
    roundRect(ctx, 667, 684, 200, 200, 20, true, false)
    roundRect(ctx, 667, 684, 200, 200, 20, true, false)

    roundRect(ctx, 456, 684, 200, 200, 20, true, false)

    roundRect(ctx, 909, 684, 88, 88, 20, true, false)

    // back plane
    roundRect(ctx, 453, 889, 440, 132, 20, true, false)

    // home buttons
    ctx.fillStyle = 'rgba(30,30,30)'
    roundRect(ctx, 667+8, 684+7, 89, 89, 15, true, false)
    roundRect(ctx, 667+8+88+7, 684+7, 89, 89, 15, true, false)
    roundRect(ctx, 667+8, 684+7+88+7, 89, 89, 15, true, false)
    roundRect(ctx, 667+8+88+7, 684+7+88+7, 89, 89, 15, true, false)

    ctx.lineWidth = 5
    ctx.strokeStyle = 'rgba(255,255,255)'
    ctx.fillStyle = 'rgba(30,30,30)'
    roundRect(ctx, 570, 30, 380, 89, 17, true, true)


    this.needsRender = false
  }
  render () {
    let canvas = this.canvas
    let ctx = this.context

    // this.context.fillStyle = 'white'
    // this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.objects = {
      'create-object': {
        id: 'create-object',
        type: 'button',
        x: 15,
        y: 285,
        width: 420,
        height: 40,

        getLabel: () => 'Add Object',

        onSelect: () => {
          let id = THREE.Math.generateUUID()

          console.log('creating an object in room', this.getRoom())

          // undoGroupStart()
          this.dispatch(
            // TODO make a fake camera Object3D
            //      with the camera + teleport pos integrated
            SceneObjectCreators.createModelObject(id, this.camera, this.getRoom())
          )
          // selectObject(id)
          // undoGroupEnd()
        }
      }
    }

    if (this.state.selections.length) {
      let id = this.state.selections[0]
      let sceneObject = this.state.sceneObjects[id]

      this.objects = {
        ...this.objects,
        'delete-selected-object': {
          id: 'delete-selected-object',
          type: 'button',
          x: 15,
          y: 195 + 10,
          width: 420,
          height: 40,

          getLabel: () => 'Delete Object',

          onSelect: () => {
            // undoGroupStart()
            // console.log(deleteObjects([sceneObject.id]))
            this.dispatch(deleteObjects([sceneObject.id]))
            this.dispatch(selectObject(null))
            // selectObject(id)
            // undoGroupEnd()
          }
        }
      }

      if (sceneObject.type == 'character') {
        this.objects = {
          ...this.objects,
          ...this.getObjectsForCharacter(sceneObject)
        }
      }

      ctx.save()

      // name
      ctx.save()
      let string = `${sceneObject.name || sceneObject.displayName}`
      ctx.font = '40px Arial'
      ctx.textBaseline = 'top'
      ctx.fillStyle = 'black'
      ctx.translate(15, 20)
      ctx.fillText(string, 0, 0)
      ctx.restore()

      // spacer
      ctx.translate(0, 60)

      //
      ctx.save()
      ctx.font = '30px Arial'
      ctx.textBaseline = 'top'
      ctx.fillStyle = 'black'
      ctx.translate(15, 20)
      sceneObject.rotation.y
        ? ctx.fillText('rotation:' + (sceneObject.rotation.y * THREE.Math.RAD2DEG).toFixed(4) + '°', 0, 0)
        : ctx.fillText('rotation:' + (sceneObject.rotation * THREE.Math.RAD2DEG).toFixed(4) + '°', 0, 0)
      ctx.restore()

      // spacer
      ctx.translate(0, 60)

      ctx.restore()
    }

    // objects
    this.renderObjects(ctx, this.objects)
  }

  renderObjects (ctx, objects) {
    for (let object of Object.values(objects)) {
      let { type, x, y, width, height, ...props } = object

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

  getObjectsForCharacter (sceneObject) {
    // const getCharacterRotationSlider = sceneObject => {
    //   let characterRotation = mappers.fromRotation(sceneObject.rotation)

    //   // TODO when dragging, set to a function which modifies local THREE object
    //   //      when dropping, set to a function which dispatches to store
    //   let setCharacterRotation = value => {
    //     let rotation = mappers.toRotation(THREE.Math.clamp(value, 0, 1))
    //     rotation = steps(rotation, THREE.Math.DEG2RAD)

    //     this.dispatch(
    //       updateObject(
    //         sceneObject.id,
    //         { rotation }
    //       )
    //     )
    //   }

    //   let getLabel = value => 'rotation:' + mappers.toRotation(value).toFixed(3) + ' rad'

    //   let onDrag = (x, y) => setCharacterRotation(x)

    //   let onDrop = onDrag

    //   return {
    //     state: characterRotation,
    //     getLabel,
    //     onDrag,
    //     onDrop
    //   }
    // }

    const getCharacterHeightSlider = sceneObject => {
      let step = 0.05
      let min = steps(1.4732, step)
      let max = steps(2.1336, step)

      let characterHeight = THREE.Math.mapLinear(sceneObject.height, min, max, 0, 1)

      let setCharacterHeight = n => {
        let height = THREE.Math.mapLinear(n, 0, 1, min, max)
        height = steps(height, step)

        this.dispatch(
          updateObject(
            sceneObject.id,
            { height }
          )
        )
      }

      return {
        state: characterHeight,
        getLabel: () => `height ${sceneObject.height}`,
        onDrag: (x, y) => setCharacterHeight(x),
        onDrop: (x, y) => setCharacterHeight(x)
      }
    }

    // TODO for each valid morph target, add a slider

    return {
      'character-height': {
        id: 'character-height',
        type: 'slider',
        x: 15,
        y: 145,
        width: 420,
        height: 40,

        ...getCharacterHeightSlider(sceneObject)
      },

      // 'character-rotation': {
      //   id: 'character-rotation',
      //   type: 'slider',
      //   x: 15,
      //   y: 195 + 60,
      //   width: 420,
      //   height: 40,
      //   ...getCharacterRotationSlider(sceneObject)
      // }
    }
  }

  onSelect (id) {
    let object = this.objects[id]
    if (object && object.onSelect) {
      object.onSelect()
    }

    // if (id == '1') {
    //   let id = this.state.selections[0]
    //   let sceneObject = this.state.sceneObjects[id]

    //   let tau = Math.PI * 2

    //   let ry = sceneObject.rotation.y
    //     ? sceneObject.rotation.y
    //     : sceneObject.rotation

    //   let a = 45 * THREE.Math.DEG2RAD

    //   ry += a

    //   ry = ry % tau

    //   this.dispatch(
    //     updateObject(
    //       this.state.selections[0],
    //       sceneObject.rotation.y
    //         ? { rotation: { ...sceneObject.rotation, y: ry } }
    //         : { rotation: ry }
    //     )
    //   )
    // }
  }

  onDrag (id, u, v) {
    let object = this.objects[id]
    if (object && object.onDrag) {
      let x = u * this.canvas.width
      let y = v * this.canvas.height
      x -= object.x
      y -= object.y
      x = x / object.width
      y = y / object.height
      object.onDrag(x, y)
    }
  }

  onDrop(id, u, v) {
    let object = this.objects[id]
    if (object && object.onDrop) {
      let x = u * this.canvas.width
      let y = v * this.canvas.height
      x -= object.x
      y -= object.y
      x = x / object.width
      y = y / object.height
      object.onDrop(x, y)
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

  getCanvasIntersection (u, v) {
    let x = u * this.canvas.width
    let y = v * this.canvas.height

    for (let object of Object.values(this.objects)) {
      let { id, type } = object
      if (
        x > object.x && x < object.x + object.width &&
        y > object.y && y < object.y + object.height
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
  selectObject,
  updateObject,
  deleteObjects
} = require('../../shared/reducers/shot-generator')

const useUiManager = () => {
  const store = useReduxStore()

  const canvasRendererRef = useRef(null)
  const getCanvasRenderer = useCallback(() => {
    if (canvasRendererRef.current === null) {
      canvasRendererRef.current = new CanvasRenderer(
        1024,
        store.dispatch,
        uiService,
        camera,
        () => scene.getObjectByName('room')
      )
      canvasRendererRef.current.render()

      const update = () => {
        canvasRendererRef.current.state.selections = getSelections(store.getState())
        canvasRendererRef.current.state.sceneObjects = getSceneObjects(store.getState())
        canvasRendererRef.current.needsRender = true
      }
      store.subscribe(update)
      update()
    }
    return canvasRendererRef.current
  }, [])

  const [uiState, setUiState] = useState()

  const { gl, scene, camera } = useThree()

  const uiService = useMemo(
    () =>
      interpret(uiMachine)
        .onTransition((state, event) => {
          // console.log(event.type, '->', JSON.stringify(state.value))
          setUiState(state)
        }).start(),
    []
  )

  // simple state stuff
  const activeControl = useRef()

  uiMachine.options.actions = {
    ...uiMachine.options.actions,

    updateDraggingController: assign({
      draggingController: (context, event) => event.controller
    }),
    clearDraggingController: assign({
      draggingController: (context, event) => null
    }),

    onTriggerStart (context, event) {
      console.log('onTriggerStart')
    },

    onDraggingEntry (context, event) {
      activeControl.current = event.canvasIntersection.id
    },

    onDraggingExit (context, event) {
      if (event.intersection) {
        let u = event.intersection.uv.x
        let v = event.intersection.uv.y
        getCanvasRenderer().onDrop(activeControl.current, u, v)
      }

      activeControl.current = null
    },

    onSelect (context, event) {
      let { id } = event.canvasIntersection
      getCanvasRenderer().onSelect(id)
    },

    onDrag (context, event) {
      let u = event.intersection.uv.x
      let v = event.intersection.uv.y
      getCanvasRenderer().onDrag(activeControl.current, u, v)
    }
  }

  return { uiService, uiState, getCanvasRenderer }
}

module.exports = {
  useUiManager
}
