import React, { useState } from 'react'

const RemovableItem = React.memo(({ 
    className, 
    style,
    onPointerUp, 
    title, 
    children,
    onRemoval,
    isRemovable = true,
    data,
}) => {
    const [show, setShow] = useState(false)

    const onMouseOver = (event) => {
        if(!isRemovable) return
        setShow(true)
    }

    const onMouseOut = (event) => {
        if(!isRemovable) return
        setShow(false)
    }

    const onRemovePreset = (event) => {
        event.stopPropagation()
        onRemoval(data)
    }
    return <div className={ className }
        style={{ ...style, position:"relative" }}
        onPointerUp={ onPointerUp }
        onMouseEnter={ onMouseOver }
        onMouseLeave={ onMouseOut }
        title={ title}>
            { show && <a style={{ position:"absolute", left:"83%"}} onPointerUp={ onRemovePreset }>X</a>}
            { children }
        </div>
})

export default RemovableItem
