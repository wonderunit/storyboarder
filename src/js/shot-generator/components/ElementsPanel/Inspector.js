
import InspectedElement from '../InspectedElement'
import React, { useContext } from 'react'
import MultiSelectionInspector from '../MultiSelectionInspector'

const Inspector = ({
  kind, data,
  selections,
  notifications
}) => {
  let sceneObject = data
  let isGroup = sceneObject && sceneObject.type === "group"
  let selectedCount = isGroup ? sceneObject.children.length + 1 : selections.length

  return <div id="inspector">
    {(selectedCount > 1)
      ? <MultiSelectionInspector/>
      :  <InspectedElement notifications={notifications} isInspectedWorld={!(kind && data)}/>
    }
    </div>
}
export default Inspector
