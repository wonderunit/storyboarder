const { useState, useMemo, useRef, useCallback } = React = require('react')
const useReduxStore = require('react-redux').useStore
const { useRender, useThree } = require('react-three-fiber')
const { interpret } = require('xstate/lib/interpreter')

const { log } = require('./components/Log')
const uiMachine = require('./machines/uiMachine')
const getControllerIntersections = require('./helpers/get-controller-intersections')

const toRotation = value => value * (Math.PI * 2)
const fromRotation = value => value / (Math.PI * 2)
const mappers = {
  toRotation,
  fromRotation
}

function Slider ({ ctx, width, height, state, getLabel }) {
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

class CanvasRenderer {
  constructor (size, dispatch, service) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.canvas.height = size
    this.context = this.canvas.getContext('2d')

    this.dispatch = dispatch
    this.service = service

    this.state = {
      selections: [],
      sceneObjects: {}
    }

    this.objects = {}

    this.needsRender = false
  }
  render () {
    let canvas = this.canvas
    let ctx = this.context

    this.context.fillStyle = 'white'
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)

    if (this.state.selections.length) {
      let id = this.state.selections[0]
      let sceneObject = this.state.sceneObjects[id]

      if (sceneObject.type == 'character') {
        this.objects = this.getObjectsForCharacter(sceneObject)
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
        ? ctx.fillText('rotation:' + (sceneObject.rotation.y * THREE.Math.RAD2DEG).toFixed(2) + '°', 0, 0)
        : ctx.fillText('rotation:' + (sceneObject.rotation * THREE.Math.RAD2DEG).toFixed(2) + '°', 0, 0)
      ctx.restore()

      // spacer
      ctx.translate(0, 60)

      // button
      ctx.save()
      ctx.translate(15, 15)
      ctx.fillStyle = '#eee'
      ctx.fillRect(0, 0, 420, 50)
      // let { e, f } = ctx.getTransform()
      // console.log('hit state:', e, f, 'to', e + 420, f + 50)
      ctx.translate(420/2, 50/2)
      ctx.font = '20px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'black'
      ctx.fillText('Rotate 45°', 0, 0)
      ctx.restore()

      ctx.restore()

      // slider
      for (let object of Object.values(this.objects)) {
        let { type, x, y, width, height, ...props } = object

        if (object.type === 'slider') {
          ctx.save()
          ctx.translate(x, y)
          Slider({
            ctx,
            width,
            height,

            ...props
          })
          ctx.restore()
        }
      }

      // hit state
      ctx.save()
      ctx.fillStyle = 'red'
      ctx.globalAlpha = 0.5
      ctx.fillRect(15, 135, 420, 50)
      ctx.globalAlpha = 1
      ctx.restore()
    }
  }

  select (id) {
    if (id == '1') {
      let id = this.state.selections[0]
      let sceneObject = this.state.sceneObjects[id]

      let tau = Math.PI * 2

      let ry = sceneObject.rotation.y
        ? sceneObject.rotation.y
        : sceneObject.rotation

      let a = 45 * THREE.Math.DEG2RAD

      ry += a

      ry = ry % tau

      this.dispatch(
        updateObject(
          this.state.selections[0],
          sceneObject.rotation.y
            ? { rotation: { ...sceneObject.rotation, y: ry } }
            : { rotation: ry }
        )
      )
    }
  }

  getObjectsForCharacter (sceneObject) {
    let state = mappers.fromRotation(sceneObject.rotation)

    // TODO when dragging, set to a function which modifies local THREE object
    //      when dropping, set to a function which dispatches to store
    let setState = value => {
      let rotation = mappers.toRotation(THREE.Math.clamp(value, 0, 1))

      this.dispatch(
        updateObject(
          sceneObject.id,
          { rotation }
        )
      )
    }
    let getLabel = value => 'rotation:' + mappers.toRotation(value).toFixed(1) + ' rad'

    let onDrag = (x, y) => setState(x)

    let onDrop = onDrag

    return {
      '2': {
        id: '2',
        type: 'slider',
        x: 15,
        y: 195,
        width: 420,
        height: 40,

        state,
        setState,
        onDrag,
        onDrop,
        getLabel
      }
    }
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

    if (
      x > 15 && x < 435 &&
      y > 135 && y < 185
    ) {
      // TODO include local x,y? and u,v?
      return { id: '1', type: 'button' }
    }

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
  updateObject
} = require('../../shared/reducers/shot-generator')

const useUiManager = () => {
  const store = useReduxStore()

  const canvasRendererRef = useRef(null)
  const getCanvasRenderer = useCallback(() => {
    if (canvasRendererRef.current === null) {
      canvasRendererRef.current = new CanvasRenderer(
        1024,
        store.dispatch,
        uiService
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

  const { gl, scene } = useThree()

  const uiService = useMemo(
    () =>
      interpret(uiMachine)
        .onTransition((state, event) => {
          console.log(event.type, '->', JSON.stringify(state.value))
          setUiState(state)
        }).start(),
    []
  )

  // TODO move this to ui machine context?
  // simple state stuff
  const draggingController = useRef()
  const activeControl = useRef()

  uiMachine.options.actions = {
    ...uiMachine.options.actions,

    onTriggerStart (context, event) {
      console.log('onTriggerStart')
    },

    onDraggingEntry (context, event) {
      draggingController.current = event.controller
      activeControl.current = event.canvasIntersection.id
    },

    onDraggingExit (context, event) {
      let u = event.intersection.uv.x
      let v = event.intersection.uv.y
      getCanvasRenderer().onDrop(activeControl.current, u, v)

      draggingController.current = null
      activeControl.current = null
    },

    onSelect (context, event) {
      let { id } = event.canvasIntersection
      getCanvasRenderer().select(id)
    },

    onDrag (context, event) {
      let u = event.intersection.uv.x
      let v = event.intersection.uv.y
      getCanvasRenderer().onDrag(activeControl.current, u, v)
    }
  }

  useRender(() => {
    let mode = uiService.state.value

    if (mode.controls == 'dragging') {
      let controller = draggingController.current

      let uis = scene.__interaction.filter(o => o.userData.type == 'ui')
      let intersections = getControllerIntersections(controller, uis)
      let intersection = intersections.length && intersections[0]

      if (intersection) {
        let u = intersection.uv.x
        let v = intersection.uv.y
        let canvasIntersection = getCanvasRenderer().getCanvasIntersection(u, v)
        uiService.send({
          type: 'CONTROLLER_INTERSECTION',
          controller,
          canvasIntersection,
          intersection
        })
      }
    }
  }, false, [uiService.state.value, draggingController.current])

  return { uiService, uiState, getCanvasRenderer }
}

module.exports = {
  useUiManager
}
