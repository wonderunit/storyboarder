const { useState, useMemo, useRef, useCallback } = React = require('react')
const useReduxStore = require('react-redux').useStore
const { useRender, useThree } = require('react-three-fiber')
const { interpret } = require('xstate/lib/interpreter')

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

function Button ({ ctx, width, height, state, getLabel }) {
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

    this.needsRender = false
  }
  render () {
    let canvas = this.canvas
    let ctx = this.context

    this.context.fillStyle = 'white'
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)

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
        Button({
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
        Slider({
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
      if (event.intersection) {
        let u = event.intersection.uv.x
        let v = event.intersection.uv.y
        getCanvasRenderer().onDrop(activeControl.current, u, v)
      }

      draggingController.current = null
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
