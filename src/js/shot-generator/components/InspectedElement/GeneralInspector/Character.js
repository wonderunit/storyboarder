import React, {useCallback, useMemo} from 'react'
import {Math as _Math} from 'three'
import {formatters, NumberSlider, transforms} from '../../NumberSlider'
import ColorSelect from '../../ColorSelect'
import {initialState} from '../../../../shared/reducers/shot-generator'
import CharacterPresetEditor from '../CharacterPresetEditor'
import BoneInspector from '../BoneInspector'
import ModelLoader from '../../../../services/model-loader'

const MORPH_TARGET_LABELS = {
  'mesomorphic': 'Muscular',
  'ectomorphic': 'Skinny',
  'endomorphic': 'Obese',
}

const CHARACTER_HEIGHT_RANGE = {
  character: { min: 1.4732, max: 2.1336 },
  child: { min: 1.003, max: 1.384 },
  baby: { min: 0.492, max: 0.94 }
}
const feetAndInchesAsString = (feet, inches) => `${feet}′${inches}″`

const metersAsFeetAndInches = meters => {
  let heightInInches = meters * 39.3701
  let heightFeet = Math.floor(heightInInches / 12)
  let heightInches = Math.floor(heightInInches % 12)
  return [heightFeet, heightInches]
}

const feetAndInchesAsMeters = (value) => {
  const [ , feet, inches ] = value.match( /(\d+)'\s*(\d+)(?:''|")/ )
  let cm = feet * 30.48 + inches * 2.54
  let meter = Math.floor(cm / 100)
  cm = Math.floor(cm % 100)
  return meter + cm
}

const CharacterInspector = React.memo(({updateObject, sceneObject, selectedBone, updateCharacterSkeleton}) => {
  const {id, ...props} = sceneObject

  const setX = useCallback((x) => updateObject(id, {x}), [])
  const setY = useCallback((y) => updateObject(id, {y}), [])
  const setZ = useCallback((z) => updateObject(id, {z}), [])

  const setRotation = useCallback((x) => updateObject(id, {rotation: _Math.degToRad(x)}), [])
  const setHeight = useCallback((height) => updateObject(id, {height}), [])
  const setHeadScale = useCallback((value) => updateObject(id, {headScale: (value / 100)}), [])

  const setTintColor = useCallback((tintColor) => updateObject(id, {tintColor}), [])

  const validTargets = initialState.models[props.model] && initialState.models[props.model].validMorphTargets
  const validTargetsExist = (validTargets && Object.values(validTargets).length !== 0)

  const heightRange =
  sceneObject.type == 'character' && !ModelLoader.isCustomModel(sceneObject.model)
    ? ['adult', 'teen'].some(el => sceneObject.model.includes(el))
      ? CHARACTER_HEIGHT_RANGE['character']
      : CHARACTER_HEIGHT_RANGE[sceneObject.model]
    : undefined

  const morphTargets = useMemo(() => {
    if (!validTargetsExist) {
      return null
    }
    
    const objectTargets = Object.entries(props.morphTargets)
      .filter(m => validTargets.includes(m[0]))
    
    return objectTargets.map(([key, value]) => {
      return (
        <NumberSlider
          label={MORPH_TARGET_LABELS[key]}
          value={value * 100}
          min={0} max={100} step={1}
          onSetValue={(value) => updateObject(id, { morphTargets: { [key]: value / 100 } })}
          formatter={formatters.percent}
          key={key}
        />
      )
    })
    
  }, [props.morphTargets, props.model])

  return (
    <React.Fragment>
      <div>
        <CharacterPresetEditor/>
        
        <NumberSlider label="X" value={props.x} min={-30} max={30} onSetValue={setX}/>
        <NumberSlider label="Y" value={props.y} min={-30} max={30} onSetValue={setY}/>
        <NumberSlider label="Z" value={props.z} min={-30} max={30} onSetValue={setZ}/>
  
        <NumberSlider
          label="Rotation"
          value={_Math.radToDeg(props.rotation)}
          min={-180}
          max={180}
          step={1}
          onSetValue={setRotation}
          transform={transforms.degrees}
          formatter={formatters.degrees}
        />
        {ModelLoader.isCustomModel(sceneObject.model)
          ? 
            <NumberSlider 
              label="scale"
              min={ 0.3 }
              max={ 3.05 }
              step={ 0.0254 }
              value={ sceneObject.height } 
              onSetValue={ setHeight }/>
          :
          <NumberSlider 
            label="Height" 
            value={props.height} 
            min={ heightRange.min } 
            max={ heightRange.max } 
            step={ 0.0254 }
            onSetValue={setHeight}
            formatter={ value => feetAndInchesAsString(
              ...metersAsFeetAndInches(
                sceneObject.height
              )
            ) }
            textFormatter={ value => feetAndInchesAsMeters(value)}
          /> 
        }
        {ModelLoader.isCustomModel(sceneObject.model) || <NumberSlider
          label="Head"
          value={props.headScale * 100}
          min={80} max={120} step={1}
          formatter={formatters.percent}
          onSetValue={setHeadScale}
        />}
  
         {ModelLoader.isCustomModel(sceneObject.model) || <ColorSelect
          label="Tint color"
          value={props.tintColor}
          onSetValue={setTintColor}
        />}
      </div>

      <div className="inspector-offset-row">
        {validTargetsExist && <div className="inspector-offset-row italic">Morphs</div>}
        {morphTargets}
      </div>
      { selectedBone && <BoneInspector 
        selectedBone={ selectedBone }
        sceneObject={ sceneObject } 
        updateCharacterSkeleton={ updateCharacterSkeleton }/> }
    </React.Fragment>
  )
})

export default CharacterInspector