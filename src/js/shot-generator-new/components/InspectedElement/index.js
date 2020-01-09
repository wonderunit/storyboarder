import React from 'react'
import {connect} from 'react-redux'

import {
  getSelections,
  getSceneObjects,

  selectObject,
  deleteObjects,
  updateObject
} from './../../../shared/reducers/shot-generator'

import deepEqualSelector from './../../../utils/deepEqualSelector'

import {Tabs, Tab, Panel} from '../Tabs'

import GeneralInspector from './GeneralInspector'

import Icon from '../Icon'

const Inspector = React.memo(({element = 10, selectedName}) => {
  
  return (
    <React.Fragment>
      <a href='#' className='object-property-heading'>
        {selectedName} Properties
      </a>
      <Tabs>
        <div className='tabs-header'>
          <Tab><Icon src='icon-item-camera'/></Tab>
          <Tab><Icon src='icon-item-camera'/></Tab>
          <Tab><Icon src='icon-item-camera'/></Tab>
          <Tab><Icon src='icon-item-camera'/></Tab>
          <Tab><Icon src='icon-item-camera'/></Tab>
        </div>

        <div className='tabs-body'>
          <Panel>
            <GeneralInspector/>
          </Panel>
          <Panel>{element}</Panel>
          <Panel>{element}</Panel>
          <Panel>{element}</Panel>
          <Panel>{element}</Panel>
        </div>
      </Tabs>
    </React.Fragment>
  )
})

const setSelectedName = deepEqualSelector([getSelections, getSceneObjects], (selections, sceneObjects) => {
  return sceneObjects[selections[0]] ? sceneObjects[selections[0]].displayName : null
})

const mapStateToProps = (state) => ({
  selectedName: setSelectedName(state)
})

const mapDispatchToProps = {
  selectObject, deleteObjects, updateObject
}

export default connect(mapStateToProps)(Inspector)
