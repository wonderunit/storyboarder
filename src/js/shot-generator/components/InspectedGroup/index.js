

import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NumberSlider, textFormatters } from '../NumberSlider'
import Modal from '../Modal'
import {connect} from 'react-redux'
import deepEqualSelector from './../../../utils/deepEqualSelector'

import {
    getSelections,
    getSceneObjects,
    updateObject,
    updateGroup
  } from './../../../shared/reducers/shot-generator'

const InspectedGroup = (props) => {

    // console.log(props)

    const setX = useCallback((x) => props.updateGroup(props.id, {x}), [])
    const setY = useCallback((y) => props.updateGroup(props.id, {y}), [])
    const setZ = useCallback((z) => props.updateGroup(props.id, {z}), [])

    // console.log(props)

    // const setX = useCallback(() => console.log('insp group: upd X'));
    // const setY = useCallback(() => console.log('insp group: upd Y'));
    // const setZ = useCallback(() => console.log('insp group: upd Z'));


    const { t } = useTranslation()
    const [isModalShown, showModal] = useState(false)
    const [changedName, changeNameTo] = useState(false)

    return (
        <div id="inspector">
          { isModalShown && <Modal visible={ isModalShown } onClose={() => showModal(false)}>
            <div style={{ margin:"5px 5px 5px 5px" }}>
              {t("shot-generator.inspector.common.select-preset-name")}
            </div>
            <div className="column" style={{ flex: 1}}>
              <input
                className="modalInput"
                type="text"
                placeholder={ props.selectedName }
                onChange={ (value) => changeNameTo(value.currentTarget.value) }/>
            </div>
            <div className="skeleton-selector__div">
              <button
                className="skeleton-selector__button"
                onClick={() => {
                  showModal(false)
                  props.updateObject(props.id, { displayName: changedName, name: changedName }) //redux
                }}>
                {t("shot-generator.inspector.common.add-preset")}
              </button>
            </div>
          </Modal> }
            <a href="#" className="object-property-heading" style={{ overflow: "hidden", textOverflow: "ellipsis", flexShrink:0, width: 288 }} onClick={ () => showModal(true) }>
                {props.selectedName} {t("shot-generator.inspector.inspected-element.properties")}
            </a>
            <div className="tabs-body">  
                <React.Fragment>
                    <NumberSlider label="X" value={props.x} min={-30} max={30} onSetValue={setX} textFormatter={ textFormatters.imperialToMetric }/>
                    <NumberSlider label="Y" value={props.y} min={-30} max={30} onSetValue={setY} textFormatter={ textFormatters.imperialToMetric }/>
                    <NumberSlider label="Z" value={props.z} min={-30} max={30} onSetValue={setZ} textFormatter={ textFormatters.imperialToMetric }/>
                </React.Fragment>
            </div>
        </div> 
    )
}

const getObjectInfo = (state) => {
    const selected = getSelections(state)[0]
    const object = getSceneObjects(state)[selected]
  
    if (!object) {
      return null
    }

    // console.log(object)
  
    return {
      id: selected,
      selectedName: object.name || object.displayName,
      x: object.x,
      y: object.y,
      z: object.z,
    }
  }
  
  const getObjectInfoM = deepEqualSelector([getObjectInfo], (info) => info)
  
  const mapStateToProps = (state) => getObjectInfoM(state)
  
  const mapDispatchToProps = {
    updateObject,
    updateGroup
  }

export default connect(mapStateToProps, mapDispatchToProps)(InspectedGroup)