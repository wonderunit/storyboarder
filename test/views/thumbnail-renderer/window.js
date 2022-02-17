__REACT_DEVTOOLS_GLOBAL_HOOK__ = { isDisabled: true }

const THREE = require('three')
require('../../../src/js/shared/IK/utils/Object3dExtension')
window.THREE = THREE

const remote = require('@electron/remote')

const path = require('path')
const fs = require('fs-extra')

const { useMemoOne } = require('use-memo-one')
const { Suspense } = React = require('react')
const ReactDOM = require('react-dom')
const { Provider, useSelector } = require('react-redux')
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

const ModelThumbnailRenderer = require('./ModelThumbnailRenderer').default
const EmotionPresetThumbnailRenderer = require('../../../src/js/shot-generator/components/InspectedElement/EmotionInspector/thumbnail-renderer').default
const systemEmotionPresets = require('../../../src/js/shared/reducers/shot-generator-presets/emotions.json')

const asBase64 = s => s.replace(/^data:image\/\w+;base64,/, '')

// TODO switch to useLoader or use-asset for caching?
const textureLoader = filepath =>
  new Promise(
    (resolve, reject) => new THREE.TextureLoader().load(filepath, resolve, null, reject)
  )

// TODO switch to useLoader or use-asset for caching?
const gltfLoader = filepath =>
  new Promise(
    (resolve, reject) => new GLTFLoader().load(filepath, resolve, null, reject)
  )

const emotionThumbnailAsset = createAsset(async (thumbnailRenderer, filepath, type = 'image/jpg') => {
  const faceTexture = await textureLoader(filepath)
  thumbnailRenderer.render({ faceTexture })
  let result = thumbnailRenderer.toDataURL(type)
  thumbnailRenderer.clear()
  return result
})

const modelThumbnailAsset = createAsset(async (thumbnailRenderer, filepath, loadable, type = 'image/jpg') => {
  let modelData
  if (loadable.id != 'box') {
    modelData = await gltfLoader(filepath)
  }
  thumbnailRenderer.render({ model: loadable, modelData })
  let result = thumbnailRenderer.toDataURL(type)
  thumbnailRenderer.clear()
  return result
})

const Image = ({ src, name }) => {
  return <img
    src={src}
    width={68}
    title={name}
    style={{ margin: 4 }}
  />
}

const TestView = () => {
  const characterGltf = useLoader(GLTFLoader, getAssetPath('character', 'adult-male.glb'))

  const modelThumbnailRenderer = useMemoOne(() => new ModelThumbnailRenderer(), [])
  const emotionPresetThumbnailRenderer = useMemoOne(() => new EmotionPresetThumbnailRenderer({ characterGltf, inverseSide:true }), [])

  return (
    <Suspense fallback={<span>Rendering ...</span>}>
      <ThumbnailsView
        modelThumbnailRenderer={modelThumbnailRenderer}
        emotionPresetThumbnailRenderer={emotionPresetThumbnailRenderer}
        />
    </Suspense>
  )
}

const Item = ({ modelThumbnailRenderer, loadable }) => {
  const src = modelThumbnailAsset.read(
    modelThumbnailRenderer,
    getAssetPath(loadable.type, `${loadable.id}.glb`),
    loadable
  )

  return (
    <Image
      src={src}
      name={loadable.name}>
    </Image>
  )
}

const ModelThumbnailsView = ({ modelThumbnailRenderer }) => {
  const allowedTypes = ['object', 'attachable']
  const models = useSelector(state => Object.values(state.models).filter(({ type }) => allowedTypes.includes(type)))

  const onSaveClick = event => {
    for (let model of models) {
      let thumbnailFilepath = getAssetPath(model.type, `${model.id}.jpg`)
      let cached = modelThumbnailAsset.read(
        modelThumbnailRenderer,
        getAssetPath(model.type, `${model.id}.glb`),
        model
      )
      console.log(`writing ${thumbnailFilepath}`)
      // TODO fs.ensureDirSync(path.dirname(thumbnailFilepath))
      fs.writeFileSync(thumbnailFilepath, asBase64(cached), 'base64')
    }
  }

  const asItem = loadable => (
    <Suspense
      key={loadable.id}
      fallback={<span>Rendering ...</span>}
    >
      <Item
        modelThumbnailRenderer={modelThumbnailRenderer}
        loadable={loadable}
      />
    </Suspense>
  )

  return <>
    <div>
    {
      models.filter(o => o.type === 'object').map(asItem)
    }
    </div>
    <div>
    {
      models.filter(o => o.type === 'attachable').map(asItem)
    }
    </div>
    <div>
      <button
        onClick={onSaveClick}
        style={{ fontSize: 14, padding: 10 }}>
          Export Model Thumbnails
        </button>
    </div>
  </>
}

const EmotionThumbnailsView = ({ emotionPresetThumbnailRenderer }) => {
  const onSaveClick = event => {
    fs.ensureDirSync(getAssetPath('emotion'))
    for (let emotion of Object.values(systemEmotionPresets)) {
      let textureFilepath = getAssetPath('emotion', `${emotion.id}-texture.png`)
      let thumbnailFilepath = getAssetPath('emotion', `${emotion.id}-thumbnail.jpg`)
      let cached = emotionThumbnailAsset.read(emotionPresetThumbnailRenderer, textureFilepath)
      console.log(`writing ${thumbnailFilepath}`)
      fs.writeFileSync(thumbnailFilepath, asBase64(cached), 'base64')
    }
  }

  return <>
    <div>
      {
        Object.values(systemEmotionPresets).map(emotion =>
          <Image
            key={emotion.id}
            src={emotionThumbnailAsset.read(emotionPresetThumbnailRenderer, getAssetPath('emotion', `${emotion.id}-texture.png`))}
            name={emotion.name}
          />
        )
      }
    </div>
    <div>
      <button
        onClick={onSaveClick}
        style={{ fontSize: 14, padding: 10 }}>
          Export Emotion Thumbnails
        </button>
    </div>
  </>
}

const ThumbnailsView = ({ modelThumbnailRenderer, emotionPresetThumbnailRenderer }) => {
  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <ModelThumbnailsView modelThumbnailRenderer={modelThumbnailRenderer} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <EmotionThumbnailsView emotionPresetThumbnailRenderer={emotionPresetThumbnailRenderer} />
      </div>
    </>
  )
}

remote.getCurrentWebContents().openDevTools()

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
