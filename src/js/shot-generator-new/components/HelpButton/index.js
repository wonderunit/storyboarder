import React, {useCallback} from 'react'

import {shell} from 'electron'

const HelpButton = React.memo(({
    style = {},
    url,
    title
}) => {
  const onPointerUp = useCallback((event) => {
    event.preventDefault()
    shell.openExternal(url)
  }, [url])
  
  return (
      <a
        href="#"
        className="help-button"
        style={style}
        onPointerUp={onPointerUp}
        title={`${title}\n\n${url}`}
      >
        <span>?</span>
      </a>
  )
})

export default HelpButton
