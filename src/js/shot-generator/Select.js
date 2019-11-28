const {useEffect, useRef} = React = require('react')
const ReactSelect = require('react-select')
const h = require('./../utils/h')

const defaultOnSetValue = value => {}

const Select = React.memo(({
    value = null,
    label = null,
    options = [],
    disabled = false,
    onSetValue = defaultOnSetValue
  } = {}) => {
  const callbackRef = useRef(null)
  
  useEffect(() => {
    callbackRef.current = onSetValue
  }, [onSetValue])
  
  return h([ReactSelect.default, {
    options,
    placeholder: label,
    onChange: callbackRef.current,
    isDisabled: disabled,
    //menuIsOpen: true,// useful to debug
    isSearchable: false,
    menuPlacement: 'auto',
    menuPosition: 'fixed',
    className: 'select',
    classNamePrefix: 'select'
  }])
})

module.exports = Select
