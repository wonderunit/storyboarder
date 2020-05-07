import React, {useEffect, useState} from 'react'
import {formatters, NumberSlider} from '../../NumberSlider'
const PostureComponent = React.memo(({id, getSceneObjects, updateObject, withState }) => {

    const [postureValue, setPostureValue] = useState(0)
    useEffect(() => {
        let sceneObject 
        withState((dispatch, state) => {
          sceneObject = getSceneObjects(state)[id]
        })
        let posturePercentage = sceneObject.posturePercentage || 0.5
        posturePercentage = posturePercentage * (100  * 2) - 100
    
        setPostureValue(posturePercentage)
    }, [id])

    const setUpPosture = (value) => {
      let sceneObject 
      withState((dispatch, state) => {
        sceneObject = getSceneObjects(state)[id]
      })
      let croppedValue = ( value  + 100 ) / (100 * 2)
      updateObject(sceneObject.id, {posturePercentage: croppedValue})
      setPostureValue(value)
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