/* global describe it */

// npx floss -p test/preferences.renderer.test.js

const assert = require('assert')

const toolbarReducer = require('../src/js/shared/reducers/toolbar')
const preferencesReducer = require('../src/js/shared/reducers/preferences')

describe('toolbar preferences (renderer)', () => {
  it('can load from prefs.json', () => {
    // load prefs json
    // merge in state from prefs data (if it exists) to toolbar state

    let preferencesState = {
      toolbar: {
        tools: {
          pencil: {
            color: 0xff0000
          }
        },
        captions: true
      }
    }
    let toolbarState = toolbarReducer(undefined, { type: 'TOOLBAR_MERGE_FROM_PREFERENCES', payload: preferencesState })

    // pencil color changed
    assert.equal(toolbarState.tools.pencil.color, 0xff0000)
    // pencil size same
    assert.equal(toolbarState.tools.pencil.size, 4)

    // toolbar eraser should be the default
    assert.equal(toolbarState.tools.eraser.color, 0xffffff) // FIXME erase color doesn't matter. should we even bother storing it to prefs?

    // captions state is not stored in toolbar yet
    assert.equal(toolbarState.captions, undefined)
  })

  it('can save to prefs.json', () => {
    // grab toolbar state
    // merge useful values into prefs state
    // save to a file

    // select the pencil
    let toolbarState = toolbarReducer(undefined, { type: 'TOOLBAR_TOOL_CHANGE', payload: 'pencil' })

    // the pencil is not red
    assert.notEqual(toolbarState.tools['pencil'].color, 0xff0000)

    // change its color to red
    toolbarState = toolbarReducer(toolbarState, { type: 'TOOLBAR_TOOL_SET', payload: { color: 0xff0000 } })

    // merge into preferences
    // guides and onion skin are ignored intentionally
    // captions are added manually (because they're not part of the toolbar reducer yet)
    let preferencesState = preferencesReducer(undefined, {
      type: 'PREFERENCES_MERGE_FROM_TOOLBAR',
      payload: {
        ...toolbarState,
        captions: true
      }
    })

    // preferences should now have a red pencil
    assert.equal(preferencesState.toolbar.tools['pencil'].color, 0xff0000)
    // preferences should now have captions enabled
    assert.equal(preferencesState.toolbar.captions, true)

    // merge onto other prefs
    // save to a file
  })
})
