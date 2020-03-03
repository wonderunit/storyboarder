import { remote } from 'electron'
const { dialog } = remote
import path from 'path'

import { isUserFile } from '../../../services/model-loader'

const AttachmentsSelect = ({ style = {}, ids, options, copyFiles, onChange, onBlur, multiSelections }) => {
  // convert ids to value string
  let value = ids.slice().sort().join(',')
  
  let isCustom = ids.some(filepath => isUserFile(filepath))
  let label = ids.map(id => path.basename(id)).join(',')

  const fileOpen = (event) => {
    event.preventDefault()
    let selected = event.target.selectedOptions[0]
    if (selected) {
      if (selected.dataset.selector) {
        let filepaths = dialog.showOpenDialog(null, { properties: ["openFile", multiSelections ? "multiSelections" : ""] })
        if (filepaths) {
          let ids = copyFiles(filepaths)
          if (ids.length) {
            onChange( ids )
          }
        }
        // automatically blur to return keyboard control
        document.activeElement.blur()
        onBlur()
      } else {
        // convert value string to ids
        ids = event.target.value.split(',')
        onChange( ids )
      }
    }
  }

  return <select 
      style={
          { marginBottom: 0 },
          { ...style }
      }
      value={ value }
      onChange={ fileOpen }>
      <optgroup label="Custom">
        { isCustom && <option value={ value } disabled={ true }>{ label }</option> }
        <option
            data-selector={ true }
            onClick={ event => event.preventDefault() }>
          { multiSelections ? "Select files …" : "Select file …" }
        </option>
      </optgroup>
      <optgroup label="Built-in"> 
        { 
        options.map(({ name, value }) => <option key={ value } value={ value }>{ name }</option> )
        }
      </optgroup>
    </select>
}

export default AttachmentsSelect
