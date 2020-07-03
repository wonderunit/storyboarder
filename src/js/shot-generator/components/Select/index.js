import React, {useEffect, useRef} from 'react'
import ReactSelect from 'react-select'

const defaultOnSetValue = value => {}
const style = {
  control: base => ({
    ...base,
    border: 0,
    // This line disable the blue border
    boxShadow: "none"
  })
}
const Select = React.memo(({
    value = null,
    label = null,
    options = [],
    disabled = false,
    onSetValue = defaultOnSetValue,
    className = null
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
    styles={ style }
    //menuIsOpen: true,// useful to debug
    isSearchable={ false }
    menuPlacement="auto"
    menuPosition="fixed"
    className={"select " + className}
    classNamePrefix="select"/>
})

export default Select
