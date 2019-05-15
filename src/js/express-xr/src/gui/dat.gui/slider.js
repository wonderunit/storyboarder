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

export function createSlider({
  textCreator,
  object,
  propertyName = 'undefined',
  initialValue = 0.0,
  min = 0.0,
  max = 1.0,
  step = 0.1,
  width = 1.0,
  height = 0.08,
  depth = 0.01
} = {}) {
  const SLIDER_WIDTH = width * 0.5 - 0.015
  const SLIDER_HEIGHT = height - 0.015
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
  const rect = new THREE.BoxGeometry(SLIDER_WIDTH, SLIDER_HEIGHT, SLIDER_DEPTH)
  rect.translate(SLIDER_WIDTH * 0.5, 0, 0)

  const hitscanMaterial = new THREE.MeshBasicMaterial()
  hitscanMaterial.visible = false

  const hitscanVolume = new THREE.Mesh(rect.clone(), hitscanMaterial)
  hitscanVolume.position.z = depth
  hitscanVolume.position.x = width * 0.5
  hitscanVolume.name = 'hitscanVolume'

  //  sliderBG volume
  const sliderBG = new THREE.Mesh(rect.clone(), new THREE.MeshBasicMaterial({ color: Colors.DEFAULT_COLOR }))
  Colors.colorizeGeometry(sliderBG.geometry, Colors.SLIDER_BG)
  sliderBG.position.z = depth * 0.5
  sliderBG.position.x = SLIDER_WIDTH + 0.015

  const material = new THREE.MeshBasicMaterial({ color: Colors.DEFAULT_COLOR })
  const filledVolume = new THREE.Mesh(rect.clone(), material)
  filledVolume.position.z = depth * 0.5
  hitscanVolume.add(filledVolume)

  const endLocator = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.05, 0.05, 1, 1, 1),
    new THREE.MeshBasicMaterial({ color: Colors.DEFAULT_COLOR })
  )
  endLocator.position.x = SLIDER_WIDTH
  hitscanVolume.add(endLocator)
  endLocator.visible = false

  const valueLabel = textCreator.create(state.value.toString())
  valueLabel.position.x = 0.02 + width * 0.5
  valueLabel.position.z = depth * 2.5
  valueLabel.position.y = -0.0325

  const descriptorLabel = textCreator.create(propertyName)
  descriptorLabel.position.x = 0.06
  descriptorLabel.position.z = depth
  descriptorLabel.position.y = -0.03

  group.add(descriptorLabel, hitscanVolume, sliderBG, valueLabel)

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
      material.color.setHex(0xff0000)
    } else if (interaction.hovering()) {
      material.color.setHex(0x00ff00)
    } else {
      material.color.setHex(0x0000ff)
    }
  }

  function updateSlider() {
    filledVolume.scale.x = Math.min(Math.max(getAlphaFromValue(state.value, state.min, state.max) * width, 0.000001), width)
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
    console.log('moi')

    if (group.visible === false) {
      return
    }
    state.pressing = true
    p.locked = true
  }


  function handleHold({ point } = {}) {
    console.log('hei')

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
      state.onChangedCB(state.value)
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
