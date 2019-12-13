
import React, {useState, useMemo, useEffect, useCallback, useRef} from 'react'
import {connect} from "react-redux"

import {
  selectObject,
  deleteObjects,
  updateObject,
  
  getSceneObjects,
  getSelections
} from './../../../shared/reducers/shot-generator'

import isEqual from 'lodash.isequal'
import classNames from 'classnames'

const ELEMENT_HEIGHT = 40

const ItemList = React.memo(({sceneObjects, selections, ...props}) => {
  const Items = Object.values(sceneObjects).map((object, index) => {
    let className = classNames({
      'element': true,
      //'selected': selections.indexOf(object.id) !== -1,
      'zebra': index % 2
    })
    
    return (
        <div
          className={className}
          style = {{height: ELEMENT_HEIGHT}}
          key = {object.id}
        >
          <a
            className='title'
            href='#'
          >
            {object.displayName}
          </a>
        </div>
    )
  })
  
  console.log('Rerender')
  
  return (
      <div>
        {Items}
      </div>
  )
})

const mapStateToProps = (state) => ({
  sceneObjects: getSceneObjects(state),
  selections: getSelections(state)
})

const mapDispatchToProps = {
  // selectObject,
  // deleteObjects,
  // updateObject
}

export default connect(mapStateToProps, mapDispatchToProps)(ItemList)
