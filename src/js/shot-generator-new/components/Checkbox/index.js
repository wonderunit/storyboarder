import React from 'react'

const Checkbox = React.memo(({checked, label, onClick}) => {
  return (
      <div className='checkbox'>
        {label ? <div className='checkbox-label'>{label}</div> : null}
        <input type="checkbox" readOnly={true} checked={checked} onClick={onClick}/>
        <label><span/></label>
      </div>
  )
})

export default Checkbox
