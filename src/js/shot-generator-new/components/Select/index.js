import React, {useEffect, useRef} from 'react'
import ReactSelect from 'react-select'

const defaultOnSetValue = value => {}

const Select = React.memo(({
    value = null,
    label = null,
    options = [],
    disabled = false,
    onSetValue = defaultOnSetValue
  } = {}) => {
  const callbackRef = useRef(onSetValue)
  
  useEffect(() => {
    callbackRef.current = onSetValue
  }, [onSetValue])
  
  return <ReactSelect
    options={ options }
    value={ value }
    placeholder={ label }
    onChange={ callbackRef.current } 
    isDisabled={ disabled }
    //menuIsOpen: true,// useful to debug
    isSearchable={ false }
    menuPlacement='auto'
    menuPosition='fixed'
    className='select'
    classNamePrefix='select'/>
})

export default Select
