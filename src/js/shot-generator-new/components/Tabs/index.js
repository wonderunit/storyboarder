import React, { createContext, useState, useContext, useMemo, useCallback} from 'react'
import useConstant from 'use-constant'

const TabsState = createContext()
const Elements = createContext()

const Tabs = ({
  state: outerState,
  children
}) => {
  const innerState = useState({current: 0, prev: 0})
  const elements = useConstant(() => ({
    tabs: 0,
    panels: 0
  }))
  const state = outerState || innerState
  
  return (
    <Elements.Provider value={elements}>
      <TabsState.Provider value={state}>
        {children}
      </TabsState.Provider>
    </Elements.Provider>
  )
}

const useTabState = () => {
  const [{current: activeIndex, prev: previousIndex}, setState] = useContext(TabsState)
  const elements = useContext(Elements)
  const tabIndex = useConstant(() => {
    const currentIndex = elements.tabs
    elements.tabs += 1
    return currentIndex
  })
  
  const onClick = useCallback( () => setState({current: tabIndex, prev: activeIndex}), [activeIndex])
  
  return useMemo(() => ({
    isActive: activeIndex === tabIndex,
    onClick,
    tabIndex,
    activeIndex,
    previousIndex
  }), [activeIndex, onClick, tabIndex, previousIndex])
}

const usePanelState = () => {
  const [{current: activeIndex, prev: previousIndex}] = useContext(TabsState)
  const elements = useContext(Elements)
  const panelIndex = useConstant(() => {
    const currentIndex = elements.panels
    elements.panels += 1
    
    return currentIndex
  })
  
  return {
    isActive: panelIndex === activeIndex,
    panelIndex,
    activeIndex,
    previousIndex
  }
}

export {Tabs, usePanelState, useTabState}
