// via https://github.com/omnidan/redux-undo/issues/202#issuecomment-433440172

const THREE = require('three')
const { groupByActionTypes } = require('redux-undo')

module.exports = {
  _group: null,
  start (group = THREE.Math.generateUUID()) {
    this._group = group
  },
  end () {
    this._group = null
  },
  init (rawActions) {
    const defaultGroupBy = groupByActionTypes(rawActions)
    return action => this._group || defaultGroupBy(action)
  }
}
