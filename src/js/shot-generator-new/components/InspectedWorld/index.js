import React, {useCallback} from 'react'

import {connect} from 'react-redux'

import Checkbox from './../Checkbox'
import {NumberSlider} from './../NumberSlider'

import {
  getSceneObjects,
  getSelections,
  getActiveCamera,
  
  selectObject, deleteObjects, updateObject
} from './../../../shared/reducers/shot-generator'

import deepEqualSelector from './../../../utils/deepEqualSelector'

const InspectedWorld = React.memo(({updateObject, activeCamera}) => {
  //console.log(activeCamera)
  
  const onSetValue = useCallback((value) => {
    //updateObject(activeCamera.id, {x: value})
  }, [])
  
  return (
      <div>
        <h4 className='inspector-label'>Scene</h4>
        <div className='inspector-group'>
          <div className='inspector-row'>
            <Checkbox label='Ground' checked={true} />
          </div>
          <NumberSlider
            label='Test'
            value={activeCamera.x}
            min={-30}
            max={30}
            step={1}
            onSetValue={onSetValue}
          />
        </div>
      </div>
  )
})

const getActiveCameraM = deepEqualSelector([getSceneObjects, getActiveCamera], (sceneObjects, getActiveCamera) => {
  return sceneObjects[getActiveCamera]
})

const mapStateToProps = (state) => ({
  activeCamera: getActiveCameraM(state)
})

const mapDispatchToProps = {
  selectObject, deleteObjects, updateObject
}

export default connect(mapStateToProps, mapDispatchToProps)(InspectedWorld)
