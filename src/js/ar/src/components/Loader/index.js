import React, {useState, useEffect} from 'react'
import classnames from 'classnames'

import './index.scss'

const CLOSE_TIMEOUT = 600

const Loader = ({progress = 0.0}) => {
  const [visible, setVisibility] = useState(true)
  const shouldClose = progress >= 1.0

  useEffect(() => {
    if (shouldClose) {
      const closeTimeoutId = setTimeout(() => {
        setVisibility(false)
      }, CLOSE_TIMEOUT)
      
      return () => clearTimeout(closeTimeoutId)
    }
  }, [shouldClose])
  
  const mountClassName = classnames({
    'loader mount': true,
    'hidden': !visible,
    'closing': shouldClose
  })
  
  return (
    <div className={mountClassName}>
      <div className="loader container">
        <div
          className="loader progress"
          style={{width: `${progress * 100}%`}}
        />
      </div>
      <div className="loader info">
        {(progress * 100).toFixed(0)}%
      </div>
    </div>
  )
}

export default Loader
