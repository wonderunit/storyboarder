import React, {useState, useEffect, useCallback} from 'react'
import { formatters, NumberSlider, transforms } from '../../NumberSlider'

const BoneInspector = ({ sceneObject, selectedBone, updateCharacterSkeleton }) => {
  const [render, setRender] = useState(false)

  let bone = Object.values(sceneObject.skeleton).find(object => object.id === selectedBone)
  let rotation = bone.rotation
  const createOnSetValue = useCallback((key, transform) => value => {
    updateCharacterSkeleton({
      id: sceneObject.id,
      name: bone.name,
      rotation: {
        x: rotation.x,
        y: rotation.y,
        z: rotation.z,
        [key]: transform(value)
      }
    })
  }, [sceneObject, bone])

  // the posePresetId and skeleton will change synchronously
  // but the three scene will not have updated bones until SceneManager renders
  // so for now, just wait until that has probably happened :/
  useEffect(() => {
    setRender(false)

    setTimeout(() => {
      setRender(true)
    }, 1)
  }, [sceneObject.posePresetId])

  return <div className="column">
        <div className="column" style={{ marginBottom: 3 }}>
          <div style={{ flex: 1, margin: "6px 0 3px 0" }}>Bone</div> 
          <small style={{ display: "flex", flex: 1, marginLeft: 1, fontStyle: "italic", opacity: 0.8 }}>{ bone.name }</small>
        </div>

        <div className="column">
            <NumberSlider
                label="x"
                min={ -180 }
                max={ 180 }
                step={ 1 }
                value={ THREE.Math.radToDeg(rotation.x) }
                onSetValue={ createOnSetValue("x", THREE.Math.degToRad) }
                transform={ transforms.degrees }
                formatter={ formatters.degrees }/>
            <NumberSlider
                label="y"
                min={ -180 }
                max={ 180 }
                step={ 1 }
                value={ THREE.Math.radToDeg(rotation.y) }
                onSetValue={ createOnSetValue("y", THREE.Math.degToRad) }
                transform={ transforms.degrees }
                formatter={ formatters.degrees }/>
            <NumberSlider
                label="z"
                min={ -180 }
                max={ 180 }
                step={ 1 }
                value={ THREE.Math.radToDeg(rotation.z) }
                onSetValue={ createOnSetValue("z", THREE.Math.degToRad) }
                transform={ transforms.degrees }
                formatter={ formatters.degrees }/>
        </div> 
    </div>
}

export default BoneInspector