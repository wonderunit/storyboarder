const { dialog } = require('electron').remote
const path = require('path')

const h = require('../utils/h')

const { isUserFile } = require('../services/model-loader')

const AttachmentsSelect = ({ style = {}, ids, options, copyFiles, onChange, onBlur }) => {
  // convert ids to value string
  let value = ids.slice().sort().join(',')

  let isCustom = ids.some(filepath => isUserFile(filepath))
  let label = ids.map(id => path.basename(id)).join(',')

  return h(
    [
      'select', {
        style: {
          marginBottom: 0,
          ...style
        },
        value,
        onChange: event => {
          event.preventDefault()

          let selected = event.target.selectedOptions[0]
          if (selected) {

            if (selected.dataset.selector) {
              let filepaths = dialog.showOpenDialog(null, { properties: ['openFile', 'multiSelections'] })

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
      }, [
        ['optgroup', { label: 'Custom' }, [
          isCustom
            ? [
              'option',
              {
                value,
                disabled: true
              },
              label
            ]
            : [],
          [
            'option',
            {
              'data-selector': true,
              onClick: event => event.preventDefault()
            },
            'Select files …'
          ]
        ]],
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
