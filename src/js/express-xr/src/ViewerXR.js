const path = require('path')

const { connect } = require('react-redux')
const React = require('react')
const { useRef, useContext } = React

const SceneManagerXR = require('./SceneManagerXR')
const GuidesView = require('../../shot-generator/GuidesView')

const h = require('../../utils/h')
const useComponentSize = require('../../hooks/use-component-size')

// const { } = require('../../shared/reducers/shot-generator')

const createViewerXR = ({ SceneContext }) => {
  return connect(
    state => ({
      aspectRatio: state.aspectRatio,
      sceneObjects: state.sceneObjects,
      world: state.world
    }),
    {
      withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
    }
  )(
    ({ aspectRatio, sceneObjects, world }) => {
      const cameraViewElRef = useRef()
      const cameraCanvasElRef = useRef()

      const scene = useContext(SceneContext)

      return h(
        [SceneManagerXR, {
          aspectRatio,
          scene,
          sceneObjects,
          world
        }]
      )
  })
}

module.exports = {
  createViewerXR
}
