import InspectedWorld from '../InspectedWorld'
import InspectedElement from '../InspectedElement'
import React, { useContext, useState } from 'react'
import MultiSelectionInspector from '../MultiSelectionInspector'
import InspectedGroup from '../InspectedGroup'
import { useTranslation } from 'react-i18next'
import Modal from '../Modal'
import deepEqualSelector from './../../../utils/deepEqualSelector'

const Inspector = ({
  kind, data,
  selections
}) => {
  let sceneObject = data
  let isGroup = sceneObject && sceneObject.type === "group"
  let selectedCount = isGroup ? sceneObject.children.length + 1 : selections.length

  // const { t } = useTranslation()
  // const [isModalShown, showModal] = useState(false)
  // const [changedName, changeNameTo] = useState(false)


  if (isGroup && (sceneObject.children.length + 1 == selections.length)) 
    return  <InspectedGroup sceneObject={sceneObject} />
  

  return <div id="inspector">
    {(selectedCount > 1)
      ? <MultiSelectionInspector/>
      : (kind && data)
        ? <InspectedElement/>
        : <InspectedWorld/>}
    </div>
}
export default Inspector

