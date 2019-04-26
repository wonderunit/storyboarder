const { connect } = require('react-redux')

const SceneManagerXR = require('./SceneManagerXR')

const h = require('../../utils/h')

// const { } = require('../../shared/reducers/shot-generator')

const ViewerXR = connect(
  state => ({
    aspectRatio: state.aspectRatio,

    world: state.world,
    sceneObjects: state.sceneObjects,
    activeCamera: state.activeCamera
  })
)(
  ({ aspectRatio, world, sceneObjects, activeCamera }) => {
    return h(
      [SceneManagerXR]
    )
})

module.exports = ViewerXR
