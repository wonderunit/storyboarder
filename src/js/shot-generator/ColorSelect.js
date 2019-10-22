const React = require('react')
const h = require('../../../src/js/utils/h')

const defaultOnSetValue = value => {}

const ColorSelect = ({
  label,
  value = '#000000',
  onSetValue = defaultOnSetValue
} = {}) => {
  return h([
    'div.color-select', [
      ['div.color-select__label', label],
      ['div.color-select__control', [
        ['input.color-select__input', {
          type: 'color',
          value: value,
          onChange: event => onSetValue(event.target.value)
        }],
      ]]
    ]
  ])
}

module.exports = ColorSelect;
