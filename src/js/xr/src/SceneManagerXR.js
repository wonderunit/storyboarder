const THREE = require('three')
window.THREE = window.THREE || THREE
const { Canvas, useThree, useRender } = require('react-three-fiber')

const { connect } = require('react-redux')
const React = require('react')
const { useMemo } = React

const { WEBVR } = require('three/examples/jsm/vr/WebVR')

const SceneContent = () => {
  return (
    <>
    </>
  )
}

const XRStartButton = ({ }) => {
  const { gl } = useThree()

  useMemo(
    () => document.body.appendChild(WEBVR.createButton(gl)),
    []
  )

  return null
}

const SceneManagerXR = connect(
  state => ({
    //
  }),
  {
    //
  }
)(
  ({
    //
  }) => {
    const loaded = false

    return (
      <>
        {
          !loaded && <div className='loading-button'>LOADING …</div>
        }
        <Canvas vr style={{ visibility: 'hidden' }}>
          {
            loaded && <XRStartButton />
          }
          <SceneContent />
        </Canvas>
        <div className="scene-overlay"></div>
      </>
    )
  })

module.exports = SceneManagerXR
