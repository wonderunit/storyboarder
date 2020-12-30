import React, {useMemo, useEffect, useRef, useCallback, useState} from 'react'
import throttle from 'lodash.throttle'

const getIndices = (container, itemHeight, numCols) => {
  if (!container) {
    return 0
  }

  //const first = Math.floor(container.scrollTop / itemHeight) * numCols
  return Math.round((container.scrollTop + container.parentNode.clientHeight) / itemHeight) * numCols
}

const getPlaceholder = (elementStyle, i, k, isLoading = false) => (
  <div
    key={`grid-element-placeholder-${i + k}`}
    style={elementStyle}
    className={isLoading ? "center-child" : ""}
  >
    {/*{isLoading && <div className="spinner"/>}*/}
  </div>
)

const getComponent = (Component, itemData, elements, elementStyle, i, k, id) => (
  <Component
    key={`grid-element-${id}`}
    style={elementStyle}
    {...itemData}
    data={elements[i + k]}
  />
)

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

  const containerRef = useRef(null)
  const [currentIndex, setCurrentIndex] = useState(getIndices())

  const onParentScroll = useCallback(throttle((e) => {
    const index = getIndices(e.target, itemHeight, numCols)
    if (index > currentIndex) {
      setCurrentIndex(index)
    }
  }, 500), [currentIndex])

  useEffect(() => {
    containerRef.current.parentNode.addEventListener('scroll', onParentScroll)
    const index = getIndices(containerRef.current, itemHeight, numCols)
    if (index > currentIndex) {
      setCurrentIndex(index)
    }

    return () => {
      if (containerRef.current) containerRef.current.parentNode.removeEventListener('scroll', onParentScroll)
    }
  }, [containerRef.current, currentIndex])

  const components = useMemo(() => {
    const result = []

    for (let i = 0; i < elements.length; i += numCols) {
      const row = []

      for (let k = 0; k < numCols; k++) {
        const index = i + k
        if (elements[index]) {
          if (index < currentIndex) {
            const id = elements[index].id ? elements[index].id : index
            row.push(getComponent(Component, itemData, elements, elementStyle, i, k, id))
          } else {
            row.push(getPlaceholder(elementStyle, i, k, true))
          }

        } else {
          row.push(getPlaceholder(elementStyle, i, k))
        }
      }

      result.push(
        <div className="row" key={`row-${i}`}>{row}</div>
      )
    }

    return result
  }, [elements.length, itemData, currentIndex])

  return (
    <div ref={containerRef}>
      {components}
    </div>
  )
})
export default Grid
