import { remote } from 'electron'
import { useState, useEffect, useMemo, forwardRef, useRef } from 'react'
import { connect } from 'react-redux'
import path from 'path'
import fs from 'fs-extra'
import classNames from 'classnames'
import prompt from 'electron-prompt'
import LiquidMetal from 'liquidmetal'
import * as THREE from 'three'
window.THREE = THREE

// for pose harvesting (maybe abstract this later?)
import { machineIdSync } from 'node-machine-id'
import pkg from '../../../../../package.json'
import request from 'request'

import { FixedSizeGrid } from 'react-window'

import h from '../../../utils/h'

import {
  updateObject,
  createPosePreset,

  getSceneObjects
} from '../../../shared/reducers/shot-generator'

import ModelLoader from '../../../services/model-loader'
import SkeletonUtils from '../../../vendor/three/examples/js/utils/SkeletonUtils'
import defaultPosePresets from '../../../shared/reducers/shot-generator-presets/poses.json'
import presetsStorage from '../../../shared/store/presetsStorage'
import ThumbnailRenderer from '../../ThumbnailRenderer'

const comparePresetNames = (a, b) => {
  var nameA = a.name.toUpperCase()
  var nameB = b.name.toUpperCase()

  if (nameA < nameB) {
    return -1
  }
  if (nameA > nameB) {
    return 1
  }
  return 0
}
const NUM_COLS = 4
const comparePresetPriority = (a, b) => b.priority - a.priority

const searchPresetsForTerms = (presets, terms) => {
  const matchAll = terms == null || terms.length === 0

  return presets
    .sort(comparePresetNames)
    .filter(preset => {
      if (matchAll) return true

      return (
        (LiquidMetal.score(preset.name, terms) > 0.8) ||
        (preset.keywords && LiquidMetal.score(preset.keywords, terms) > 0.8)
      )
    })
    .sort(comparePresetPriority)
}

const shortId = id => id.toString().substr(0, 7).toLowerCase()

const GUTTER_SIZE = 5
const ITEM_WIDTH = 68
const ITEM_HEIGHT = 132

const IMAGE_WIDTH = ITEM_WIDTH
const IMAGE_HEIGHT = 100

const elementStyle = {
  position:"absolute", 
  height:ITEM_HEIGHT, 
  width:ITEM_WIDTH + GUTTER_SIZE}

const filepathFor = model => 
  ModelLoader.getFilepathForModel(
    { model: model.id, type: model.type },
    { storyboarderFilePath: null })

const CHARACTER_MODEL = { id: 'adult-male', type: 'character' }

const setupRenderer = ({ thumbnailRenderer, attachments, preset }) => {
  if (!thumbnailRenderer.getGroup().children.length) {
    let modelData = attachments[filepathFor(CHARACTER_MODEL)].value
    let group = SkeletonUtils.clone(modelData.scene.children[0])
    let child = group.children[1]

    let material = new THREE.MeshToonMaterial({
      color: 0xffffff,
      emissive: 0x0,
      specular: 0x0,
      skinning: true,
      shininess: 0,
      flatShading: false,
      morphNormals: true,
      morphTargets: true,
      map: modelData.scene.children[0].children[1].material.map
    })
    material.map.needsUpdate = true

    child.material = material
    thumbnailRenderer.getGroup().add(group)
    group.rotation.y = Math.PI/20

    // uncomment to test a simple box
    //
    // let box = new THREE.Mesh(
    //   new THREE.BoxGeometry( 1, 1, 1 ),
    //   new THREE.MeshToonMaterial({
    //     color: 0xcccccc,
    //     emissive: 0x0,
    //     specular: 0x0,
    //     shininess: 0,
    //     flatShading: false
    //   })
    // )
    // thumbnailRenderer.getGroup().add(box)
  }

  // setup thumbnail renderer
  let mesh = thumbnailRenderer.getGroup().children[0].children[1]
  let pose = preset.state.skeleton
  let skeleton = mesh.skeleton
  skeleton.pose()
  for (let name in pose) {
    let bone = skeleton.getBoneByName(name)
    if (bone) {
      bone.rotation.x = pose[name].rotation.x
      bone.rotation.y = pose[name].rotation.y
      bone.rotation.z = pose[name].rotation.z

      if (name === 'Hips') {
        bone.rotation.x += Math.PI / 2.0
      }
    }
  }
}

const PosePresetsEditorItem = React.memo(({ style, id, posePresetId, preset, updateObject, attachments, thumbnailRenderer }) => {
  const src = path.join(remote.app.getPath('userData'), 'presets', 'poses', `${preset.id}.jpg`)

  const onPointerDown = event => {
    event.preventDefault()

    let posePresetId = preset.id
    let skeleton = preset.state.skeleton

    updateObject(id, { posePresetId, skeleton })
  }

  useMemo(() => {
    let hasRendered = fs.existsSync(src)

    if (!hasRendered) {
      thumbnailRenderer.current = thumbnailRenderer.current || new ThumbnailRenderer()
      setupRenderer({
        thumbnailRenderer: thumbnailRenderer.current,
        attachments,
        preset
      })
      thumbnailRenderer.current.render()
      let dataURL = thumbnailRenderer.current.toDataURL('image/jpg')
      thumbnailRenderer.current.clear()

      fs.ensureDirSync(path.dirname(src))

      fs.writeFileSync(
        src,
        dataURL.replace(/^data:image\/\w+;base64,/, ''),
        'base64'
      )
    }
  }, [src])

  let className = classNames('thumbnail-search__item', {
    'thumbnail-search__item--selected': posePresetId === preset.id
  })

  return <div className={ className }
    style={ style }
    onPointerDown={ onPointerDown }
    data-id={ preset.id }
    title={ preset.name }> 
      <figure style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}> 
        <img src={ src } style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT } }/>
      </figure>
      <div className="thumbnail-search__name" 
        style={{
          width: ITEM_WIDTH ,
          height: ITEM_HEIGHT - IMAGE_HEIGHT - GUTTER_SIZE
        }}>
      { preset.name }
      </div>
    </div>
})

const ListItem = React.memo(({ preset, id, posePresetId, updateObject, attachments, thumbnailRenderer, style, index }) => {
 // let { id, posePresetId, updateObject, attachments, thumbnailRenderer } = data
  //let preset = data.presets[columnIndex + (rowIndex * 4)]

  if (!preset) return <div/>
  let currentRow = index / NUM_COLS 
  let currentCol = index % (NUM_COLS)
  let newElementStyle = {position: style.position, width: style.width, height: style.height}
  newElementStyle.top = style.height * Math.floor(currentRow)
  newElementStyle.left = style.width * currentCol

  return <PosePresetsEditorItem
      style={newElementStyle}
      id={id}
      posePresetId={posePresetId}
      attachments={attachments}
      updateObject={updateObject}
      preset={preset}
      thumbnailRenderer={thumbnailRenderer}/>
})

const PosePresetsEditor = connect(
  state => ({
    attachments: state.attachments,

    posePresets: state.presets.poses,
  }),
  {
    updateObject,
    createPosePreset,
    withState: (fn) => (dispatch, getState) => fn(dispatch, getState())
  }
)(
React.memo(({
  id,
  posePresetId,

  posePresets,
  attachments,

  updateObject,
  createPosePreset,
  withState
}) => {
  const thumbnailRenderer = useRef()

  const [ready, setReady] = useState(false)
  const [terms, setTerms] = useState(null)

  const presets = useMemo(() => searchPresetsForTerms(Object.values(posePresets), terms), [posePresets, terms])

  useEffect(() => {
    if (ready) return

    let filepath = filepathFor(CHARACTER_MODEL)
    if (attachments[filepath] && attachments[filepath].value) {
      setTimeout(() => {
        setReady(true)
      }, 100) // slight delay for snappier character selection via click
    }
  }, [attachments])


  const onChange = event => {
    event.preventDefault()
    setTerms(event.currentTarget.value)
  }

  const onCreatePosePreset = event => {
    event.preventDefault()

    // show a prompt to get the desired preset name
    let win = remote.getCurrentWindow()
    prompt({
      title: 'Preset Name',
      label: 'Select a Preset Name',
      value: `Pose ${shortId(THREE.Math.generateUUID())}`
    }, win).then(name => {
      if (name != null && name != '' && name != ' ') {
        withState((dispatch, state) => {
          // get the latest skeleton data
          let sceneObject = getSceneObjects(state)[id]
          let skeleton = sceneObject.skeleton
          let model = sceneObject.model

          // create a preset out of it
          let newPreset = {
            id: THREE.Math.generateUUID(),
            name,
            keywords: name, // TODO keyword editing
            state: {
              skeleton: skeleton || {}
            },
            priority: 0
          }

          // add it to state
          createPosePreset(newPreset)

          // save to server
          // for pose harvesting (maybe abstract this later?)
          request.post('https://storyboarders.com/api/create_pose', {
            form: {
              name: name,
              json: JSON.stringify(skeleton),
              model_type: model,
              storyboarder_version: pkg.version,
              machine_id: machineIdSync()
            }
          })

          // select the preset in the list
          updateObject(id, { posePresetId: newPreset.id })

          // get updated state (with newly created pose preset)
          withState((dispatch, state) => {
            // ... and save it to the presets file
            let denylist = Object.keys(defaultPosePresets)
            let filteredPoses = Object.values(state.presets.poses)
              .filter(pose => denylist.includes(pose.id) === false)
              .reduce(
                (coll, pose) => {
                  coll[pose.id] = pose
                  return coll
                },
                {}
              )
            presetsStorage.savePosePresets({ poses: filteredPoses })
          })
        })
      }
    }).catch(err =>
      console.error(err)
    )
  }

  // via https://reactjs.org/docs/forwarding-refs.html
  const innerElementType = forwardRef(({ style, ...rest }, ref) => {
    return h([
      'div',
      {
        ref,
        style: {
          ...style,
          width: 288, // cut off the right side gutter
          position: 'relative',
          overflow: 'hidden'
        },
        ...rest
      },
    ])
  })

  return ready && <div className="thumbnail-search column">
      <div className="row" style={{ padding: '6px 0' } }> 
         <div className="column" style={{ flex: 1 }}> 
          <input placeholder='Search for a pose …'
                 onChange={onChange}/>
        </div>
        <div className="column" style={{ marginLeft: 5 }}> 
          <a className="button_add" href="#"
            style={{ width: 30, height: 34 }}
            onPointerDown={onCreatePosePreset}
          >+</a>
        </div>
      </div> 
      
      <div className="thumbnail-search__list">
        <div className="row" style={{
               width: 288, 
               height: 363,
               position: "relative",
               overflow: "auto"}}>
        { presets.map((item, index) => <ListItem 
                  id={ id }
                  key={ index }
                  preset={ item } 
                  style={ elementStyle }
                  posePresetId={ posePresetId }
                  attachments={ attachments }
                  updateObject={ updateObject }
                  index={ index }
                  thumbnailRenderer={ thumbnailRenderer }
                  />)}
        </div>
      </div>
    </div> 
}))

export default PosePresetsEditor
