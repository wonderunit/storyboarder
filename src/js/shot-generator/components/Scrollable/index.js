import React from 'react'

const Scrollable = React.memo(({children}) => {
  return (
    <div className="scrollable">
      {children}
    </div>
  )
})

export default Scrollable