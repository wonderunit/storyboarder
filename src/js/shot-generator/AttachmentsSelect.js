const { dialog } = require('electron').remote
const path = require('path')

const h = require('../utils/h')

const AttachmentsSelect = ({ ids, options, multiple, onChange, onBlur }) => {
  // convert ids to value string
  let value = ids.slice().sort().join(',')

  // TODO
  let isCustom = false

  // TODO
  const displayName = value => value

  return h(
    [
      'select', {
        style: {
          marginBottom: 0
        },
        value,
        onChange: event => {
          event.preventDefault()
          let selected = event.target.selectedOptions[0]
          
          if (selected)
            if (selected.dataset.selector) {
              // TODO see VolumePresetsEditor
              // let filepaths = dialog.showOpenDialog(null, { properties: ['openFile', 'multiSelections'] })
              let filepaths = dialog.showOpenDialog(null, {})
              if (filepaths) {
                let filepath = filepaths[0]

                // TODO convert to ids array
                // onChange( filepath )

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
      }, [
        // ['optgroup', { label: 'Custom' }, [
        //   isCustom
        //     ? [
        //       'option',
        //       {
        //         value,
        //         disabled: true
        //       },
        //       displayName(value)
        //     ]
        //     : [],
        //   [
        //     'option',
        //     {
        //       'data-selector': true,
        //       onClick: event => event.preventDefault()
        //     },
        //     'Select files …'
        //   ]
        // ]],
        ['optgroup', { label: 'Built-in' }, [
          options.map(({ name, value }) =>
            ['option', { value }, name]
          )
        ]]
      ]
    ]
  )
}

module.exports = AttachmentsSelect
