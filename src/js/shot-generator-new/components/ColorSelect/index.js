import React, {useCallback} from 'react'

const defaultOnSetValue = value => {}

const ColorSelect = React.memo(({
  label,
  value = '#000000',
  onSetValue = defaultOnSetValue
}) => {
  const onChange = useCallback((event) => {
    onSetValue(event.target.value)
  }, [onSetValue])

  return (
    <div className="color-select">
      {label ? <div className="color-select__label">{label}</div> : null}
      <div
        className="color-select__control"
      >
        <input
          className="color-select__input"
          type="color"
          value={value}
          onChange={onChange}
        />
      </div>
    </div>
  )
})

export default ColorSelect