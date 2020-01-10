const {useEffect, useRef} = React = require('react')
const ReactSelect = require('react-select')
const h = require('./../utils/h')

const defaultOnSetValue = value => {}

const Select = React.memo(({
    value = null,
    label = null,
    options = [],
    disabled = false,
    onSetValue = defaultOnSetValue,
    className
  } = {}) => {
  const callbackRef = useRef(onSetValue)
  
  useEffect(() => {
    callbackRef.current = onSetValue
  }, [onSetValue])
  
  return h([ReactSelect.default, {
    options,
    value,
    placeholder: label,
    onChange: callbackRef.current,
    isDisabled: disabled,
    //menuIsOpen: true,// useful to debug
    isSearchable: false,
    menuPlacement: 'auto',
    menuPosition: 'fixed',
    className: `select ${className}`,
    classNamePrefix: 'select'
  }])
})

module.exports = Select
