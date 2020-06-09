import React, { useState, useMemo, useEffect } from 'react'
let mousePos = {x:0, y:0}
let overId = 0
const checkIfMouseOver = (id) => {
    var element = document.getElementById(`${id}`);
    if(!element) return
    let coordPos = element.getBoundingClientRect();
    if(mousePos.x > coordPos.left && mousePos.x < coordPos.right 
        && mousePos.y > coordPos.top && mousePos.y < coordPos.bottom) {
            return true
    }
    return false 
}

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
    useEffect(() => {
        if(isRemovable && overId !== data.id && checkIfMouseOver(data.id)) {
            overId = data.id
            setShow(true)
        }
    })

    const onMouseOver = (event) => {
        mousePos.x = event.clientX
        mousePos.y = event.clientY

        overId = data.id
        setCount(count + 1)
        if(!isRemovable) { 
            setShow(false)
            return 
        }
        setShow(true)
    }

    const onMouseOut = (event) => {
        console.log("Hiding removal", data.id)
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
