import React, {useState, useRef, useCallback, useEffect, useMemo} from 'react'
import {connect} from 'react-redux'
import { useDrag } from 'react-use-gesture'
import {Math as _Math} from 'three'

import {
  undoGroupStart,
  undoGroupEnd
} from './../../../shared/reducers/shot-generator'

import useDoubleClick from './../../../hooks/use-double-click'
import KeyCommandSingleton from '../KeyHandler/KeyCommandsSingleton'
const roundValue = (value, precision) => {
  let multiplier = Math.pow(10, precision)
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier
}
export const transforms = {
  // default
  clamp: (value, min, max) => {
    return _Math.clamp(Math.round(value * 100) / 100, min, max)
  },
  degrees: (value, min, max) => {
    if (value > 180) { return value - 360 }
    if (value < -180) { return value + 360 }
    return _Math.clamp(value, min, max)
  },
  round: (value, min, max) => {
    value = Math.round(value)
    return _Math.clamp(value, min, max)
  }
}

export const formatters = {
  // default
  toFixed2: value => value.toFixed(2),

  identity: value => value,

  degrees: value => Math.round(value).toString() + '°',
  percent: value => Math.round(value).toString() + '%'
}

const getFormattedInputValue = (value, formatter) => {
  if (formatters.hasOwnProperty(formatter)) {
    return parseFloat(formatter(value))
  }
  
  return value
}

const isNumber = (value) => {
  if ((undefined === value) || (null === value)) {
    return false;
  }
  if (typeof value == 'number') {
      return true;
  }
  return !isNaN(value - 0);
}

const defaultOnSetValue = value => {}

const NumberSliderComponent = React.memo(({
  label,
  value = 0,
  min = -10,
  max = 10,
  step = 0.2, 
  formatter = formatters.toFixed2,
  onSetValue = defaultOnSetValue,
  transform = transforms.clamp,
  onDragStart,
  onDragEnd
}) => {
  const inputRef = useRef(null)
  const [isTextInput, setTextInput] = useState(false)
  const [sliderValue, setSliderValue] = useState(0)
  const [textInputValue, setTextInputValue] = useState(value)
  const prevValue = useRef(null)
  const isDragging = useRef(false)
  
  useMemo(() => {
    if(!isDragging.current) {
      setSliderValue(value)
    }
  }, [value]) 

  useEffect(() => {
    console.log("Update value", value)
    if(prevValue.current === value) {
      setSliderValue(value)
    }
  }, [sliderValue])

  const onDrag = useCallback(({direction, altKey}) => {
    const valueToAdd = step * (altKey ? 0.01 : 1.0)
    const nextValue = transform(sliderValue + Math.sign(direction) * (valueToAdd < 0.01 ? 0.01 : valueToAdd), min, max)
    prevValue.current = value
    onSetValue(nextValue)
    setSliderValue(nextValue)
  }, [sliderValue, onSetValue, value])
  
  const bind = useDrag(({event, first, last}) => {
    if (first) {
      onDragStart()
      isDragging.current = true
      inputRef.current.requestPointerLock()
    }
    
    onDrag({
      direction: event.movementX,
      altKey: event.altKey
    })

    if (last) {
      document.exitPointerLock()
      isDragging.current = false
      onDragEnd()
    }
  }, {dragDelay: true})

  const bindDoubleClick = useDoubleClick(() => {
    setTextInputValue(getFormattedInputValue(sliderValue, formatter))
    setTextInput(true)
  })

  const onTextInputBlur = useCallback(() => {
    setTextInput(false)
    setTextInputValue(getFormattedInputValue(sliderValue, formatter))
  }, [])

  const onTextInputKey = (event) => {
    if (event.key === 'Escape') {
      // reset
      setTextInput(false)
      setTextInputValue(getFormattedInputValue(sliderValue, formatter))
    } else if (event.key === 'Enter') {
      if(isNumber(textInputValue)) {
        let constrainedNumber = Math.min(Math.max(textInputValue, min), max)
        onSetValue(parseFloat(constrainedNumber))
      }
      else {
        setTextInputValue(getFormattedInputValue(sliderValue, formatter))
      }
      setTextInput(false)
    }
  }

  const onTextInputChange = useCallback((event) => {
    setTextInputValue(event.target.value)
  }, [])

  const onNudge = useCallback((direction, event) => {
    onDrag({
      direction,
      altKey: event.altKey
    })
  }, [sliderValue])

  useEffect(() => {
    KeyCommandSingleton.getInstance().isEnabledKeysEvents = !isTextInput
    if (isTextInput && inputRef.current) {
      
      inputRef.current.focus()
      setImmediate(() => {
        inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length)
      })
    }
  }, [isTextInput, inputRef.current])
  
  return (
      <div className="number-slider">
        {label ? <div className="number-slider__label">{label}</div> : null}
        <div
            className="number-slider__control"
        >
          <div
              className="number-slider__nudge number-slider__nudge--left"
              onClick={(event) => onNudge(-1, event)}
          >
            <div className="number-slider__arrow number-slider__arrow--left"/>
          </div>

          { isTextInput 
              ? <input
                  ref={inputRef}
                  type="text"
                  className="number-slider__input number-slider__input--text"
                  value={textInputValue}
                  onBlur={onTextInputBlur}
                  onKeyDown={onTextInputKey}
                  onChange={onTextInputChange}
              /> 
              : <input
                  ref={inputRef}
                  type="text"
                  className="number-slider__input number-slider__input--move"
                  value={formatter(sliderValue)}
                  readOnly={true}
                  {...bind()}
                  {...bindDoubleClick}
              />
          }
          
          <div
              className="number-slider__nudge number-slider__nudge--right"
              onClick={() => onNudge(1, event)}
          >
            <div className="number-slider__arrow number-slider__arrow--right"/>
          </div>
        </div>
      </div>
  )
})

const mapDispatchToProps = {
  onDragStart: undoGroupStart,
  onDragEnd: undoGroupEnd
}

export const NumberSlider = connect(null, mapDispatchToProps)(NumberSliderComponent)
