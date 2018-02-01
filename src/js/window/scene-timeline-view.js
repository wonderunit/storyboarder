const etch = require('etch')
const $ = etch.dom

const { clamp } = require('../utils')

const boardModel = require('../models/board')
const sceneModel = require('../models/scene')

const msToTime = ms => new Date(ms).toISOString().slice(14, -1)

// via https://webaudiodemos.appspot.com/AudioRecorder/js/audiodisplay.js
const drawBuffer = (width, height, context, data) => {
  let step = Math.ceil(data.length / width)
  let amp = height / 2
  context.clearRect(0, 0, width, height)
  for (let i = 0; i < width; i++) {
    let min = 1.0
    let max = -1.0
    for (let j = 0; j < step; j++) {
      let datum = data[(i * step) + j]

      if (datum < min) {
        min = datum
      }
      if (datum > max) {
        max = datum
      }
    }
    context.fillRect(
      i,
      (1 + min) * amp,
      1,
      Math.max(1, (max - min) * amp)
    )
  }
}

class ScaleControlView {
  constructor (props) {
    this.style = props.style
    this.onDrag = props.onDrag

    this.containerWidth = 0

    // stored position (does not change during drag)
    this.handleLeftPct = 0
    this.handleRightPct = 1
    // position updated during drag
    this.handleLeftX = 0
    this.handleRightX = 0

    this.state = {
      dragTarget: undefined,
      dragX: 0
    }

    this.onCancelMove = this.onCancelMove.bind(this)
    this.onDocumentPointerMove = this.onDocumentPointerMove.bind(this)

    this.ro = undefined

    etch.initialize(this)
  }
  update (props = {}) {
    if (props.containerWidth != null) this.containerWidth = props.containerWidth
    if (props.onDrag != null) this.onDrag = props.onDrag

    if (props.position != null) {
      // update from virtual `position`
      let handleWidthPct = this.handleRightPct - this.handleLeftPct

      this.handleLeftPct = props.position
      this.handleRightPct = props.position + handleWidthPct

      // clamp boundaries
      this.handleLeftPct = clamp(this.handleLeftPct, 0, 1)
      this.handleRightPct = clamp(this.handleRightPct, 0, 1)

      this.updateFromDrag()
    }

    etch.update(this)
  }
  render () {
    let handleWidth = this.constructor.HANDLE_WIDTH

    return $.div({
      ref: 'container',
      style: `position: absolute;
              top: 0;
              left: 0;
              bottom: 0;
              right: 0;`
    }, [
      $.div({
        on: {
          pointerdown: this.onHandlePointerDown,
          pointerup: this.onHandlePointerUp
        },
        ref: 'handleMiddle',
        style: `position: absolute;
                top: 0;
                left: ${this.handleLeftX}px;
                right: ${this.handleRightX}px;
                height: 100%;
                background-color: rgba(0, 0, 255, 0.2);
                cursor: ew-resize;`
      }),
      $.div({
        on: {
          pointerdown: this.onHandlePointerDown,
          pointerup: this.onHandlePointerUp
        },
        ref: 'handleLeft',
        style: `position: absolute;
                width: ${handleWidth}px;
                left: ${0 - handleWidth + this.handleLeftX}px;
                height: 100%;
                background-color: blue;
                cursor: e-resize;`
      }),
      $.div({
        on: {
          pointerdown: this.onHandlePointerDown,
          pointerup: this.onHandlePointerUp
        },
        ref: 'handleRight',
        style: `position: absolute;
                width: ${handleWidth}px;
                right: ${0 - handleWidth + this.handleRightX}px;
                height: 100%;
                background-color: blue;
                cursor: w-resize;`
      })
    ])
  }

  async destroy () {
    await etch.destroy(this)

    this.ro.disconnect()

    this.removeEventListeners()
  }

  connectedCallback () {
    this.ro = new window.ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === this.refs.container) {
          this.onElementResize(entry.contentRect, true)
        }
      }
    })
    this.ro.observe(this.element)
  }

  onElementResize (rect) {
    // cancel any current dragging operation
    this.resetDrag()
    this.removeEventListeners()

    // reflect drag points
    this.updateFromDrag()

    // update
    this.update({
      containerWidth: rect.width
    })
  }

  onHandlePointerDown (event) {
    if (event.target === this.refs.handleLeft ||
        event.target === this.refs.handleRight ||
        event.target === this.refs.handleMiddle) {
      this.state.dragTarget = event.target
      this.state.dragX = 0
    }
    this.attachEventListeners()
    this.update()
  }
  onDocumentPointerMove (event) {
    this.state.dragX += event.movementX
    this.updateFromDrag()
    this.update()

    let [start, end] = this.getHandlePcts()
    this.onDrag && this.onDrag({
      start,
      end
    })
  }
  onHandlePointerUp (event) {
    this.setDragChanges()
    this.resetDrag()
    this.removeEventListeners()
    this.update()
  }
  onCancelMove (event) {
    this.setDragChanges()
    this.resetDrag()
    this.removeEventListeners()
    this.update()
  }
  updateFromDrag () {
    // initialize to the last known position (from when dragging started)
    this.handleLeftX = this.containerWidth * this.handleLeftPct
    this.handleRightX = this.containerWidth - this.containerWidth * this.handleRightPct

    // add the delta accumulated over all mouse moves since we started dragging
    if (this.state.dragTarget != null) {
      if (this.state.dragTarget === this.refs.handleLeft) {
        this.handleLeftX += this.state.dragX
      }

      if (this.state.dragTarget === this.refs.handleRight) {
        this.handleRightX -= this.state.dragX
      }

      if (this.state.dragTarget === this.refs.handleMiddle) {
        let handleWidthPct = this.handleRightPct - this.handleLeftPct
        this.handleLeftX += this.state.dragX
        this.handleRightX = (this.containerWidth - this.handleLeftX) -
                        (handleWidthPct * this.containerWidth)
      }
    }

    // clamp boundaries
    this.handleLeftX = clamp(this.handleLeftX, 0, this.containerWidth)
    this.handleRightX = clamp(this.handleRightX, 0, this.containerWidth)
  }

  getHandlePcts () {
    let hLeftPct = this.handleLeftX / this.containerWidth
    let hRightPct = 1 - (this.handleRightX / this.containerWidth)
    return [clamp(hLeftPct, 0, 1), clamp(hRightPct, 0, 1)]
  }

  setDragChanges () {
    let [start, end] = this.getHandlePcts()
    this.handleLeftPct = clamp(start, 0, 1)
    this.handleRightPct = clamp(end, 0, 1)
  }
  resetDrag () {
    this.state.dragTarget = undefined
    this.state.dragX = 0
  }
  attachEventListeners () {
    document.addEventListener('pointerup', this.onCancelMove)
    window.addEventListener('blur', this.onCancelMove)
    document.addEventListener('pointermove', this.onDocumentPointerMove)
  }
  removeEventListeners () {
    document.removeEventListener('pointerup', this.onCancelMove)
    window.removeEventListener('blur', this.onCancelMove)
    document.removeEventListener('pointermove', this.onDocumentPointerMove)
  }
}
ScaleControlView.HANDLE_WIDTH = 8

class BoardView {
  constructor (props, children) {
    this.scene = props.scene
    this.scenePath = props.scenePath // TODO necessary?

    this.board = props.board
    this.kind = props.kind

    this.src = props.src

    this.scale = props.scale
    this.offset = props.offset

    this.pixelsPerMsec = props.pixelsPerMsec

    this.active = props.active
    this.enabled = props.enabled
    this.dragging = props.dragging
    this.mini = props.mini

    this.onBoardPointerDown = props.onBoardPointerDown
    this.onBoardPointerUp = props.onBoardPointerUp

    this.getAudioBufferByFilename = props.getAudioBufferByFilename

    etch.initialize(this)
  }

  render () {
    let kind = this.kind
    let index = this.scene.boards.indexOf(this.board)

    let duration = kind === 'board'
      ? boardModel.boardDuration(this.scene, this.board)
      : this.board.audio.duration

    let time = this.board.time
    let padRight = this.mini ? 0 : 10
    let w = (duration * this.pixelsPerMsec * this.scale)
    let l = (time * this.pixelsPerMsec * this.scale)

    let imageHeight = 60

    let viewHeight = this.mini
      ? this.constructor.MINI_HEIGHT
      : kind === 'board'
        ? imageHeight + 5 + 5 + 12 + 5
        : 32

    return $.div(
      {
        class: 'board',
        on: this.kind === 'board'
          ? {
            pointerdown: this.onPointerDown,
            pointerup: this.onPointerUp
          }
          : {},
        style: `width: ${Math.round(w)}px;
                min-width: 28px;
                box-sizing: content-box;
                padding: 0 ${kind === 'board' ? padRight : 0}px 0 0;
                box-sizing: border-box;
                position: absolute;
                top: 0;
                left: ${l}px;

                ${
                  this.dragging
                    ? 'opacity: 0.8; filter: saturate(120%);'
                    : ''
                }

                user-select: none;

                border-radius: 6px;
                `
      },
      [
        this.mini
          ? $.div({
            style: `position: absolute;
                  width: ${Math.max(0, Math.round(w - (kind === 'board' ? padRight : 0)))}px;
                  height: ${viewHeight}px;
                  background-color: ${
                    kind === 'board'
                      ? this.active
                        ? '#699EF2'
                        : index % 2 === 0 ? '#777' : '#555'
                      : '#7c7'
                  };
                  padding: ${
                    this.mini
                    ? 0
                    : kind === 'board'
                      ? '5px'
                      : '0'
                  };
                  box-sizing: border-box;

                  ${
                    kind === 'board'
                      ? this.active
                        ? 'box-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);'
                        : 'box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);'
                      : ''
                  }

                  overflow: hidden;
                  border-radius: 6px;`
          })
        : $.div(
          {
            style: `position: absolute;
                    width: ${Math.max(0, Math.round(w - (kind === 'board' ? padRight : 0)))}px;
                    height: ${viewHeight}px;
                    background-color: ${
                      kind === 'board'
                        ? this.active
                          ? '#699EF2'
                          : '#444'
                        : '#3f503f'
                    };
                    padding: ${kind === 'board' ? '5px' : '0'};
                    box-sizing: border-box;

                    font-family: 'wonderunitsans';
                    line-height: 1;

                    ${
                      kind === 'board'
                        ? this.active
                          ? 'box-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);'
                          : 'box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);'
                        : ''
                    }

                    overflow: hidden;
                    border-radius: 6px;

                    display: flex;
                    flex-direction: column;
                    justify-content: flext-start;`
          },
          [
            kind === 'board'
              ? $.img({
                style: `display: block;
                        border: none;
                        pointer-events: none;
                        padding: 0;
                        margin: 0;`,
                attributes: {
                  width: `${Math.round(imageHeight * this.scene.aspectRatio)}px`,
                  height: `${imageHeight}px`
                },
                src: this.src
              })
              : null,
            kind === 'board'
            ? $.div(
              {
                class: 'board__info',
                style: `padding: 5px 0 0 0;
                        display: flex;
                        font-size: 10px;
                        font-weight: 100;
                        color: ${
                          this.active
                            ? 'rgba(0, 0, 0, 0.8)'
                            : '#999'
                        }`
              },
              [
                $.div({ class: 'board__number', style: 'font-weight: 700' }, `${this.board.shot}`),
                $.div({ class: 'board__audio' }),
                $.div({ class: 'board__caption', style: 'flex: 1' }),
                $.div({ class: 'board__duration' }, `${msToTime(boardModel.boardDuration(this.scene, this.board))}`)
              ]
            )
            : null
          ]
        ),
        kind === 'board'
          ? null
          : [
            $.canvas(
              {
                ref: 'canvas',
                attributes: {
                  width: `${Math.round(w - (kind === 'board' ? padRight : 0))}px`,
                  height: `${viewHeight}px`
                },
                style: `position: absolute;
                        width: ${Math.round(w - (kind === 'board' ? padRight : 0))}px;
                        height: ${viewHeight}px;
                        box-sizing: border-box;
                        border-radius: 6px;
                        overflow: hidden;
                        `
              }
            )
          ],
        kind === 'audio'
          ? null
          : $.div(
            {
              ref: 'handle',
              class: 'board-item__handle',
              style: `position: absolute;
                      right: ${Math.round(padRight / 1.5)}px;
                      width: ${padRight}px;
                      height: ${viewHeight}px;
                      box-sizing: border-box;
                      ${
                        this.enabled
                          ? 'cursor: ew-resize;'
                          : ''
                      }`
            }
          )
      ]
    )
  }

  update (props = {}, children = {}) {
    // very basic change tracking
    let dirty = false
    let trackables = [
      'board', 'src', 'scale', 'offset', 'active', 'enabled', 'dragging', 'pixelsPerMsec'
    ]
    for (let k of trackables) {
      if (props[k] != null && props[k] !== this[k]) {
        dirty = true
      }
    }

    if (props.scene != null) this.scene = props.scene
    if (props.scenePath != null) this.scenePath = props.scenePath // TODO necessary?

    if (props.kind != null) this.kind = props.kind
    if (props.board != null) this.board = props.board

    if (props.src != null) this.src = props.src

    if (props.scale != null) this.scale = props.scale
    if (props.offset != null) this.offset = props.offset

    if (props.pixelsPerMsec != null) this.pixelsPerMsec = props.pixelsPerMsec

    if (props.active != null) this.active = props.active
    if (props.enabled != null) this.enabled = props.enabled
    if (props.dragging != null) this.dragging = props.dragging
    if (props.mini != null) this.mini = props.mini

    if (dirty) {
      return etch.update(this)
    }
  }

  // FIXME moving 1A to the 8A slot was not calling update/writeAfterUpdate for 8A
  //       the LaneView was updated, and the first child (4A) was updated
  //       but the last child (8A) was not, and the canvas was not rendered
  //       fixed by calling LaneView#forceChildrenUpdate()
  //       but we need a better resolution
  //       need to figure out why one child component was not marked for update
  //       https://github.com/atom/etch/issues/46
  async writeAfterUpdate () {
    if (this.kind === 'audio' && !this.mini) {
      let canvas = this.refs.canvas
      let context = canvas.getContext('2d')

      let data = this.getAudioBufferByFilename(this.board.audio.filename).getChannelData(0)
      context.fillStyle = '#7c7'
      drawBuffer(context.canvas.width, context.canvas.height, context, data)
    }
  }

  onPointerDown (event) {
    if (this.mini) return
    this.onBoardPointerDown(event, this)
  }

  onPointerUp (event) {
    if (this.mini) return
    this.onBoardPointerUp(event, this)
  }
}
BoardView.MINI_HEIGHT = 3

class LaneView {
  constructor (props, children) {
    this.scale = props.scale
    this.kind = props.kind
    this.mini = props.mini
    this.children = children
    etch.initialize(this)
  }

  render () {
    let laneHeight = this.mini
      ? LaneView.MINI_HEIGHT
      : this.kind === 'board' ? 88 : 32

    return $.div(
      {
        class: 'lane',
        style: `
        position: relative;
        box-sizing: border-box;
        height: ${laneHeight}px;
        margin-bottom: ${this.mini ? 1 : 10}px;
        `
      },
      this.children
    )
  }

  async update (props, children) {
    if (props.scale != null) this.scale = props.scale
    if (props.kind != null) this.kind = props.kind
    if (props.mini != null) this.mini = props.mini
    this.children = children

    await etch.update(this)

    this.forceChildrenUpdate()
  }

  // HACK canvas wasn't updating after re-order
  //      this fixes it
  forceChildrenUpdate () {
    // HACK force update
    this.children.forEach(c => c.component.update())
  }
}
LaneView.MINI_HEIGHT = 3

class TimelineView {
  // Required: Define an ordinary constructor to initialize your component.
  constructor (props, children) {
    this.scale = props.scale
    this.position = props.position

    this.scene = props.scene
    this.scenePath = props.scenePath // TODO necessary?

    this.pixelsPerMsec = props.pixelsPerMsec
    this.containerWidth = props.containerWidth
    this.mini = props.mini

    this.currentBoardIndex = props.currentBoardIndex

    this.getAudioBufferByFilename = props.getAudioBufferByFilename
    this.getSrcByUid = props.getSrcByUid

    this.onBoardPointerDown = this.onBoardPointerDown.bind(this)
    this.onBoardPointerUp = this.onBoardPointerUp.bind(this)
    this.onCancelMove = this.onCancelMove.bind(this)

    this.onDocumentPointerMove = this.onDocumentPointerMove.bind(this)

    this.onMoveSelectedBoards = props.onMoveSelectedBoards
    this.onSetCurrentBoardIndex = props.onSetCurrentBoardIndex
    this.onModifyBoardDurationByIndex = props.onModifyBoardDurationByIndex
    this.onScroll = props.onScroll

    this.state = {
      resizableBoardView: undefined,
      resizableBoardOriginalDuration: undefined,
      resizableOffsetInPx: 0,

      draggableBoardView: undefined,
      draggableBoardOriginalTime: undefined,
      draggableOffsetInPx: 0,

      insertPointInMsecs: 0
    }

    // perform custom initialization here...
    // then call `etch.initialize`:
    etch.initialize(this)
  }

  // Required: The `render` method returns a virtual DOM tree representing the
  // current state of the component. Etch will call `render` to build and update
  // the component's associated DOM element. Babel is instructed to call the
  // `etch.dom` helper in compiled JSX expressions by the `@jsx` pragma.
  render () {
    let boardsViews = this.scene.boards.map((board, index) =>
        etch.dom(BoardView, {
          pixelsPerMsec: this.pixelsPerMsec,
          scale: this.scale,
          board: board,
          src: this.mini ? undefined : this.getSrcByUid(board.uid),
          kind: 'board',
          scene: this.scene,
          scenePath: this.scenePath, // TODO necessary?
          onBoardPointerDown: this.onBoardPointerDown,
          onBoardPointerUp: this.onBoardPointerUp,
          active: this.currentBoardIndex === index,
          enabled: !this.state.draggableBoardView,
          dragging: !!(this.state.draggableBoardView &&
                    this.state.draggableBoardView.board === board),
          mini: this.mini,
          getAudioBufferByFilename: this.getAudioBufferByFilename
        }))

    let lanes = [{ boards: [], endInMsecs: 0 }]
    let timelinePosInMsecs = 0
    for (let board of this.scene.boards) {
      let duration = (typeof board.duration === 'undefined' || board.duration === 0)
                       ? this.scene.defaultBoardTiming
                       : board.duration

      if (board.audio) {
        let buffer = this.getAudioBufferByFilename(board.audio.filename)

        let audioDurationInMsecs = Math.round(buffer.duration * 1000)

        let currLane = lanes.length
        for (let i = 0; i < lanes.length; i++) {
          let time = lanes[i].endInMsecs
          if (timelinePosInMsecs >= time) {
            currLane = i
            break
          }
        }
        lanes[currLane] = lanes[currLane] || { boards: [], endInMsecs: 0 }
        lanes[currLane].boards.push(board)
        lanes[currLane].endInMsecs = timelinePosInMsecs + audioDurationInMsecs

        timelinePosInMsecs += duration
      }
    }

    // let audioViews = this.scene.boards
    //     .filter(board => typeof board.audio !== 'undefined')
    //     .map(board => etch.dom(BoardView, { scale: this.scale, board: { time: board.time, duration: board.audio.duration }, scene: this.scene }))
    //
    let audioLanes = lanes.map(lane =>
      etch.dom(LaneView, { kind: 'audio', mini: this.mini }, lane.boards.map((board, index) =>
        etch.dom(BoardView, {
          pixelsPerMsec: this.pixelsPerMsec,
          scale: this.scale,
          board: board,
          kind: 'audio',
          scene: this.scene,
          scenePath: this.scenePath,
          active: this.currentBoardIndex === index,
          enabled: !this.state.draggableBoardView,
          dragging: !!(this.state.draggableBoardView &&
                    this.state.draggableBoardView.board === board),
          mini: this.mini,
          getAudioBufferByFilename: this.getAudioBufferByFilename
        })
      ))
    )

    // let entireWidth = this.sceneDurationInMsecs * this.pixelsPerMsec * this.scale

    let caretView
    if (this.state.draggableBoardView) {
      let movementX = this.state.draggableOffsetInPx / (this.pixelsPerMsec * this.scale)
      let goalTime = this.state.draggableBoardView.board.time + movementX

      // quantize to available points
      const closest = (arr, goal) => arr.reduce((prev, curr) => Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev)
      let times = this.scene.boards.map(b => b.time).concat(sceneModel.sceneDuration(this.scene))
      this.state.insertPointInMsecs = closest(times, goalTime)

      let caretLeft = this.state.insertPointInMsecs * this.pixelsPerMsec * this.scale

      caretView = $.div(
        {
          style: `position: absolute;
                  top: 0;
                  left: ${caretLeft}px;`
        },
        $.div(
          {
            style: `width: 0;
                    height: 0;
                    position: absolute;
                    left: -${5 + 5}px;
                    border-left: 5px solid transparent;
                    border-right: 5px solid transparent;
    
                    border-top: 5px solid #999;`
          }
        )
      )
    }

    let cursor = this.state.draggableBoardView
      ? '-webkit-grabbing'
      : null

    let boardLane = etch.dom(LaneView, { kind: 'board', mini: this.mini }, boardsViews)

    return $.div(
      {
        ref: 'timelineOuter',
        class: 'timeline-outer',
        on: {
          wheel: this.onWheel
        },
        style: `position: relative;
                ${cursor ? `cursor: ${cursor}` : ''};
                overflow: scroll;`
      },
      $.div(
        {
          class: 'timeline',
          style: `position: relative;
                  background-color: #333;`
        },
        [
          boardLane,
          audioLanes,
          this.state.draggableBoardView ? caretView : null
        ]
      )
    )
  }

  // Required: Update the component with new properties and children.
  update (props, children) {
    if (props.scene) this.scene = props.scene

    if (props.scale != null) this.scale = props.scale
    if (props.position != null) this.position = props.position

    if (props.containerWidth != null) this.containerWidth = props.containerWidth
    if (props.pixelsPerMsec != null) this.pixelsPerMsec = props.pixelsPerMsec
    if (props.mini != null) this.mini = props.mini

    if (props.currentBoardIndex != null) this.currentBoardIndex = props.currentBoardIndex

    // TODO only calculate this when scene changes
    //      or maybe only on init?
    this.sceneDurationInMsecs = sceneModel.sceneDuration(this.scene)

    this.pixelsPerMsec = this.containerWidth / this.sceneDurationInMsecs

    // perform custom update logic here...
    // then call `etch.update`, which is async and returns a promise
    return etch.update(this)
  }

  // Optional: Destroy the component. Async/await syntax is pretty but optional.
  async destroy () {
    document.removeEventListener('pointerup', this.onCancelMove)
    document.removeEventListener('pointermove', this.onDocumentPointerMove)
    window.removeEventListener('blur', this.onCancelMove)

    this.ro.disconnect()

    // call etch.destroy to remove the element and destroy child components
    await etch.destroy(this)
    // then perform custom teardown logic here...
  }

  connectedCallback () {
    document.addEventListener('pointerup', this.onCancelMove)
    document.addEventListener('pointermove', this.onDocumentPointerMove)
    window.addEventListener('blur', this.onCancelMove)

    this.ro = new window.ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === this.refs.timelineOuter) {
          this.onElementResize(entry.contentRect, true)
        }
      }
    })
    this.ro.observe(this.element)
  }

  onElementResize (rect, forceUpdate = false) {
    if (this.containerWidth !== rect.width) {
      this.update({ containerWidth: rect.width })
      if (forceUpdate) etch.updateSync(this) // to avoid FOUC
    }
  }

  // DEPRECATED
  // async updateCaret () {
  // }

  // TODO replace with common fn
  // TODO sort by time, re-number
  // TODO compare with the updated version we copied over to main-window.js
  // updateSceneTiming () {
  //   // TODO
  //   // TODO
  //   // TODO
  //   return
  // 
  //   this.scene.boards.forEach((board, i) => {
  //     // if (board === this.state.draggableBoardView) return
  // 
  //     if (this.state.draggableBoardView &&
  //         board === this.state.draggableBoardView.board
  //       ) return
  // 
  //     let prevBoard = this.scene.boards[i - 1]
  //     if (prevBoard) {
  //       board.time = prevBoard.time + boardModel.boardDuration(this.scene, prevBoard)
  //     } else {
  //       board.time = 0
  //     }
  //   })
  // 
  // 
  // 
  // 
  //   // HACK re-numbering (copied from main-window.js)
  //   let currentShot = 0
  //   let subShot = 0
  //   let boardNumber = 1
  //   let currentTime = 0
  // 
  //   let hasShots = false
  //   for (let board of this.scene.boards) {
  //     if (board.newShot) {
  //       hasShots = true
  //       break
  //     }
  //   }
  // 
  //   for (let board of this.scene.boards) {
  //     if (hasShots) {
  //       if (board.newShot || (currentShot === 0)) {
  //         currentShot++
  //         subShot = 0
  //       } else {
  //         subShot++
  //       }
  // 
  //       let substr = String.fromCharCode(97 + (subShot % 26)).toUpperCase()
  //       if ((Math.ceil(subShot / 25) - 1) > 0) {
  //         substr += (Math.ceil(subShot / 25))
  //       }
  //       board.shot = currentShot + substr
  //       board.number = boardNumber
  //     } else {
  //       board.number = boardNumber
  //       board.shot = (boardNumber) + 'A'
  //     }
  //     boardNumber++
  // 
  //     board.time = currentTime
  // 
  //     if (board.duration) {
  //       currentTime += board.duration
  //     } else {
  //       currentTime += this.scene.defaultBoardTiming
  //     }
  //   }
  // }

  async onBoardPointerDown (event, boardView) {
    let index = this.scene.boards.indexOf(boardView.board)

    this.onSetCurrentBoardIndex(index)

    if (event.target === boardView.refs.handle) {
      this.state.resizableBoardView = boardView
      this.state.resizableBoardOriginalDuration = boardModel.boardDuration(this.scene, boardView.board)
      this.state.resizableOffsetInPx = 0
    } else {
      this.state.draggableBoardView = boardView
      this.state.draggableBoardOriginalTime = boardView.board.time
      this.state.draggableOffsetInPx = 0
      // await this.updateCaret()
    }
  }

  async onDocumentPointerMove (event) {
    if (this.state.draggableBoardView || this.state.resizableBoardView) {
      this.state.resizableOffsetInPx += event.movementX
      this.state.draggableOffsetInPx += event.movementX
    }

    if (this.state.draggableBoardView) {
      // await this.updateCaret()
    }

    if (this.state.resizableBoardView) {
      let index = this.scene.boards.indexOf(this.state.resizableBoardView.board)
      let movementX = this.state.resizableOffsetInPx / (this.pixelsPerMsec * this.scale)

      let minDuration = Math.round(1000 / this.scene.fps)
      let newDuration = Math.max(minDuration,
        Math.round(
          (this.state.resizableBoardOriginalDuration + movementX) / 100
        ) * 100
      )
      this.onModifyBoardDurationByIndex(index, newDuration)
    }

    if (this.state.draggableBoardView || this.state.resizableBoardView) {
      // update the timing for the rest of the scene
      // TODO
      // TODO
      // TODO
      // this.updateSceneTiming()

      // TODO add undo state
      // TODO markBoardFileDirty()

      // updates the caret
      await this.update({ }) //  scene: this.scene })
    }
  }

  async completeDragOrResize (event) {
    if (this.state.draggableBoardView) {
      let boardToInsertBefore = this.scene.boards.find(board => board.time === this.state.insertPointInMsecs)
      // console.log('boardToInsertBefore', this.scene.boards.indexOf(boardToInsertBefore))

      let selections = new Set([this.scene.boards.indexOf(this.state.draggableBoardView.board)])
      let position = this.scene.boards.indexOf(boardToInsertBefore)

      let didChange = this.onMoveSelectedBoards(selections, position)
    }

    this.state.resizableBoardView = undefined
    this.state.resizableBoardOriginalDuration = undefined
    this.state.resizableOffsetInPx = 0

    this.state.draggableBoardView = undefined
    this.state.draggableBoardOriginalTime = undefined
    this.state.draggableOffsetInPx = 0

    this.state.insertPointInMsecs = 0
  }

  async onBoardPointerUp (event, boardView) {
    await this.completeDragOrResize()
  }

  async onCancelMove (event) {
    await this.completeDragOrResize()
  }

  onWheel (event) {
    // let scrollable = this.refs.timelineOuter
    // let position = scrollable.scrollLeft / scrollable.scrollWidth
    // let scale = this.scale // + (event.deltaY * this.pixelsPerMsec)

    this.onScroll && this.onScroll(event)

    event.stopPropagation()
    event.preventDefault()
    event.returnValue = false
    return false
  }

  // use scrollLeft:
  async writeAfterUpdate () {
    /*
    let maxPos = 1 - (1 / this.scale)
    let entireWidth = this.sceneDurationInMsecs * this.pixelsPerMsec * this.scale
    let scrollLeft = Math.min(maxPos, this.position) * entireWidth
    */

    let entireWidth = this.sceneDurationInMsecs * this.pixelsPerMsec * this.scale
    let scrollLeft = this.position * entireWidth

    // if (!this.mini) {
    //   console.log('timeline', {
    //     position: this.position,
    //     scrollLeft
    //   })
    // }
    this.refs.timelineOuter.scrollLeft = scrollLeft
  }
}

class SceneTimelineView {
  constructor (props, children) {
    this.scale = props.scale
    this.position = props.position

    this.scene = props.scene
    this.scenePath = props.scenePath // TODO necessary?

    this.pixelsPerMsec = props.pixelsPerMsec
    this.mini = props.mini

    this.currentBoardIndex = props.currentBoardIndex
    this.getAudioBufferByFilename = props.getAudioBufferByFilename
    this.getSrcByUid = props.getSrcByUid

    this.onMoveSelectedBoards = props.onMoveSelectedBoards
    this.onSetCurrentBoardIndex = props.onSetCurrentBoardIndex
    this.onModifyBoardDurationByIndex = props.onModifyBoardDurationByIndex

    this.onTimelineScroll = this.onTimelineScroll.bind(this)
    this.onScaleControlDrag = this.onScaleControlDrag.bind(this)

    etch.initialize(this)
  }

  render () {
    return $.div(
      {
        style: `margin: 0 ${6 + ScaleControlView.HANDLE_WIDTH * 2}px;`
      },
      [
        $(TimelineView, {
          ref: 'timelineView',

          scene: this.scene,
          scenePath: this.scenePath, // TODO necessary?

          scale: this.scale,
          position: this.position,

          currentBoardIndex: this.currentBoardIndex,

          getAudioBufferByFilename: this.getAudioBufferByFilename,
          getSrcByUid: this.getSrcByUid,

          onMoveSelectedBoards: this.onMoveSelectedBoards,
          onSetCurrentBoardIndex: this.onSetCurrentBoardIndex,
          onModifyBoardDurationByIndex: this.onModifyBoardDurationByIndex,

          onScroll: this.onTimelineScroll
        }),

        $.div(
          {
            style: `position: relative;
                    width: 100%;
                    margin: 0 0 10px 0;`
          },
          [
            $(TimelineView, {
              ref: 'miniTimelineView',

              scene: this.scene,
              scenePath: this.scenePath, // TODO necessary?

              scale: 1,
              position: 0,

              mini: true,

              currentBoardIndex: this.currentBoardIndex,
              getAudioBufferByFilename: this.getAudioBufferByFilename
            }),

            $(ScaleControlView, {
              ref: 'scaleControlView',

              // FIXME scrolling
              // position: this.position,

              onDrag: this.onScaleControlDrag
            })
          ]
        )
      ]
    )
  }

  update (props, children) {
    if (props.scene) this.scene = props.scene

    if (props.scale != null) this.scale = props.scale
    if (props.position != null) this.position = props.position

    if (props.pixelsPerMsec != null) this.pixelsPerMsec = props.pixelsPerMsec
    if (props.mini != null) this.mini = props.mini

    if (props.currentBoardIndex != null) this.currentBoardIndex = props.currentBoardIndex

    return etch.update(this)
  }

  async destroy () {
    // call etch.destroy to remove the element and destroy child components
    await etch.destroy(this)
    // then perform custom teardown logic here...
  }

  connectedCallback () {
    this.refs.miniTimelineView.connectedCallback()
    this.refs.timelineView.connectedCallback()
    this.refs.scaleControlView.connectedCallback()
  }

  onScaleControlDrag ({ start, end }) {
    let position = start
    let scale = 1 / (end - start)

    if (scale === Infinity) return
    this.update({
      position,
      scale
    })
  }

  onTimelineScroll (event) {
    // FIXME scrolling
    // if (this.scale <= 1) return
    // let pixelsPerMsec = this.refs.timelineView.containerWidth / this.refs.timelineView.sceneDurationInMsecs
    // this.position = this.position -= ((event.movementX * pixelsPerMsec) / this.scale)
    // this.position = clamp(this.position, 0, 1)
    // this.update({ position: this.position })
  }
}

module.exports = SceneTimelineView
