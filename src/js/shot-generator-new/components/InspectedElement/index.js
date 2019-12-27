import React from 'react'
import { Tabs, useTabState, usePanelState } from '../Tabs'
import Icon from '../Icon'

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
};

const Panel = ({children}) => {
  const {isActive} = usePanelState()
  
  if (!isActive) {
    return null
  }
  
  return (
      <div className='tabs-body__content'>
        {children}
      </div>
  )
};

const Inspector = React.memo(({element}) => (
    <Tabs>
      <div className='tabs-header'>
        <Tab><Icon src='icon-item-camera'/></Tab>
        <Tab><Icon src='icon-item-camera'/></Tab>
        <Tab><Icon src='icon-item-camera'/></Tab>
        <Tab><Icon src='icon-item-camera'/></Tab>
        <Tab><Icon src='icon-item-camera'/></Tab>
      </div>

      <div className='tabs-body'>
        <Panel>{element}</Panel>
        <Panel>{element}</Panel>
        <Panel>{element}</Panel>
        <Panel>{element}</Panel>
        <Panel>{element}</Panel>
      </div>
    </Tabs>
))

export default Inspector
