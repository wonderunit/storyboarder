const {
  selectObject,
  updateObject,
  setActiveCamera,
  undoGroupStart,
  undoGroupEnd,
  initialState
} = require('../../../../shared/reducers/shot-generator')

const {createdMirroredHand, applyChangesToSkeleton, getOppositeHandName} = require("../../../../utils/handSkeletonUtils")

const getPoseImageFilepathById = id => `/data/presets/poses/${id}.jpg`
const getHandPoseImageFilepathById = id => `/data/presets/handPoses/${id}.jpg`
const getModelImageFilepathById = id => `/data/system/objects/${id}.jpg`
const getCharacterImageFilepathById = id => `/data/system/dummies/gltf/${id}.jpg`
const getFovAsFocalLength = (fov, aspect) => new THREE.PerspectiveCamera(fov, aspect).getFocalLength()

const drawText = ({ ctx, label, size, weight = '', align = 'left', baseline = 'top', color = '#fff' }) => {
  ctx.save()
  ctx.font = `${weight} ${size}px Arial`
  ctx.textAlign = align
  ctx.textBaseline = baseline
  ctx.fillStyle = color
  ctx.fillText(label, 0, 0)
  ctx.restore()
}

const drawImageButton = ({
  ctx,
  width,
  height,
  image,
  fill = '#000',
  flip = false,
  flipY = false,
  drawBG = false,
  padding = 0,
  rounding = 25,
  state = false,
  stroke = false,
  drawSquare = false
}) => {
  ctx.save()

  ctx.fillStyle = fill
  if (drawBG) roundRect(ctx, -padding, -padding, width + padding * 2, height + padding * 2, rounding, true, false)

  if (state > 0) { 
    ctx.fillStyle = '#6E6E6E'
    roundRect(ctx, 0, 0, width - 10, height, 12, true, false) 
  }
  if (drawBG) roundRect(ctx, -padding, -padding, width + padding * 2, height + padding * 2, 25, true, false)
  if (stroke) {
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    roundRect(ctx, 0, 0, width - 10, height, 12, false, true)
  }
  if (flip) ctx.scale(-1, 1)
  if (flipY) ctx.scale(1, -1)

  if(drawSquare) {
    let x = (width / 2) - (height / 2)
    ctx.drawImage(image, x, 0, height, height)
  } else {
    ctx.drawImage(image, flip ? -width : 0, flipY ? -height : 0, width, height)
  }
  ctx.restore()
}

const drawButton = ({ ctx, width, height, label, fill = 'rgba(0, 0, 0, 0)', fontSize = 20, fontWeight = 500 }) => {
  ctx.save()
  ctx.fillStyle = fill
  roundRect(ctx, 0, 0, width, height, 12, true, false)
  ctx.translate(width / 2, height / 2)
  ctx.font = `${fontWeight} ${fontSize}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'white'
  ctx.fillText(label || '', 0, 0)
  ctx.restore()
}

const drawSlider = ({ ctx, width, height, state, label }) => {
  // value
  ctx.save()
  ctx.fillStyle = '#6E6E6E'
  if (state > 0) roundRect(ctx, 0, 0, (width - 10) * state, height, 12, true, false)

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

const drawToggleButton = ({ ctx, width, height, cookieBoolean }) => {
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

const roundRect = (ctx, x, y, width, height, radius, fill, stroke) => {
  if (typeof stroke == 'undefined') {
    stroke = true
  }
  if (typeof radius === 'undefined') {
    radius = 5
  }
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius }
  } else {
    var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 }
    for (var side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side]
    }
  }
  ctx.beginPath()
  ctx.moveTo(x + radius.tl, y)
  ctx.lineTo(x + width - radius.tr, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr)
  ctx.lineTo(x + width, y + height - radius.br)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height)
  ctx.lineTo(x + radius.bl, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl)
  ctx.lineTo(x, y + radius.tl)
  ctx.quadraticCurveTo(x, y, x + radius.tl, y)
  ctx.closePath()
  if (fill) {
    ctx.fill()
  }
  if (stroke) {
    ctx.stroke()
  }
}


const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
  var words = text.split(' '),
    line = '',
    lineCount = 0,
    i,
    test,
    metrics

  for (i = 0; i < words.length; i++) {
    test = words[i]
    metrics = context.measureText(test)
    while (metrics.width > maxWidth) {
      // Determine how much of the word will fit
      test = test.substring(0, test.length - 1)
      metrics = context.measureText(test)
    }
    if (words[i] != test) {
      words.splice(i + 1, 0, words[i].substr(test.length))
      words[i] = test
    }

    test = line + words[i] + ' '
    metrics = context.measureText(test)

    if (metrics.width > maxWidth && i > 0) {
      context.fillText(line, x, y)
      line = words[i] + ' '
      y += lineHeight
      lineCount++
    } else {
      line = test
    }
  }

  context.fillText(line, x, y)
}

const drawPaneBGs = (ctx) => {
  ctx.fillStyle = 'rgba(0,0,0)'
  // property
  roundRect(ctx, 4, 6, 439, 666, 25, true, false)
  // extended property
  roundRect(ctx, 554, 6, 439, 666, 25, true, false)
  roundRect(ctx, 6, 682, 439, 325 - 114, 25, true, false)
  // roundRect(ctx, 483, 288, 66, 105, 25, true, false)
  // home
  roundRect(ctx, 667, 684, 200, 200, 25, true, false)
  //roundRect(ctx, 667, 684, 200, 200, 25, true, false)
  roundRect(ctx, 456, 684, 200, 200, 25, true, false)
  roundRect(ctx, 909, 684, 88, 88, 25, true, false)
  // back plane
  roundRect(ctx, 453, 889, 440, 132, 25, true, false)
}

const drawGrid = function drawGrid(ctx, x, y, width, height, items, type, rowCount = 4, sceneObject, selectedHand) {
  ctx.save()
  ctx.fillStyle = '#000'
  ctx.fillRect(x, y, width, height)
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()

  let cols = rowCount
  let itemHeight = width / cols / 0.68
  let gutter = 5
  let offset = this.state.grids[type].scrollTop || 0

  const gridHeight = Math.ceil(items.length / cols) * itemHeight
  let itemWidth = (width - gutter * (cols - 1)) / cols
  let visibleRows = Math.min(Math.ceil(height / itemHeight) + 1, items.length / cols)
  let startItem = Math.floor(offset / itemHeight) * cols

  offset = offset % itemHeight

  ctx.font = '30px Arial'
  ctx.textBaseline = 'top'

  for (let i2 = 0; i2 < visibleRows; i2++) {
    for (let i = 0; i < cols; i++) {
      if (startItem >= items.length) break
      const item = items[startItem]

      let filepath
      switch (type) {
        case 'pose':
          filepath = getPoseImageFilepathById(item.id)
          break
        case 'character':
          filepath = getCharacterImageFilepathById(item.id)
          break
        case 'object':
          filepath = getModelImageFilepathById(item.id)
          break
        case 'handPoses':
          filepath = getHandPoseImageFilepathById(item.id)
          break
      }

      this.drawLoadableImage(
        filepath,

        image => {
          // loaded state
          // object should allow selection
          ctx.drawImage(image, x + i * itemWidth + i * gutter, y + itemHeight * i2 - offset, itemWidth, itemHeight - gutter)
        },

        () => {
          // loading state
          // object should not allow selection
          ctx.save()
          ctx.fillStyle = '#222'
          ctx.fillRect(x + i * itemWidth + i * gutter, y + itemHeight * i2 - offset, itemWidth, itemHeight - gutter)
          ctx.restore()
        }
      )

      this.paneComponents['grid'][item.name] = {
        id: item.id,
        name: item.name,
        type: 'button',
        x: x + i * itemWidth + i * gutter,
        y: y + itemHeight * i2 - offset,
        width: itemWidth,
        height: itemHeight - gutter,
        invisible: true
      }

      ctx.fillStyle = 'white'
      ctx.font = '24px Arial'
      ctx.textBaseline = 'top'
      ctx.fillText(startItem + 1, x + i * itemWidth + i * gutter + 8, y + itemHeight * i2 - offset + 8)

      ctx.font = '12px Arial'
      ctx.textBaseline = 'bottom'
      ctx.fillText(
        item.name.slice(0, 15),
        x + i * itemWidth + i * gutter + 2,
        y + itemHeight * i2 - offset + itemHeight - gutter - 2
      )
      startItem++
    }
  }

  this.paneComponents['grid']['grid-background'] = {
    id: 'grid-background',
    type: 'button',
    x,
    y,
    width,
    height,
    onSelect: (x, y) => {
      this.state.grids.startCoords = this.state.grids.prevCoords = { x, y }
    },
    onDrag: (x, y) => {
      const { grids } = this.state
      const offset = Math.floor((grids.prevCoords.y - y) * height)
      grids[type].scrollTop = Math.min(Math.max(grids[type].scrollTop + offset, 0), Math.max(gridHeight - height, 0))
      grids.prevCoords = { x, y }
      this.needsRender = true
    },
    onDrop: (x, y, u, v) => {
      const { startCoords } = this.state.grids
      const distance = new THREE.Vector2(startCoords.x, startCoords.y).distanceTo(new THREE.Vector2(x, y))
      if (distance < 0.1) {
        let canvasIntersection = this.getCanvasIntersection(u, v, false)

        if (canvasIntersection && canvasIntersection.id !== 'grid-background') {
          const name = canvasIntersection.id
          const id = this.state.selections[0]
          
          if (type === 'pose') {
            const pose = this.state.poses.find(pose => pose.id === name)
            const skeleton = pose.state.skeleton
            this.dispatch(updateObject(id, { posePresetId: name, skeleton }))
          } else if (type === 'handPoses') {
            let currentSkeleton = sceneObject.handSkeleton
            if(!currentSkeleton) currentSkeleton = {}
            const pose = this.state.handPoses.find(pose => pose.id === name)
            let handSkeleton = pose.state.handSkeleton
            let skeletonBones = Object.keys(handSkeleton) 
            let currentSkeletonBones = Object.keys(currentSkeleton) 
            
            if(skeletonBones.length !== 0) {
              let presetHand = skeletonBones[0].includes("RightHand") ? "RightHand" : "LeftHand"
              let oppositeSkeleton = createdMirroredHand(handSkeleton, presetHand)

              if (selectedHand === "BothHands") {
                handSkeleton = Object.assign(oppositeSkeleton, handSkeleton)
              } 
              else if (selectedHand !== presetHand) {
                if(currentSkeletonBones.some(bone => bone.includes(presetHand))) {
                  handSkeleton = applyChangesToSkeleton(currentSkeleton, oppositeSkeleton)
                }
                else {
                    handSkeleton = oppositeSkeleton
                }
              }
              else {
                if(currentSkeletonBones.some(bone => bone.includes(getOppositeHandName(presetHand)))) {
                  handSkeleton = applyChangesToSkeleton(currentSkeleton, handSkeleton)
                }
              }
            }
            this.dispatch(updateObject(id, { handPosePresetId: name, handSkeleton }))
          } else if (type === 'character') {
            this.dispatch(undoGroupStart())
            this.dispatch(selectObject(null))
            this.dispatch(updateObject(id, { model: name, height: initialState.models[name].height }))
            this.dispatch(undoGroupEnd())
          } else if (type === 'object') {
            this.dispatch(updateObject(id, { model: name, depth: 1, height: 1, width: 1 }))
          }
        }
      }
    }
  }

  ctx.restore()
  if (gridHeight > height) {
  this.paneComponents['grid']['scrollbar'] = {
    id: 'scrollbar',
    type: 'button',
    x: width + 37 - 6,
    y,
    width: 24,
    height,
    onDrag: (x, y) => {
      const { grids } = this.state
      grids[type].scrollTop = Math.min(Math.max((gridHeight - height) * y, 0), Math.max(gridHeight - height, 0))
      this.needsRender = true
    }
  }

  // Indicator
  const scrollPosition = this.state.grids[type].scrollTop / (gridHeight - height)

  ctx.fillStyle = '#000'
  roundRect(ctx, width + 37, y, 12, height, 6, true, false)

  ctx.fillStyle = '#6E6E6E'
  roundRect(ctx, width + 37, y + scrollPosition * height * 0.75, 12, height * 0.25, 6, true, false)

  // ctx.strokeStyle = '#fff'
  // ctx.lineWidth = 1
  // roundRect(ctx, width + 37, y, 12, height, 6, false, true)
  }
} 

const drawRow = function drawRow(ctx, x, y, width, height, items, type, activeIndex) {
  ctx.save()
  ctx.fillStyle = '#000'
  ctx.fillRect(x, y, width, height)
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()

  const padding = 24
  const textHeight = 16

  const itemHeight = height - 2 * padding - textHeight
  const itemWidth = itemHeight * this.cameraAspectRatio
  const rowWidth = items.length * itemWidth + padding * 3
  const visibleItems = Math.min(Math.ceil(width / itemWidth) + 1, items.length)

  if (this.state.boards[type].scrollTop === null) {
    this.state.boards[type].scrollTop = Math.max(Math.min((activeIndex) * itemWidth + 0.01, Math.max(rowWidth - width, 0)), 0)
  }
  
  let startItem = Math.floor(this.state.boards[type].scrollTop / itemWidth)
  const offset = this.state.boards[type].scrollTop % itemWidth

  for (let i = 0; i < visibleItems; i++) {
    if (startItem >= items.length) break
    const item = items[startItem]

    const activeBoard = this.state.board && item.uid === this.state.board.uid
    const isActive = type === 'boards' ? activeBoard : item.id === this.state.activeCamera
    ctx.fillStyle = isActive ? '#7256ff' : '#6E6E6E'
    roundRect(
      ctx,
      x + (itemWidth + padding * 0.5) * i - offset,
      y + padding,
      itemWidth,
      itemHeight + textHeight,
      12,
      true,
      false
    )

    ctx.font = '12px Arial'
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'Middle'
    const text = type === 'boards' ? item.shot : item.name || item.displayName

    ctx.textAlign = 'start'
    ctx.fillText(text, x + 8 + (itemWidth + padding * 0.5) * i - offset, y + padding + itemHeight + textHeight * 0.5)

    if (type === 'boards') {
      const filepath = this.shotGenerator.uriForThumbnail(item.thumbnail)

      this.drawLoadableImage(
        filepath,

        image => {
          // loaded state
          // object should allow selection
          ctx.drawImage(
            image,
            x + 8 + (itemWidth + padding * 0.5) * i - offset,
            y + padding + 8,
            itemWidth - 16,
            itemHeight - 16
          )
        },

        () => {
          // loading state
          // object should not allow selection
          ctx.save()
          ctx.fillStyle = '#222'
          ctx.fillRect(x + 8 + (itemWidth + padding * 0.5) * i - offset, y + padding + 8, itemWidth - 16, itemHeight - 16)
          ctx.restore()
        }
      )
    } else {
      const fov = parseInt(getFovAsFocalLength(item.fov, this.cameraAspectRatio))
      ctx.textAlign = 'end'
      ctx.fillText(
        `${fov}mm`,
        x - 8 + itemWidth + (itemWidth + padding * 0.5) * i - offset,
        y + padding + itemHeight + textHeight * 0.5
      )

      const thumbnailName = `${this.state.board.uid}_${item.displayName}`
      const cameraThumbnail = this.state.cameraThumbnails[thumbnailName]
      
      if (cameraThumbnail) {
        ctx.drawImage(
          cameraThumbnail,
          x + 8 + (itemWidth + padding * 0.5) * i - offset,
          y + padding + 8,
          itemWidth - 16,
          itemHeight - 16
        )
      } else {
        ctx.save()
        ctx.fillStyle = '#222'
        ctx.fillRect(x + 8 + (itemWidth + padding * 0.5) * i - offset, y + padding + 8, itemWidth - 16, itemHeight - 16)
        ctx.restore()
      }
    }

    this.paneComponents['boards'][item.id || item.uid] = {
      id: item.id || item.uid,
      name: item.id || item.uid,
      type: 'button',
      row: type,
      x: x + (itemWidth + padding * 0.5) * i - offset,
      y: y + padding,
      width: itemWidth,
      height: itemHeight + textHeight,
      invisible: true
    }

    startItem++
  }

  this.paneComponents['boards'][`${type}-background`] = {
    id: `${type}-background`,
    type: 'button',
    x,
    y: y + padding,
    width,
    height: itemHeight + textHeight,
    onSelect: (xClick, yClick) => {
      this.state.boards.startCoords = this.state.boards.prevCoords = { x: xClick - 1 - (x * 2) / width, y: yClick }
    },
    onDrag: (x, y) => {
      const { boards } = this.state
      const offset = Math.floor((boards.prevCoords.x - x) * width)
      boards[type].scrollTop = Math.min(Math.max(boards[type].scrollTop + offset, 0), Math.max(rowWidth - width, 0))
      boards.prevCoords = { x, y }
      this.boardsNeedsRender = true
    },
    onDrop: (xClick, yClick, u, v) => {
      const { startCoords } = this.state.boards
      const distance = new THREE.Vector2(startCoords.x, startCoords.y).distanceTo(
        new THREE.Vector2(xClick - 1 - (x * 2) / width, yClick)
      )

      if (distance < 0.15) {
        let canvasIntersection = this.getCanvasIntersection(u, v, false)

        if (canvasIntersection && !canvasIntersection.id.includes('-background')) {
          const component = this.getComponentById(canvasIntersection.id)
          if (component.row === 'cameras') {
            this.dispatch(setActiveCamera(component.id))
          } else {
            this.send('CHANGE_BOARD', { uid: canvasIntersection.id })
          }
        }
      }
    }
  }

  ctx.restore()
  if (rowWidth > width) {
    this.paneComponents['boards'][`${type}-scrollbar`] = {
      id: `${type}-scrollbar`,
      type: 'button',
      x,
      y: y + padding + itemHeight + textHeight + 12,
      width,
      height: 12,
      onDrag: (x, y) => {
        const { boards } = this.state
        boards[type].scrollTop = Math.min(Math.max((rowWidth - width) * x, 0), Math.max(rowWidth - width, 0))
        this.boardsNeedsRender = true
      }
    }

    // Indicator
    const scrollPosition = this.state.boards[type].scrollTop / (rowWidth - width)

    ctx.fillStyle = '#000'
    roundRect(ctx, x, y + padding + itemHeight + textHeight + 12, width, 12, 6, true, false)

    ctx.fillStyle = '#6E6E6E'
    roundRect(
      ctx,
      x + scrollPosition * width * 0.75,
      y + padding + itemHeight + textHeight + 12,
      width * 0.25,
      12,
      6,
      true,
      false
    )

    // ctx.strokeStyle = '#fff'
    // ctx.lineWidth = 1
    // roundRect(ctx, x, y + padding + itemHeight + textHeight + 12, width, 12, 6, false, true)
  }
}

module.exports = {
  drawText,
  drawImageButton,
  drawButton,
  drawSlider,
  drawToggleButton,
  roundRect,
  wrapText,
  drawPaneBGs,
  drawGrid,
  drawRow
}
