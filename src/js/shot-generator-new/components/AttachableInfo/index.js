import { remote } from 'electron'
const { dialog } = remote
import React, { useMemo } from 'react'
import { connect } from 'react-redux'
import prompt from 'electron-prompt'
import {
  deleteObjects,
  getSceneObjects,
  updateObject
} from '../../../shared/reducers/shot-generator'

const AttachableInfoItem = React.memo(({
    sceneObject,
    onSelectItem,
    onDelete,
    getNumberSlider
  
}) => {
    const bindBoneName = !sceneObject ? '' : sceneObject.bindBone ? sceneObject.bindBone : ''
    const onHandSelect = () => {
        onSelectItem(sceneObject.id, sceneObject.bindBone )
    }
    const buttonName = useMemo(() => bindBoneName, [bindBoneName])
    const attachableName = useMemo(() => { 
        return !sceneObject.displayName ? '' : sceneObject.displayName
    })

    return <div className="attachable-card">
        <div className="attachable-card___title">
            <div className="attachable-card___label">{ attachableName }</div>
            <a className="attachable-card__discard" 
                href="#" 
                onClick={() => { onDelete(sceneObject)}}>X</a>
        </div> 
        <div className="number-slider">
            <div className="number-slider__label"> Attached to bone</div> 
            <div className="column" style={{ marginLeft: 5 }}>
              <a className="button_add" 
                href="#" 
                style={{ width: 161, height: 35 }}
                onPointerDown={ onHandSelect }>{ buttonName }</a> 
            </div>
        </div> 
        { getNumberSlider(sceneObject) }
    </div>
})

const ListItem = React.memo(({ props, attachable }) => {
  const { sceneObjects, getNumberSlider, onSelectItem, onDelete} = props
  let sceneObject = sceneObjects[attachable.userData.id]
  console.log("Render")
  return <AttachableInfoItem
        sceneObject={ sceneObject }
        onSelectItem={ onSelectItem }
        onDelete={ onDelete }
        getNumberSlider={ getNumberSlider }/>
})

const AttachableInfo = connect(
  state => ({
    sceneObjects: getSceneObjects(state),
  }),
  {
    updateObject,
    deleteObjects
  }
)(
  React.memo(({
    sceneObject,
    updateObject,
    scene,
    deleteObjects,
    sceneObjects,
    NumberSlider,
  }) => {
    console.log("Render")
  const onSelectItem = (id, bindBoneName) => {
  
    currentSkeleton = sceneObjects[sceneObject.id]
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
      let character = scene.children.filter(child => child.userData.id === sceneObject.id)[0]
      return !character ? [] : character.attachables ? character.attachables : []
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

  return <div className="thumbnail-search.column">
        <div className="thumbnail-search__list"> 
            <div> 
               { attachables.map((item, index) => <ListItem
                  key={ index }
                  attachable={ item } 
                  props={{
                    sceneObjects,
                    onSelectItem,
                    onDelete,
                    getNumberSlider}}/>
               )}
            </div>
        </div>
    </div>
}))

export default AttachableInfo