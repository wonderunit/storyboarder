import InspectedWorld from '../InspectedWorld'
import InspectedElement from '../InspectedElement'
import React, { useContext } from 'react'
import MultiSelectionInspector from '../MultiSelectionInspector'

const Inspector = ({
  kind, data,
  selections
}) => {
  let sceneObject = data
  let isGroup = sceneObject && sceneObject.type === "group"
  let selectedCount = isGroup ? sceneObject.children.length + 1 : selections.length

  return <div id="inspector">
    {(selectedCount > 1)
      ? <MultiSelectionInspector/>
      : (kind && data)
        ? <InspectedElement/>
        : <InspectedWorld/>}
    </div>
}
export default Inspector
