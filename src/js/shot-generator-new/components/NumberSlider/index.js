import React, {useState, useRef, useCallback} from 'react'
import {connect} from 'react-redux'
import { useDrag } from 'react-use-gesture'
import {Math as _Math} from 'three'

import {
  undoGroupStart,
  undoGroupEnd
} from './../../../shared/reducers/shot-generator'

import useDoubleClick from './../../../hooks/use-double-click'

export const transforms = {
  // default
  clamp: (value, min, max) => {
    return _Math.clamp(value, min, max)
  },
  degrees: (value) => {
    if (value > 180) { return value - 360 }
    if (value < -180) { return value + 360 }
    return value
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

const defaultOnSetValue = value => {}

const NumberSliderComponent = React.memo(({
  label,
  value = 0,
  min = -10,
  max = 10,
  step = 0.1, 
  formatter = formatters.toFixed2,
  onSetValue = defaultOnSetValue,
  transform = transforms.clamp,
  onDragStart,
  onDragEnd
}) => {
  const inputRef = useRef(null)
  const [isTextInput, setTextInput] = useState(false)
  const [textInputValue, setTextInputValue] = useState(value)
  
  const bind = useDrag(({event, first, last}) => {
    if (first) {
      onDragStart()
      if (event.shiftKey) {
        onSetValue(0)
      }
      
      inputRef.current.requestPointerLock()
    }
    
    const nextValue = transform(value + Math.sign(event.movementX) * step * (event.altKey ? 0.01 : 1.0), min, max)
    
    if (nextValue !== value) {
      onSetValue(nextValue)
    }

    if (last) {
      document.exitPointerLock()
      onDragEnd()
    }
  }, {dragDelay: true})

  const bindDoubleClick = useDoubleClick(() => {
    setTextInput(true)
  })

  const onTextInputBlur = useCallback(() => {
    setTextInput(false)
  }, [])

  const onTextInputKey = useCallback((event) => {
    if (event.key === 'Escape') {
      // reset
      onSetValue(+textInputValue)
      setTextInput(false)
    } else if (event.key === 'Enter') {
      // TODO validation, tranform, error handling
      onSetValue(+event.target.value)
      setTextInput(false)
    }
  }, [])

  const onTextInputChange = useCallback((event) => {
    setTextInputValue(event.target.value)
  }, [])

  const preventSelect = useCallback((event) => {
    event.preventDefault()
  }, [])
  
  return (
      <div className='number-slider'>
        {label ? <div className='number-slider__label'>{label}</div> : null}
        <div
            className='number-slider__control'
        >
          <div className='number-slider__nudge number-slider__nudge--left'>
            <div className='number-slider__arrow number-slider__arrow--left'/>
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
                  value={formatter(value)}
                  readOnly={true}
                  onSelect={preventSelect}
                  {...bind()}
                  {...bindDoubleClick}
              />
          }
          
          <div className="number-slider__nudge number-slider__nudge--right">
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
