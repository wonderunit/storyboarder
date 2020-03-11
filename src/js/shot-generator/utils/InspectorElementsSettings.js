import React, { forwardRef } from 'react'

const NUM_COLS = 4
const GUTTER_SIZE = 5
const ITEM_WIDTH = 68
const ITEM_HEIGHT = 132

const IMAGE_WIDTH = ITEM_WIDTH
const IMAGE_HEIGHT = 100
const CHARACTER_MODEL = { id: 'adult-male', type: 'character' }

const innerElementType = forwardRef(({ style, ...rest }, ref) => {
    style.width = 288
    let newStyle = {
      width:288,
      position:"relative",
      overflow:"hidden",
      ...style
    }
    return <div
        ref={ref}
        style={newStyle}
        {...rest}/>
  })

export { NUM_COLS, GUTTER_SIZE, ITEM_WIDTH, ITEM_HEIGHT, IMAGE_HEIGHT, IMAGE_WIDTH, CHARACTER_MODEL, innerElementType }