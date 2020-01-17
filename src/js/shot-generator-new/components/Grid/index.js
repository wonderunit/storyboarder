import React, {useMemo} from 'react'

const Grid = React.memo(({
   Component,
   elements,
  
   itemData,
  
   numCols,
   itemHeight,
   itemWidth = '100%'
}) => {
  const elementStyle = {
    height: itemHeight,
    width: itemWidth
  }

  return useMemo(() => {
    const result = []

    for (let i = 0; i < elements.length; i += numCols) {
      const row = []

      for (let k = 0; k < numCols; k++) {
        if (elements[i + k]) {
          row.push(
            <Component
              key={`grid-element-${i + k}`}
              style={elementStyle}
              {...itemData}
              data={elements[i + k]}
            />
          )
        } else {
          row.push(
            <div
              key={`grid-element-${i + k}`}
              style={elementStyle}
            />
          )
        }
      }

      result.push(
        <div className='row' key={`row-${i}`}>{row}</div>
      )
    }

    return result
  }, [elements.length, itemData])
})
export default Grid