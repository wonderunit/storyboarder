import React, { useState, useMemo, useEffect } from 'react'
const RemovableItem = React.memo(({ 
    className, 
    style,
    onPointerUp, 
    title, 
    children,
    onRemoval,
    isRemovable = true,
    data
}) => {
    const [show, setShow] = useState(false)
    const [count, setCount] = useState(0)

    const onMouseOver = (event) => {
        setCount(count + 1)
        if(!isRemovable) { 
            setShow(false)
            return 
        }
        setShow(true)
    }

    const onMouseOut = (event) => {
        setShow(false)
    }

    useMemo(() => {
        if(show && !isRemovable) {
            setShow(false)
        }
    }, [show])

    const onRemovePreset = (event) => {
        event.stopPropagation()
        onRemoval(data)
    }
    return <div className={ className }
        id={data.id}
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
