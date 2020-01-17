import React, {useMemo} from 'react'
import {connect} from 'react-redux'

import {
  getSelections,
  getSceneObjects
} from './../../../shared/reducers/shot-generator'

import deepEqualSelector from './../../../utils/deepEqualSelector'

import {Tabs, Tab, Panel} from '../Tabs'

import GeneralInspector from './GeneralInspector/index'
import HandInspector from './HandInspector/HandPresetsEditor/index'
import PosePresetsInspector from './PosePresetsInspector/index'
import ModelInspector from './ModelInspector/index'
import AttachableInspector from './AttachableInspector/index'

import Icon from '../Icon'

const isChar = (type) => type === 'character'
const isObj = (type) => type === 'object'
const nullTab = {tab: null, panel: null}

const Inspector = React.memo(({id, selectedName, selectedType, scene}) => {

  const handPoseTab = useMemo(() => {
    if (!isChar(selectedType)) return nullTab

    return {
      tab: <Tab><Icon src='icon-item-camera'/></Tab>,
      panel: <Panel><HandInspector scene={scene}/></Panel>
    }
  }, [selectedType])

  const charPoseTab = useMemo(() => {
    if (!isChar(selectedType)) return nullTab

    return {
      tab: <Tab><Icon src='icon-item-camera'/></Tab>,
      panel: <Panel><PosePresetsInspector/></Panel>
    }
  }, [selectedType])

  const modelTab = useMemo(() => {
    if (!isChar(selectedType) && !isObj(selectedType)) return nullTab

    return {
      tab: <Tab><Icon src='icon-item-camera'/></Tab>,
      panel: <Panel><ModelInspector/></Panel>
    }
  }, [selectedType])

  const attachmentTab = useMemo(() => {
    if (!isChar(selectedType)) return nullTab

    return {
      tab: <Tab><Icon src='icon-item-camera'/></Tab>,
      panel: <Panel><AttachableInspector scene={scene}/></Panel>
    }
  }, [selectedType])
  
  
  return (
    <React.Fragment>
      <a href='#' className='object-property-heading'>
        {selectedName} Properties
      </a>
      <Tabs key={id}>
        <div className='tabs-header'>
          <Tab><Icon src='icon-item-camera'/></Tab>
          {handPoseTab.tab}
          {charPoseTab.tab}
          {modelTab.tab}
          {attachmentTab.tab}
        </div>

        <div className='tabs-body'>
          <Panel><GeneralInspector/></Panel>
          {handPoseTab.panel}
          {charPoseTab.panel}
          {modelTab.panel}
          {attachmentTab.panel}
        </div>
      </Tabs>
    </React.Fragment>
  )
})

const getObjectInfo = (state) => {
  const selected = getSelections(state)[0]
  const object = getSceneObjects(state)[selected]
  
  if (!object) {
    return null
  }
  
  return {
    id: selected,
    selectedName: object.displayName,
    selectedType: object.type
  }
}

const getObjectInfoM = deepEqualSelector([getObjectInfo], (info) => info)

const mapStateToProps = (state) => getObjectInfoM(state)

export default connect(mapStateToProps)(Inspector)
