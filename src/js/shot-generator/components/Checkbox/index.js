import React from 'react'

const Checkbox = React.memo(({checked, label, onClick, style}) => {
  return (
      <div className="checkbox" onClick={onClick} style={style}>
        {label ? <div className="checkbox-label">{label}</div> : null}
        <input type="checkbox" readOnly={true} checked={checked}/>
        <label><span/></label>
      </div>
  )
})

export default Checkbox
