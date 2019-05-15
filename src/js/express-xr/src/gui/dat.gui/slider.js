/**
 * dat-guiVR Javascript Controller Library for VR
 * https://github.com/dataarts/dat.guiVR
 *
 * Copyright 2016 Data Arts Team, Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import createInteraction from './interaction'
import * as Colors from './colors'

const roundedRect = (shape, x, y, width, height, radius) => {
  shape.moveTo(x, y + radius)
  shape.lineTo(x, y + height - radius)
  shape.quadraticCurveTo(x, y + height, x + radius, y + height)
  shape.lineTo(x + width - radius, y + height)
  shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius)
  shape.lineTo(x + width, y + radius)
  shape.quadraticCurveTo(x + width, y, x + width - radius, y)
  shape.lineTo(x + radius, y)
  shape.quadraticCurveTo(x, y, x, y + radius)
}

export function createSlider({
  textCreator,
  object,
  propertyName = 'undefined',
  id = 'undefined',
  prop = 'undefined',
  initialValue = 0.0,
  min = 0.0,
  max = 1.0,
  step = 0.1,
  width = 0.25,
  height = 0.1,
  depth = 0.0025,
  corner = 0.05
} = {}) {
  const SLIDER_WIDTH = width
  const SLIDER_HEIGHT = height
  const SLIDER_DEPTH = depth

  const state = {
    alpha: 1.0,
    value: initialValue,
    step: step,
    useStep: true,
    precision: 1,
    listen: false,
    min: min,
    max: max,
    onChangedCB: undefined,
    onFinishedChange: undefined,
    pressing: false
  }

  state.step = getImpliedStep(state.value)
  state.precision = numDecimals(state.step)
  state.alpha = getAlphaFromValue(state.value, state.min, state.max)

  const group = new THREE.Group()

  //  filled volume
  const roundedRectShape = new THREE.Shape()
  roundedRect(roundedRectShape, SLIDER_WIDTH * -0.5, SLIDER_HEIGHT * -0.5, SLIDER_WIDTH, SLIDER_HEIGHT, corner)
  const rect = new THREE.ShapeGeometry(roundedRectShape)

  // const rect = new THREE.BoxGeometry(width, SLIDER_HEIGHT, SLIDER_DEPTH)
  rect.translate(width * 0.5, 0, 0)

  const hitscanMaterial = new THREE.MeshBasicMaterial()
  hitscanMaterial.visible = false

  const hitscanVolume = new THREE.Mesh(rect.clone(), hitscanMaterial)
  hitscanVolume.position.z = depth
  hitscanVolume.position.x = width
  hitscanVolume.name = 'hitscanVolume'

  //  sliderBG volume
  const sliderBG = new THREE.Mesh(rect.clone(), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0x000000 }))
  Colors.colorizeGeometry(sliderBG.geometry, 0xffffff)
  sliderBG.position.z = depth * 0.5
  sliderBG.position.x = width

  const borderWidth = 1 + 0.1 * width
  const sliderBorder = new THREE.Mesh(rect.clone(), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0xffffff }))
  Colors.colorizeGeometry(sliderBorder.geometry, 0xffffff)
  sliderBorder.position.z = depth * 0.5 - 0.001
  sliderBorder.position.x = width - (width * borderWidth - width) * 0.5
  sliderBorder.geometry.scale(borderWidth, 1.1, 1)

  const material = new THREE.MeshBasicMaterial({ color: Colors.DEFAULT_COLOR })
  const filledVolume = new THREE.Mesh(rect.clone(), material)
  filledVolume.position.z = depth * 0.5
  hitscanVolume.add(filledVolume)

  const endLocator = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.05, 0.05, 1, 1, 1),
    new THREE.MeshBasicMaterial({ color: Colors.DEFAULT_COLOR })
  )
  endLocator.position.x = width
  hitscanVolume.add(endLocator)
  endLocator.visible = false

  const valueLabel = textCreator.create(state.value.toString())
  valueLabel.position.x = 0.02 + width
  valueLabel.position.z = depth * 2.5
  valueLabel.position.y = -0.0325

  const descriptorLabel = textCreator.create(propertyName)
  descriptorLabel.position.x = 0.15
  descriptorLabel.position.z = depth
  descriptorLabel.position.y = -0.03

  group.add(descriptorLabel, hitscanVolume, sliderBG, sliderBorder, valueLabel)
  group.position.x = -0.15 * 0.35

  updateValueLabel(state.value)
  updateSlider()

  function updateValueLabel(value) {
    if (state.useStep) {
      valueLabel.updateLabel(roundToDecimal(state.value, state.precision).toString())
    } else {
      valueLabel.updateLabel(state.value.toString())
    }
  }

  function updateView() {
    if (state.pressing) {
      material.color.setHex(0x6e6e6e)
    } else if (interaction.hovering()) {
      material.color.setHex(0x6e6e6e)
    } else {
      material.color.setHex(0x6e6e6e)
    }
  }

  function updateSlider() {
    filledVolume.scale.x = Math.min(Math.max(getAlphaFromValue(state.value, state.min, state.max), 0.000001), 1)
  }

  function updateObject(value) {
    object[propertyName] = value
  }

  function updateStateFromAlpha(alpha) {
    state.alpha = getClampedAlpha(alpha)
    state.value = getValueFromAlpha(state.alpha, state.min, state.max)
    if (state.useStep) {
      state.value = getSteppedValue(state.value, state.step)
    }
    state.value = getClampedValue(state.value, state.min, state.max)
  }

  function listenUpdate() {
    state.value = getValueFromObject()
    state.alpha = getAlphaFromValue(state.value, state.min, state.max)
    state.alpha = getClampedAlpha(state.alpha)
  }

  function getValueFromObject() {
    return parseFloat(object[propertyName])
  }

  group.onChange = function(callback) {
    state.onChangedCB = callback
    return group
  }

  group.step = function(step) {
    state.step = step
    state.precision = numDecimals(state.step)
    state.useStep = true

    state.alpha = getAlphaFromValue(state.value, state.min, state.max)

    updateStateFromAlpha(state.alpha)
    updateValueLabel(state.value)
    updateSlider()
    return group
  }

  group.listen = function() {
    state.listen = true
    return group
  }

  const interaction = createInteraction(hitscanVolume)
  interaction.events.on('onPressed', handlePress)
  interaction.events.on('pressing', handleHold)
  interaction.events.on('onReleased', handleRelease)

  function handlePress(p) {
    if (group.visible === false) {
      return
    }
    state.pressing = true
    p.locked = true
  }


  function handleHold({ point } = {}) {
    if (group.visible === false) {
      return
    }

    state.pressing = true

    filledVolume.updateMatrixWorld()
    endLocator.updateMatrixWorld()

    const a = new THREE.Vector3().setFromMatrixPosition(filledVolume.matrixWorld)
    const b = new THREE.Vector3().setFromMatrixPosition(endLocator.matrixWorld)

    const previousValue = state.value

    updateStateFromAlpha(getPointAlpha(point, { a, b }))
    updateValueLabel(state.value)
    updateSlider()
    updateObject(state.value)

    if (previousValue !== state.value && state.onChangedCB) {
      state.onChangedCB(id, prop, state.value)
    }
  }

  function handleRelease() {
    state.pressing = false
  }

  group.interaction = interaction
  group.hitscan = [hitscanVolume]

  group.updateControl = function(inputObjects) {
    interaction.update(inputObjects)

    if (state.listen) {
      listenUpdate()
      updateValueLabel(state.value)
      updateSlider()
    }
    updateView()
  }

  group.name = function(str) {
    descriptorLabel.updateLabel(str)
    return group
  }

  group.min = function(m) {
    state.min = m
    state.alpha = getAlphaFromValue(state.value, state.min, state.max)
    updateStateFromAlpha(state.alpha)
    updateValueLabel(state.value)
    updateSlider()
    return group
  }

  group.max = function(m) {
    state.max = m
    state.alpha = getAlphaFromValue(state.value, state.min, state.max)
    updateStateFromAlpha(state.alpha)
    updateValueLabel(state.value)
    updateSlider()
    return group
  }

  group.traverse(child => {
    child.userData.type = 'slider'
  })

  return group
}

const ta = new THREE.Vector3()
const tb = new THREE.Vector3()
const tToA = new THREE.Vector3()
const aToB = new THREE.Vector3()

function getPointAlpha(point, segment) {
  ta.copy(segment.b).sub(segment.a)
  tb.copy(point).sub(segment.a)

  const projected = tb.projectOnVector(ta)

  tToA.copy(point).sub(segment.a)

  aToB
    .copy(segment.b)
    .sub(segment.a)
    .normalize()

  const side = tToA.normalize().dot(aToB) >= 0 ? 1 : -1

  const length = segment.a.distanceTo(segment.b) * side

  let alpha = projected.length() / length
  if (alpha > 1.0) {
    alpha = 1.0
  }
  if (alpha < 0.0) {
    alpha = 0.0
  }
  return alpha
}

function lerp(min, max, value) {
  return (1 - value) * min + value * max
}

function map_range(value, low1, high1, low2, high2) {
  return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1)
}

function getClampedAlpha(alpha) {
  if (alpha > 1) {
    return 1
  }
  if (alpha < 0) {
    return 0
  }
  return alpha
}

function getClampedValue(value, min, max) {
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}

function getImpliedStep(value) {
  if (value === 0) {
    return 1 // What are we, psychics?
  } else {
    // Hey Doug, check this out.
    return Math.pow(10, Math.floor(Math.log(Math.abs(value)) / Math.LN10)) / 10
  }
}

function getValueFromAlpha(alpha, min, max) {
  return map_range(alpha, 0.0, 1.0, min, max)
}

function getAlphaFromValue(value, min, max) {
  return map_range(value, min, max, 0.0, 1.0)
}

function getSteppedValue(value, step) {
  if (value % step != 0) {
    return Math.round(value / step) * step
  }
  return value
}

function numDecimals(x) {
  x = x.toString()
  if (x.indexOf('.') > -1) {
    return x.length - x.indexOf('.') - 1
  } else {
    return 0
  }
}

function roundToDecimal(value, decimals) {
  const tenTo = Math.pow(10, decimals)
  return Math.round(value * tenTo) / tenTo
}
