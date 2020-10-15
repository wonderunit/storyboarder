__REACT_DEVTOOLS_GLOBAL_HOOK__ = { isDisabled: true }

const THREE = require('three')
require('../../../src/js/shared/IK/utils/Object3dExtension')
window.THREE = THREE

const electron = require('electron')

const path = require('path')
const fs = require('fs-extra')

const { useMemoOne } = require('use-memo-one')
const { Suspense } = React = require('react')
const ReactDOM = require('react-dom')
const { Provider } = require('react-redux')
const { createStore } = require('redux')
const { createAsset, useAsset } = require('use-asset')
const { useLoader } = require('react-three-fiber')
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader')

const { reducer, initialState } = require('../../../src/js/shared/reducers/shot-generator')
const store = createStore(reducer, initialState)

const { createAssetPathResolver } = require('../../../src/js/shot-generator/services/filepaths')
const getAssetPath = createAssetPathResolver(
  path.join(window.__dirname, '..', '..', '..', 'src'),
  window.__dirname
)

const EmotionPresetThumbnailRenderer = require('../../../src/js/shot-generator/components/InspectedElement/EmotionInspector/thumbnail-renderer').default
const systemEmotionPresets = require('../../../src/js/shared/reducers/shot-generator-presets/emotions.json')

const asBase64 = s => s.replace(/^data:image\/\w+;base64,/, '')

// TODO switch to useLoader or use-asset for caching?
const textureLoader = filepath =>
  new Promise(
    (resolve, reject) => new THREE.TextureLoader().load(filepath, resolve, null, reject)
  )

const thumbnailAsset = createAsset(async (thumbnailRenderer, filepath, type = 'image/jpg') => {
  const faceTexture = await textureLoader(filepath)
  thumbnailRenderer.render({ faceTexture })
  let result = thumbnailRenderer.toDataURL(type)
  thumbnailRenderer.clear()
  return result
})

const Item = ({ thumbnailRenderer, name, filepath }) => {
  const src = thumbnailAsset.read(thumbnailRenderer, filepath)

  return <img
    src={src}
    width={68}
    title={name}
    style={{ margin: 4 }}
  />
}

const TestView = () => {
  const characterGltf = useLoader(GLTFLoader, getAssetPath('character', 'adult-male.glb'))

  const emotionPresetThumbnailRenderer = useMemoOne(() => new EmotionPresetThumbnailRenderer({ characterGltf }))

  const onSaveClick = event => {
    for (let emotion of Object.values(systemEmotionPresets)) {
      let textureFilepath = getAssetPath('emotion', `${emotion.id}-texture.png`)
      let thumbnailFilepath = getAssetPath('emotion', `${emotion.id}-thumbnail.jpg`)
      let cached = thumbnailAsset.read(emotionPresetThumbnailRenderer, textureFilepath)
      console.log(`writing ${thumbnailFilepath}`)
      fs.writeFileSync(thumbnailFilepath, asBase64(cached), 'base64')
    }
  }

  return (
    <>
      <div>
        {
          Object.values(systemEmotionPresets).map(emotion =>
            <Item
              key={emotion.id}
              thumbnailRenderer={emotionPresetThumbnailRenderer}
              name={emotion.name}
              filepath={getAssetPath('emotion', `${emotion.id}-texture.png`)}
            />
          )
        }
      </div>
      <div>
        <button
          onClick={onSaveClick}
          style={{ fontSize: 14, padding: 10 }}>
            Export Thumbnails
          </button>
      </div>
    </>
  )
}

electron.remote.getCurrentWebContents().openDevTools()

let el = document.createElement('div')
document.body.appendChild(el)
ReactDOM.render(
  <Provider store={store}>
    <div className="container" style={{ margin: 50 }}>
      <Suspense fallback={<h1>Loading …</h1>}>
        <TestView />
      </Suspense>
    </div>
  </Provider>,
  el
)
