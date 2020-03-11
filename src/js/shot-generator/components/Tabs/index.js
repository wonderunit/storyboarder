import React, { createContext, useState, useContext, useMemo, useCallback} from 'react'
import useConstant from 'use-constant'

const TabsState = createContext()
const Elements = createContext()

const Tabs = ({
  children,
}) => {
  const innerState = useState({current: 0, prev: 0})
  const elements = useConstant(() => ({
    tabs: 0,
    panels: 0
  }))
  
  return (
    <Elements.Provider value={elements}>
      <TabsState.Provider value={innerState}>
        <div className='tabs'>
          {children}
        </div>
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

const Tab = ({ children }) => {
  const {onClick, isActive} = useTabState()

  return (
      <div
          onClick={onClick}
          className={`tabs-tab ${isActive && 'active'}`}
      >
        {children}
      </div>
  )
}

const Panel = ({children}) => {
  const {isActive} = usePanelState()

  if (!isActive) {
    return null
  }

  return (
      <div className="tabs-body__content">
        {children}
      </div>
  )
}

export {Tabs, usePanelState, useTabState, Tab, Panel}
