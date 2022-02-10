const { Suspense, useRef, useEffect } = React = require('react')
const { useService } = require('@xstate/react')
const { useTranslation } = require('react-i18next')

const h = require('../../utils/h')
const { specs } = require('./machine')
const presets = require('./presets.js')
const i18n = require('../../services/i18next.config')

const preventDefault = (fn, ...args) => e => {
  e.preventDefault()
  fn(e, ...args)
}

var range = (start, end) =>
  [...Array(end - start + 1)].map((_, i) => start + i)

const RadioGroup = ({ name, value, onChange, children }) =>
  React.createElement('div', { className: 'group' }, React.Children.map(children, child =>
    React.cloneElement(child, {
      ...child.props,
      checked: value == child.props.value,
      name,
      onChange
    })))

const Radio = ({ name, value, label, onChange, checked, title }) =>
  h(
    ['div.radio',
      { title },
      [`input#${name}-${value}`, 
        {
          value,
          type: 'radio',
          name,
          onChange,
          checked
        }],
        ['label', { htmlFor: `${name}-${value}` }, label]]
  )

const Checkbox = ({ name, label, onChange, checked }) =>
  h(
    ['div.checkbox',
      [`input#${name}`,
        {
          type: 'checkbox',
          onChange,
          checked
        }],
        ['label', { htmlFor: name }, label ]]
  )

const Pagination = ({ project, pages, gridDim, pageToPreview, isBusy, send }) => {
  const current = pageToPreview + 1
  const total = pages[1] + 1

  const canNext = total > 1
  const canPrevious = total > 1
  
  const onPrevious = preventDefault(event => send('DECREMENT_PAGE_TO_PREVIEW'))
  const onNext = preventDefault(event => send('INCREMENT_PAGE_TO_PREVIEW'))

  return h(['div.pagination', { className: isBusy ? 'busy' : null }, [
    ['button.pagination__previous-button', { onClick: onPrevious, style: { visibility: canPrevious ? 'visible' : 'hidden' } }, 'Previous'],
    ['div.pagination__status', [
      ['span', 'Page\u00A0'],
      ['span.pagination__current', current], ['span', '/'], ['span.pagination__total', total]
    ]],
    ['button.pagination__next-button', { onClick: onNext, style: { visibility: canNext ? 'visible' : 'hidden' } }, 'Next']
  ]])
}

const EditorView = ({ onClose, onPrint, onExport, onSelectedPresetChange, state, send, canvas, ...rest }) => {
  const innerRef = useRef(null)

  useEffect(() => {
    innerRef.current.innerHTML = ''
    innerRef.current.appendChild(canvas)
    send('CANVAS_READY')
  }, [ innerRef, canvas ])

  return h(['div.editor',
    ['div.input', {}, [
      InputView, {
        onClose, onPrint, onExport, onSelectedPresetChange,
        state, send,
        ...rest
      }
    ]],
    ['div.output',
      [Pagination, {
          project: rest.project, pages: rest.pages, gridDim: rest.gridDim, pageToPreview: rest.pageToPreview,
          isBusy: state.matches('busy'),
          send
        }],
      ['div.inner', { ref: innerRef }]
    ]
  ])
}

const InputView = props => h([
  Suspense, { fallback: h([InputLoadingView]) }, [
    InputControlsView, { ...props }
  ]
])

// TODO loading spinner while i18n is loading
const InputLoadingView = () => null

const InputControlsView = ({
  onClose,
  onPrint,
  onExport,
  onSelectedPresetChange,

  state,
  send,

  paperSizeKey,
  orientation,
  gridDim,
  direction,
  enableDialogue,
  enableAction,
  enableNotes,
  enableShotNumber,
  boardTimeDisplay,
  boardTextSize,
  boardBorderStyle,
  header,
  selectedPresetId
}) => {
  const { t, i18n } = useTranslation()

  const setPaperSizeKey = event => send({
    type: 'SET_PAPER_SIZE_KEY',
    value: event.target.value
  })

  const presetSelector = {
    select: {
      value: selectedPresetId == null ? 'no-preset' : selectedPresetId,
      onChange: onSelectedPresetChange,
    },
    options: [
      Object.entries(presets).map(([value, { title }]) => (['option', { value }, title])),
      ['option', { disabled: true }, '──────────'],
      ['option', { disabled: true, value: 'no-preset' }, t('print-project.preset-selection-none')]
    ]
  }

  return h(
    [React.Fragment, [
      ['a.close', { href: '#', onClick: onClose }, '×'],

      ['form', { action: '#', className: state.matches('busy') ? 'busy' : null },
        ['div.upper',
          ['h1.title', t('print-project.title')],
          ['.description', t('print-project.description')],

          ['.collection', [
            ['fieldset',
              ['div',
                ['legend', { name: 'paper-size-key' }, t('print-project.paper-size')]
              ],
              [RadioGroup,
                {
                  name: 'paper-size-key',
                  value: paperSizeKey,
                  onChange: setPaperSizeKey
                },
                [Radio, { value: 'a4', label: t('print-project.paper-size-a4-label'), title: t('print-project.paper-size-a4-hint') }],
                [Radio, { value: 'letter', label: t('print-project.paper-size-letter-label'), title: t('print-project.paper-size-letter-hint') }],
              ]
            ],
            ['fieldset',
              ['div',
                ['legend', { name: 'selected-preset' }, t('print-project.preset-selection-title')]
              ],

              [
                'select',
                { ...presetSelector.select, style: { width: 'calc(100% - 5rem)' }},
                presetSelector.options
              ]
            ]
          ]],

          ['.collection', [
            ['div', t('print-project.layout-title')],


          ['fieldset',
            ['div',
              ['legend', { name: 'orientation' }, 'Orientation']
            ],
            [RadioGroup,
              {
                name: 'orientation',
                value: orientation,
                onChange: event => send({
                  type: 'SET_ORIENTATION',
                  value: event.target.value
                })
              },
              [Radio, { value: 'landscape', label: t('print-project.landscape') }],
              [Radio, { value: 'portrait', label: t('print-project.portrait') }],
            ]
          ],

          ['fieldset',
            ['div',
              ['legend', { name: 'grid' }, t('print-project.grid-title')]],
            ['div.group',
              ['div.select',
                ['select', {
                  value: gridDim[0],
                  onChange: event =>
                    send({ type: 'SET_GRID_ROWS', value: parseInt(event.target.value) })
                  },
                  range(...specs.rows).map(value =>
                    ['option', { name: 'grid-rows', value: value }, value]
                  )
                ],
              ],
              ['span', '×'],
              ['div.select',
                ['select', {
                  value: gridDim[1],
                  onChange: event =>
                    send({ type: 'SET_GRID_COLUMNS', value: parseInt(event.target.value) })
                  },
                  range(...specs.columns).map(value =>
                    ['option', { name: 'grid-columns', value: value }, value]
                  )
                ]
              ]
            ]
          ]
        ]],


              ['div.collection',
                  ['div', t('print-project.header-title')],

              //     ['fieldset',
              //         ['div',
              //             ['legend', { name: 'header-pages' }, 'Pages']],
              //         ['div.group',
              //             ['div.radio',
              //                 ['input#pages-none', 
              //                     {
              //                         defaultChecked: 'checked',
              //                         value: 'none',
              //                         type: 'radio',
              //                         name: 'pages',
              //                     }],
              //                 ['label', { htmlFor: 'pages-none' }, 'None']],
              //             ['div.radio',
              //                 ['input#pages-all', 
              //                     {
              //                         value: 'all',
              //                         type: 'radio',
              //                         name: 'pages',
              //                     }],
              //                 ['label', { htmlFor: 'pages-all' }, 'All']],
              //             ['div.radio',
              //                 ['input#pages-scene', 
              //                     {
              //                         value: 'scene',
              //                         type: 'radio',
              //                         name: 'pages',
              //                     }],
              //                 ['label', { htmlFor: 'pages-scene' }, 'First of Scene']]]],

              ['fieldset',
                ['div',
                  ['legend', { name: 'stats' }, t('print-project.header-stats-title')]],
                ['div.group',

                  [Checkbox, {
                    name: 'stats-boards',
                    label: t('print-project.header-stats-boards'),
                    checked: header.stats.boards,
                    onChange: event =>
                      send({ type: 'SET_HEADER_STATS_BOARDS', value: event.target.checked })
                  }],
                  [Checkbox, {
                    name: 'stats-shots',
                    label: t('print-project.header-stats-shots'),
                    checked: header.stats.shots,
                    onChange: event =>
                      send({ type: 'SET_HEADER_STATS_SHOTS', value: event.target.checked })
                  }],
                  [Checkbox, {
                    name: 'stats-scene-duration',
                    label: t('print-project.header-stats-scene-duration'),
                    checked: header.stats.sceneDuration,
                    onChange: event =>
                      send({ type: 'SET_HEADER_STATS_SCENE_DURATION', value: event.target.checked })
                  }],
                  [Checkbox, {
                    name: 'stats-aspect-ratio',
                    label: t('print-project.header-stats-aspect-ratio'),
                    checked: header.stats.aspectRatio,
                    onChange: event =>
                      send({ type: 'SET_HEADER_STATS_ASPECT_RATIO', value: event.target.checked })
                  }],
                  [Checkbox, {
                    name: 'stats-date-exported',
                    label: t('print-project.header-stats-date-exported'),
                    checked: header.stats.dateExported,
                    onChange: event =>
                      send({ type: 'SET_HEADER_STATS_DATE_EXPORTED', value: event.target.checked })
                  }],

                ]],
              ],

              ['div.collection',
                ['div', t('print-project.boards-title')],

                ['fieldset',
                  ['div',
                    ['legend', { name: 'details' }, t('print-project.boards-details-title')]],
                  ['div.group',
                    [Checkbox, {
                      name: 'details-shot-number',
                      label: t('print-project.boards-details-shot-number'),
                      checked: enableShotNumber,
                      onChange: (event =>
                        send({ type: 'SET_ENABLE_SHOT_NUMBER', value: event.target.checked })
                      )
                    }]
                  ]
                ],
    
                ['fieldset',
                  ['div',
                    ['legend', { name: 'text' }, 'Text']],
                  ['div.group',
                    [Checkbox, {
                      name: 'text-dialogue',
                      label: t('print-project.boards-text-dialogue'),
                      checked: enableDialogue,
                      onChange: (event =>
                        send({ type: 'SET_ENABLE_DIALOGUE', value: event.target.checked })
                      )
                    }],
                    [Checkbox, {
                      name: 'text-action',
                      label: t('print-project.boards-text-action'),
                      checked: enableAction,
                      onChange: (event =>
                        send({ type: 'SET_ENABLE_ACTION', value: event.target.checked })
                      )
                    }],
                    [Checkbox, {
                      name: 'text-notes',
                      label: t('print-project.boards-text-notes'),
                      checked: enableNotes,
                      onChange: (event =>
                        send({ type: 'SET_ENABLE_NOTES', value: event.target.checked })
                      )
                    }]
                  ]],

                  ['fieldset',
                    ['div',
                      ['legend', { name: 'board-time-display' }, t('print-project.boards-time-display-title')]
                    ],
                    [RadioGroup,
                      {
                        name: 'board-time-display',
                        value: boardTimeDisplay,
                        onChange: event => send({ type: 'SET_BOARD_TIME_DISPLAY', value: event.target.value })
                      },
                      [Radio, { value: 'none', label: t('print-project.boards-time-display-none') }],
                      [Radio, { value: 'duration', label: t('print-project.boards-time-display-duration') }], // Dur.
                      [Radio, { value: 'sceneTime', label: 'In Scene' }],
                      // [Radio, { value: 'scriptTime', label: 'In Script' }] // TODO Script Time
                    ]
                  ],

                  ['fieldset',
                    ['div',
                      ['legend', { name: 'direction' }, t('print-project.board-layout-title')]
                    ],
                    [RadioGroup,
                      {
                        name: 'direction',
                        value: direction,
                        onChange: event => send({ type: 'SET_DIRECTION', value: event.target.value })
                      },
                      [Radio, { value: 'column', label: t('print-project.board-layout-column') }],
                      [Radio, { value: 'row', label: t('print-project.board-layout-row') }],
                    ]
                  ],

                  ['fieldset',
                    ['div',
                      ['legend', { name: 'board-text-size' }, t('print-project.boards-text-size-title')]
                    ],

                    ['.group',
                      ['.select',
                        ['select', {
                          value: boardTextSize,
                          onChange: event =>
                            send({ type: 'SET_BOARD_TEXT_SIZE', value: parseInt(event.target.value) })
                          },
                          range(...specs.boardTextSize).map(value =>
                            ['option', { name: 'board-text-size', value: value }, value]
                          )
                        ]
                      ]
                    ]
                  ],

                  ['fieldset',
                    ['div',
                      ['legend', { name: 'board-border-style' }, t('print-project.board-border-style-title')]
                    ],

                    [RadioGroup,
                      {
                        name: 'board-border-style',
                        value: boardBorderStyle,
                        onChange: event => send({ type: 'SET_BOARD_BORDER_STYLE', value: event.target.value })
                      },
                      [Radio, { value: 'full', label: t('print-project.board-border-style-label-full') }],
                      [Radio, { value: 'minimal', label: t('print-project.board-border-style-label-minimal') }],
                    ]
                  ]
                ],

              // ['details', { open: true },
              //     ['summary', 'Pagination'],
              //     ['div.group',
              //         ['div.checkbox',
              //             ['input#pagination-header', { type: 'checkbox' }],
              //             ['label', { htmlFor: 'pagination-header' }, 'Header']],
              //         ['div.checkbox',
              //             ['input#pagination-footer', { type: 'checkbox' }],
              //             ['label', { htmlFor: 'pagination-footer' }, 'Footer']]]]],

        ],

          ['div.lower',
              ['div.row',
                  ['button.primary-button', { onClick: onPrint }, t('print-project.print-button-label')],
                  ['button.secondary-button', { onClick: onExport }, t('print-project.export-pdf-button-label')]
                ]
              ]
            ]
    ]]
  )
}

const PrintApp = ({ service, canvas }) => {
  const [state, send] = useService(service)

  const onClose = () => send('CLOSE')

  const onPrint = preventDefault(event => send('PRINT'))

  const onExport = preventDefault(event => send('EXPORT'))

  const onSelectedPresetChange = preventDefault(event => send({ type: 'SET_SELECTED_PRESET_BY_ID', value: event.target.value }))

  return React.createElement(
    EditorView, {
      onClose, onPrint, onExport, onSelectedPresetChange,
      state, send,
      canvas,
      ...state.context
    }
  )
}

module.exports = {
  PrintApp
}
