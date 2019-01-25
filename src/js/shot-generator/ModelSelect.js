const { dialog } = require('electron').remote
const path = require('path')

const ModelLoader = require('../services/model-loader')
const h = require('../utils/h')

const ModelSelect = ({ sceneObject, options, updateObject, transition }) => {
  return h(
    ['div.row', [
      ['div', { style: { width: 50 } }, 'model'],
      ['div.row', [

        [
          'select', {
            value: sceneObject.model,
            onChange: event => {
              event.preventDefault()
              let selected = event.target.selectedOptions[0]

              if (selected)
                if (selected.dataset.selector) {
                  let filepaths = dialog.showOpenDialog(null, {})
                  if (filepaths) {
                    let filepath = filepaths[0]
                    updateObject(sceneObject.id, { model: filepath })
                  }
                  // automatically blur to return keyboard control
                  document.activeElement.blur()
                  transition('TYPING_EXIT')

                } else {
                  updateObject(sceneObject.id, { model: event.target.value })

                }
            }
          }, [
            ['optgroup', { label: 'Custom' }, [
              ModelLoader.isCustomModel(sceneObject.model)
                ? [
                    'option',
                    {
                      value: sceneObject.model,
                      disabled: true
                    },
                    path.basename(sceneObject.model)
                  ]
                : []
              ,
              ['option', {
                'data-selector': true,
                onClick: event => { 
                  event.preventDefault()

                }
              }, 'Select a file …']
            ]],
            ['optgroup', { label: 'Built-in' }, [
              options.map(({ name, value }) =>
                ['option', { value }, name]
              )
            ]]
          ]
        ],
    ]]]]
  )
}

module.exports = ModelSelect