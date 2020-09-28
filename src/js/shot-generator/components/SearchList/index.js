import React, { useCallback, useRef, useEffect } from 'react'
import LiquidMetal from 'liquidmetal'

const SearchList = React.memo(
  ({ list, onSearch, label = 'Search models …' }) => {
    const inputRef = useRef()

    const getFilteredList = (terms) => {
      const matchAll = terms == null || terms.length === 0
      return list.filter((model) => {
        if (matchAll) return true
        let values = model.value.split('|')
        for (let i = 0; i < values.length; i++) {
          if (LiquidMetal.score(values[i], terms) > 0.8) return true
        }
        return false
      })
    }

    const onSearchChange = useCallback(
      (event) => {
        event.stopPropagation()
        onSearch(getFilteredList(event.currentTarget.value))
      },
      [list]
    )

    // recalculate the filtered result whenever the list changes
    useEffect(() => onSearch(getFilteredList(inputRef.current.value)), [list])

    const keyDown = useCallback((event) => event.stopPropagation(), [])

    return (
      <div className="column" style={{ flex: 1 }}>
        <input
          ref={inputRef}
          placeholder={label}
          onChange={onSearchChange}
          onKeyDown={keyDown}
        ></input>
      </div>
    )
  }
)

export default SearchList
