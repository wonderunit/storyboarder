import { remote } from 'electron'
const { dialog } = remote
import React, { useMemo, useState, useEffect, useContext } from 'react'
import { connect } from 'react-redux'
import prompt from 'electron-prompt'
import {
  deleteObjects,
  getSceneObjects,
  updateObject
} from '../../../shared/reducers/shot-generator'
import ListItem from "./ListItem"
import deepEqualSelector from './../../../utils/deepEqualSelector'
const sceneObjectSelector = (state) => {
    let sceneObjects = getSceneObjects(state)
    let values = Object.values(sceneObjects).filter(object => object.type === "attachable").map((object) => {
        return  {
            id:           object.id,
            bindBone:     object.bindBone,
            displayName:  object.displayName,
            size:         object.size,
          }
    })
    return values
}
const getSceneObjectsM = deepEqualSelector([sceneObjectSelector], sceneObjects => sceneObjects)

const AttachableInfo = connect(
  state => ({
    sceneObjects: getSceneObjectsM(state),
  }),
  {
    updateObject,
    deleteObjects,
    withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
  }
)(
  React.memo(({
    sceneObjects,

    updateObject,
    deleteObjects,
    withState,

    id,
    NumberSlider,
    SceneContext
  }) => {
    console.log("Render")
    
    const { scene } = useContext(SceneContext)
    const [sceneObject, setSceneObject] = useState({})
    useEffect(() => {
       withState((dispatch, state) => {
         setSceneObject(getSceneObjects(state)[id])
       })
    }, [id])

    const onSelectItem = (id, bindBoneName) => {
        if(!scene) return
        let skinnedMesh = scene.children.filter(child => child.userData.id === sceneObject.id)[0].getObjectByProperty("type", "SkinnedMesh")
        let originalSkeleton = skinnedMesh.skeleton
        let selectOptions = {}
        for(let i = 0; i < originalSkeleton.bones.length; i++) {
          if(!originalSkeleton.bones[i].name.includes("leaf"))
            selectOptions[originalSkeleton.bones[i].name] = originalSkeleton.bones[i].name
        }

        // show a prompt to get the desired preset name
        let win = remote.getCurrentWindow()
        prompt({
          title: 'Preset Name',
          lable: 'Select which hand to save',   
          type: 'select',
          value: bindBoneName,
          selectOptions
        }, win).then(name => { 
          if (name == null || name == '' || name == ' ') return
          let bone = originalSkeleton.getBoneByName(name)
        
          let {x, y, z} = bone.worldPosition()
          updateObject(id, {x, y, z,  bindBone: bone.name })
        })
    }

    const attachables = useMemo(() => {
        let result = []
        withState((dispatch, state) => {
            let sceneObjects = getSceneObjects(state)
            let keys = Object.keys(sceneObjects)
            for(let i = 0; i < keys.length; i++) {
                let key = keys[i]
                let value = sceneObjects[key]
                if(value.attachToId === sceneObject.id)
                    result.push(value)
            }
        })
        return result
    }, [sceneObjects, sceneObject])

    const onDelete = (attachable) => {
      let choice = dialog.showMessageBox(null, {
        type: "question",
        buttons: ["Yes", "No"],
        message: "Are you sure?",
        defaultId: 1 // default to No
      })
      if (choice === 0) {
        deleteObjects([attachable.id])
      }
    }

    const getNumberSlider = (sceneObject) => {
      return <NumberSlider 
        label="size"
        value={ sceneObject.size }   
        min={ 0.7 }
        max={ 2 }
        onSetValue={ value => {
          updateObject(
            sceneObject.id,
            { size: value }
          )}}/>

    }

    return attachables && <div className="thumbnail-search.column">
          <div className="thumbnail-search__list"> 
              <div> 
                 { attachables.map((item, index) => <ListItem
                    key={ index }
                    attachable={ item } 
                    props={{
                      onSelectItem,
                      onDelete,
                      getNumberSlider}}/>
                 )}
              </div>
          </div>
      </div>
}))

export default AttachableInfo