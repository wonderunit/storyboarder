const { connect } = require('react-redux')

const SceneManagerXR = require('./SceneManagerXR')

const h = require('../../utils/h')

// const { } = require('../../shared/reducers/shot-generator')

const ViewerXR = connect(
  state => ({
    aspectRatio: state.aspectRatio,
    sceneObjects: state.sceneObjects,
    world: state.world
  })
)(
  ({ aspectRatio, sceneObjects, world }) => {
    return h(
      [SceneManagerXR, {
        aspectRatio,
        sceneObjects,
        world
      }]
    )
})

module.exports = ViewerXR
