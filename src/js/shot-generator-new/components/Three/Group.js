import THREE from 'three'

import React, { useRef, useEffect } from 'react'

const Group = React.memo(({ scene, id, type, ...props }) => {
  const ref = useRef()
  
  return <group
  ref={ ref }
  userData={{ 
    id: id,
    type: type,
    children: props.children
  }}
  />

})
 
export default Group
