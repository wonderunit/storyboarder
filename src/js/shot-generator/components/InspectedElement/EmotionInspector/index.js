import React from 'react'
import classNames from 'classnames'
import {connect} from 'react-redux'
import {
    updateObject,
    getSelections,
    getSceneObjects
  } from '../../../../shared/reducers/shot-generator'
  import fs from 'fs-extra'
  import path from 'path'
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import FileInput from '../../FileInput'
import deepEqualSelector from '../../../../utils/deepEqualSelector'
import { truncateMiddle } from '../../../../utils'

const loadImages = (files, baseDir) => {
    return new Promise((resolve, reject) => {
      let projectDir = path.dirname(baseDir)
      let assetsDir = path.join(projectDir, 'models', 'images')
      fs.ensureDirSync(assetsDir)
  
      let dsts = []
      for (let src of files) {
        let dst = path.join(assetsDir, path.basename(src))
        try {
          fs.copySync(src, dst)
          dsts.push(dst)
        } catch (err) {
          reject(src)
        }
      }
  
      let ids = dsts.map(filepath => path.relative(projectDir, filepath))
      
      resolve(ids)
    })
  }
const getModelData = deepEqualSelector([(state) => {
    const selectedId = getSelections(state)[0]
    const object = getSceneObjects(state)[selectedId]
  
    return {
      allModels: state.models,
      id: selectedId,
      model: object.model,
      sceneObject: object
    }
  }], data => data)
const EmotionsInspector = connect(
    getModelData,
    {
        updateObject,
        withState: (fn) => (dispatch, getState) => fn(dispatch, getState()),
    }
  )( React.memo(({
    sceneObject,
    updateObject,
    withState
  }) => {

    const onSelectFile = filepath => {
        if (filepath.file) {
          let storyboarderFilePath
          withState((dispatch, state) => {
            storyboarderFilePath = state.meta.storyboarderFilePath
          })
          console.log(filepath)
          console.log(storyboarderFilePath)
          loadImages(filepath.files, storyboarderFilePath)
          .then((ids) => {
            updateObject(sceneObject.id, { emotion: ids[0] }) 
          })
        }
    }
    const refClassName = classNames( "button__file", "button__file--selected")
    // allow a little text overlap
    const wrapperClassName = "button__file__wrapper"

    const selectValue = useCallback(() => {
        const ext = path.extname(sceneObject.emotion)
        const basenameWithoutExt = path.basename(sceneObject.emotion, ext)
        const displayName = truncateMiddle(basenameWithoutExt, 13)
        return displayName
    }, [sceneObject.emotion])

    return <div className="thumbnail-search column">
         <div className="row" style={{ padding: "6px 0" }}>
            <FileInput value={ sceneObject.emotion ? selectValue() : "Select File …" }
                       title={ sceneObject.emotion ? path.basename(sceneObject.emotion) : undefined }
                       onChange={ onSelectFile }
                       refClassName={ refClassName }
                       wrapperClassName={ wrapperClassName }/>
        </div>
      </div>
}))
export default EmotionsInspector
