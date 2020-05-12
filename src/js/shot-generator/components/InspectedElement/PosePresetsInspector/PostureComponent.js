import React, {useEffect, useState, useMemo} from 'react'
import {formatters, NumberSlider} from '../../NumberSlider'
const PostureComponent = React.memo(({id, getSceneObjects, updateObject, withState, data, defaultPostureValue}) => {

    const [postureValue, setPostureValue] = useState(defaultPostureValue)

    useMemo(() => {
      data.setPostureValue = setPostureValue
    }, [data])

    useEffect(() => {
        let sceneObject 
        withState((dispatch, state) => {
          sceneObject = getSceneObjects(state)[id]
        })
        let posturePercentage = sceneObject.posturePercentage === undefined ? defaultPostureValue : sceneObject.posturePercentage
        posturePercentage = posturePercentage * (100  * 2) - 100
    
        setPostureValue(posturePercentage)
    }, [id])

    const setUpPosture = (value) => {
      if(value === postureValue) return
      let sceneObject 
      withState((dispatch, state) => {
        sceneObject = getSceneObjects(state)[id]
      })
      let croppedValue
      let newValue = value
      let posturePercentage = ( postureValue  + 100 ) / (100 * 2)
      if(sceneObject.posturePercentage && sceneObject.posturePercentage !== posturePercentage) {
        croppedValue = sceneObject.posturePercentage
        newValue = sceneObject.posturePercentage * (100  * 2) - 100
      } else {
        croppedValue = ( newValue  + 100 ) / (100 * 2)
      }
      updateObject(sceneObject.id, {posturePercentage: croppedValue})
      setPostureValue(newValue)
    } 
    return ( 
        <NumberSlider
        label="Posture"
        value={postureValue}
        min={-100} max={100} step={10}
        formatter={formatters.percent}
        onSetValue={setUpPosture}
      />
    )

})

export default PostureComponent;