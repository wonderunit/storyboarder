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

      console.log({
        aspectRatio, sceneObjects, world
      })

      // Object.values(sceneObjects).map(sceneObject =>
      //   ['div', `id: ${sceneObject.id} type: ${sceneObject.type}`]
      // )

      return h(
        ['div#camera-view', { ref: cameraViewElRef },
          ['canvas#camera-canvas', { ref: cameraCanvasElRef, tabIndex: 1 }]
        ],
        [SceneManagerXR, {
          scene,
          sceneObjects
        }]
      )
  })
}

module.exports = {
  createViewerXR
}
