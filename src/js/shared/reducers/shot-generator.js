const THREE = require('three')
const { produce } = require('immer')
const merge = require('lodash.merge')
const undoable = require('redux-undo').default
const crypto = require('crypto')
const reduceReducers = require('../../vendor/reduce-reducers')
const { combineReducers } = require('redux')
const R = require('ramda')

const batchGroupBy = require('./shot-generator/batchGroupBy')
const serializeSceneObject = require('./shot-generator/serialize-scene-object')

const ObjectModelFileDescriptions = require('../../../data/shot-generator/objects/objects.json')
const AttachablesModelFileDescriptions = require('../../../data/shot-generator/attachables/attachables.json')
const { ShadingType } = require('../../vendor/shading-effects/ShadingType')

const hashify = string => crypto.createHash('sha1').update(string).digest('base64')

const capitalize = string => string.charAt(0).toUpperCase() + string.slice(1)

//
//
// selectors
//
const getSceneObjects = state => state.undoable.present.sceneObjects

const getSceneObjectIds = state => Object.values(state.undoable.present.sceneObjects).map(sceneObject => { return {id: sceneObject.id, type: sceneObject.type} })

const getSelections = state => state.undoable.present.selections

const getActiveCamera = state => state.undoable.present.activeCamera

const getSelectedBone = state => state.undoable.present.selectedBone

const getSelectedAttachable = state => state.undoable.present.selectedAttachable

const getWorld = state => state.undoable.present.world


const getHash = state =>
  hashify(JSON.stringify(getSerializedState(state)))

const getIsSceneDirty = state => getHash(state) !== state.meta.lastSavedHash

// return only the stuff we want to save to JSON
const getSerializedState = state => {
  return {
    world: getWorld(state),
    sceneObjects: R.map(serializeSceneObject, getSceneObjects(state)),
    activeCamera: getActiveCamera(state)
  }
}

//
//
// state helper functions
//
const checkForCharacterChanges = (state, draft, actionPayloadId) => {
  // check to see if character has changed from preset
  // and invalidate if so

  let characterPresetId = getSceneObjects(draft)[actionPayloadId].characterPresetId
  if (characterPresetId) {
    let statePreset = state.presets.characters[characterPresetId]

    // preset does not exist anymore
    if (!statePreset) {
      // so don't reference it
      getSceneObjects(draft)[actionPayloadId].characterPresetId = undefined
      return true
    }
    let stateCharacter = getSceneObjects(draft)[actionPayloadId]

    // for every top-level prop in the preset
    for (let prop in statePreset.state) {
      // if the prop is a number or a string
      if (
        typeof statePreset.state[prop] === 'number' ||
        typeof statePreset.state[prop] === 'string' ||
        typeof statePreset.state[prop] === 'undefined'
      ) {
        // if it differs

        if (stateCharacter[prop] != statePreset.state[prop]) {
          // changed, no longer matches preset
          getSceneObjects(draft)[actionPayloadId].characterPresetId = undefined
          return true
        }
      }
    }

    // hardcode check of second-level props
    if (
      stateCharacter.morphTargets.mesomorphic != statePreset.state.morphTargets.mesomorphic ||
      stateCharacter.morphTargets.ectomorphic != statePreset.state.morphTargets.ectomorphic ||
      stateCharacter.morphTargets.endomorphic != statePreset.state.morphTargets.endomorphic
    ) {
      // changed, no longer matches preset
      getSceneObjects(draft)[actionPayloadId].characterPresetId = undefined
      return true
    }
  }
}

const checkForSkeletonChanges = (state, draft, actionPayloadId) => {
  // check to see if pose has changed from preset
  // and invalidate if so
  let object = getSceneObjects(draft)[actionPayloadId]
  let posePresetId = object && object.posePresetId
  if (posePresetId) {
    let statePreset = state.presets.poses[posePresetId]

    // preset does not exist anymore
    if (!statePreset) {
      // so don't reference it
      getSceneObjects(draft)[actionPayloadId].posePresetId = undefined
      return true
    }

    let draftSkeleton = getSceneObjects(draft)[actionPayloadId].skeleton
    let characterPreset = getSceneObjects(draft)[actionPayloadId].ragDoll;

    let preset = statePreset.state.skeleton
    let curr = draftSkeleton

    if (Object.values(curr).length != Object.values(preset).length) {
      // changed, no longer matches preset
      getSceneObjects(draft)[actionPayloadId].posePresetId = undefined
      return true
    }
    for (let name in preset) {
      if (
        preset[name].rotation.x !== curr[name].rotation.x ||
        preset[name].rotation.y !== curr[name].rotation.y ||
        preset[name].rotation.z !== curr[name].rotation.z
      ) {
        // changed, no longer matches preset
        getSceneObjects(draft)[actionPayloadId].posePresetId = undefined
        return true
      }
    }
  }
}

const checkForHandSkeletonChanges = (state, draft, actionPayloadId) => {
  let handPosePresetId = getSceneObjects(draft)[actionPayloadId].handPosePresetId
  if (handPosePresetId) {
    let statePreset = state.presets.poses[handPosePresetId]

    // preset does not exist anymore
    if (!statePreset) {
      // so don't reference it
      getSceneObjects(draft)[actionPayloadId].handPosePresetId = undefined
      return true
    }

    let draftSkeleton = getSceneObjects(draft)[actionPayloadId].handSkeleton

    let preset = statePreset.state.handSkeleton
    let curr = draftSkeleton

    if (Object.values(curr).length != Object.values(preset).length) {
      // changed, no longer matches preset
      getSceneObjects(draft)[actionPayloadId].handPosePresetId = undefined
      return true
    }
    for (let name in preset) {
      if (
        preset[name].rotation.x !== curr[name].rotation.x ||
        preset[name].rotation.y !== curr[name].rotation.y ||
        preset[name].rotation.z !== curr[name].rotation.z
      ) {
        // changed, no longer matches preset
        getSceneObjects(draft)[actionPayloadId].handPosePresetId = undefined
        return true
      }
    }
  }
}

// migrate SceneObjects from older beta builds of Shot Generator 2.0
const migrateRotations = sceneObjects =>
  Object.entries(sceneObjects)
    .reduce((o, [ k, v ]) => {
      if (v.type === 'object' && typeof v.rotation === 'number') {
        v = {
          ...v,
          rotation: {
            x: 0,
            y: v.rotation,
            z: 0
          }
        }
      }
      o[k] = v
      return o
    }, {})

// migrate older scenes which were missing ambient and directional light settings
const migrateWorldLights = world => ({
  ...world,
  ambient: world.ambient || initialScene.world.ambient,
  directional: world.directional || initialScene.world.directional
})

// migrate older scenes which were missing ambient and directional light settings
const migrateWorldFog = world => ({
  ...world,
  fog: world.fog || initialScene.world.fog
})

// migrate older scenes which were missing shadingMode
const migrateWorldShadingMode = world => ({
  ...world,
  shadingMode: world.shadingMode == null ? initialScene.world.shadingMode : world.shadingMode
})

// migrate older scenes which were missing grayscale
const migrateWorldEnvironmentGrayscale = world => ({
  ...world,
  environment: {
    ...world.environment,
    grayscale: world.environment.grayscale == null ? false : world.environment.grayscale
  }  
})

const updateObject = (draft, state, props, { models }) => {
  // TODO is there a simpler way to merge only non-null values?
  if (props.hasOwnProperty('locked')) {
    if (props.locked) {
      draft.locked = true
    } else {
      draft.locked = false
    }
    delete props["locked"]
  }
  
  if (draft.locked || draft.blocked) {
    return
  }

  
  if (props.rotation != null) {
    if (draft.type === 'object' || draft.type === 'image') {
      // MERGE
      draft.rotation = {
        ...state.rotation,
        ...props.rotation
      }
    } else {
      draft.rotation = props.rotation
    }
    delete props["rotation"]
  }
  if (props.model != null) {
    draft.model = props.model
    
    // if a character's model is changing
    if (draft.type === 'character') {
      // reset the height ...
      draft.height = models[props.model]
      // ... to default (if known) ...
      ? models[props.model].height
      // ... otherwise, a reasonable value
      : 1.6
    }
    draft = withDisplayName(draft)
    delete props["model"]
  }


  if (props.morphTargets != null) {
    Object.entries(props.morphTargets).forEach(([key, value]) => {
      draft.morphTargets[key] = value
    })
    delete props["morphTargets"]
  }
  
  if (props.hasOwnProperty('posePresetId')) {
    draft.posePresetId = props.posePresetId
    if( draft.handPosePresetId) {
      draft.handPosePresetId = null
      draft.handSkeleton = []
    }
    delete props["posePresetId"]
  }

  let keys = Object.keys(props)
  for(let i = 0; i < keys.length; i++ ){
    draft[keys[i]] = props[keys[i]]
  }
}

// `loaded` status is not serialized
// when we load a new file, we need to initialize it
// so it can be read to determine loading progress
const resetLoadingStatus = sceneObjects => {
  for (let key in sceneObjects) {
    if (
      sceneObjects[key].type === 'character' ||
      sceneObjects[key].type === 'object' ||
      sceneObjects[key].type === 'volume' ||
      sceneObjects[key].type === 'image' ||
      sceneObjects[key].type === 'attachable'
    ) {
      sceneObjects[key] = {
        ...sceneObjects[key],
        loaded: sceneObjects[key].loaded == null
          ? false
          : sceneObjects[key].loaded
      }
    }
  }
  return sceneObjects
}

let countByType = {}

// decorate target SceneObject with a calculated displayName
const withDisplayName = sceneObject => {
  let key = sceneObject.name || sceneObject.model || sceneObject.type;
  let arrayOfStrings = key.split('/');
  key = arrayOfStrings[arrayOfStrings.length - 1]

  if(!sceneObject.displayName || sceneObject.displayName !== capitalize(`${key} ${countByType[key]}`) ) {
    countByType[key] = countByType[key]
      ? countByType[key] + 1
      : 1
  }

  
  let number = countByType[key]
  
  // mutate
  sceneObject.displayName = capitalize(`${key} ${number}`)
  
  return sceneObject
}

// decorate each SceneObject with a calculated displayName
const withDisplayNames = draft => {
  countByType = {}

  for (let id in draft) {
    let sceneObject = draft[id]
    let key = sceneObject.name || sceneObject.model || sceneObject.type;
    let arrayOfStrings = key.split('/');
    key = arrayOfStrings[arrayOfStrings.length - 1]
    countByType[key] = countByType[key]
      ? countByType[key] + 1
      : 1

    let number = countByType[key]

    // mutate
    sceneObject.displayName = capitalize(`${key} ${number}`)
  }

  return draft
}

// via poses.json
const defaultPosePreset = {
  '79BBBD0D-6BA2-4D84-9B71-EE661AB6E5AE': {
    'id': '79BBBD0D-6BA2-4D84-9B71-EE661AB6E5AE',
    'name': 'stand',
    'keywords': 'stand straight upright',
    'state': {
      'skeleton': {
        'RightArm': {
          'rotation': {
            'x': 1.057228116003184,
            'y': 0.13045102714961612,
            'z': 0.1570463626924257
          }
        },
        'LeftArm': {
          'rotation': {
            'x': 1.0708379327832764,
            'y': -0.11931130645160759,
            'z': -0.1776163624389008
          }
        },
        'LeftForeArm': {
          'rotation': {
            'x': 0.09392413349188732,
            'y': 0.06624836455319376,
            'z': 0.29879477158887485
          }
        },
        'RightForeArm': {
          'rotation': {
            'x': 0.08067946699767342,
            'y': -0.19368502447268662,
            'z': -0.2725073929210185
          }
        }
      }
    },
    'priority': 0
  }
}
const getCameraShot = (draft, cameraId) => {
  if (!draft[cameraId]) {
    draft[cameraId] = {
      size: null,
      angle: null,
      cameraId: cameraId
    }
  }
  
  return draft[cameraId]
}

// load up the default poses
const defaultHandPosePresets = require('./shot-generator-presets/hand-poses.json')
const defaultEmotionsPresets = require('./shot-generator-presets/emotions.json')

const defaultCharacterPreset = {
  height: 1.6256,
  model: 'adult-female',
  headScale: 1,
  tintColor: '#000000',
  // gender: 'female',
  // age: 'adult'
  morphTargets: {
    mesomorphic: 0,
    ectomorphic: 0,
    endomorphic: 0
  }
}

const defaultScenePreset = {
  world: {
    ground: false,
    backgroundColor: 0xE5E5E5,
    room: {
      visible: true,
      width: 10,
      length: 10,
      height: 3
    },
    environment: {
      file: undefined,
      x: 0,
      y: 0,
      z: 0,
      rotation: 0,
      scale: 1,
      visible: true,
      grayscale: true
    },
    ambient: {
      intensity: 0.1
    },
    directional: {
      intensity: 0.5,
      rotation: -0.9,
      tilt: 0.75
    },
    fog: {
      visible: true,
      far: 40
    },
    shadingMode: ShadingType.Outline
  },
  sceneObjects: {
    'C2062AFC-D710-4C7D-942D-A3BAF8A76D5C': {
      id: 'C2062AFC-D710-4C7D-942D-A3BAF8A76D5C',
      type: 'object',
      model: 'box',
      width: 1,
      height: 1,
      depth: 1,
      x: 0,
      y: 0,
      z: 0,
      rotation: { x: 0, y: 0, z: 0 },
      name: undefined,
      visible: true
    },
    'D8B95127-6C04-40A9-B592-8870EEAF43A8': {
      id: 'D8B95127-6C04-40A9-B592-8870EEAF43A8',
      type: 'object',
      model: 'chair',
      width: 1,
      height: 1,
      depth: 1,
      x: 2,
      y: 0.5,
      z: 0,
      rotation: { x: 0, y: 0, z: 0 },
      name: undefined,
      visible: true
    },
    '94FA0F9D-E1E8-436B-8041-D831BD06CB33': {
      id: '94FA0F9D-E1E8-436B-8041-D831BD06CB33',
      type: 'object',
      model: 'box',
      width: .5,
      height: .5,
      depth: .5,
      x: -2,
      y: -2,
      z: 0,
      rotation: { x: 0, y: 2, z: 0 },
      name: undefined,
      visible: true
    },
    'A1A35319-82D1-4A24-98FE-136836750A61': {
      // non-preset properties
      id: 'A1A35319-82D1-4A24-98FE-136836750A61',
      type: 'character',
      x: 1,
      y: 0,
      z: 0,
      rotation: 0,
      visible: true,

      // character preset properties
      characterPresetId: '7C694D0F-9D45-4B74-BA70-38479E520091',
      ...defaultCharacterPreset,

      // pose preset properties
      posePresetId: defaultPosePreset.id,
      skeleton: defaultPosePreset.skeleton
    },

    '4F0FF9B8-BBB4-4D83-9E87-6EFE16A01D6F': {
      id: '4F0FF9B8-BBB4-4D83-9E87-6EFE16A01D6F',
      type: 'light',
      x: 1,
      y: 1.5,
      z: 2,
      rotation: 10,
      tilt: 10,
      roll: 0,
      intensity: 0.7,
      visible: true,
      angle: 1.04,
      distance: 3,
      penumbra: 0,
      decay: 1,
    },

    '6BC46A44-7965-43B5-B290-E3D2B9D15EEE': {
      id: '6BC46A44-7965-43B5-B290-E3D2B9D15EEE',
      type: 'camera',
      fov: 22.25,
      x: 0,
      y: 6,
      z: 1,
      rotation: -0.0,
      tilt: 0,
      roll: 0.0,
      name: undefined
    },
  },
  activeCamera: '6BC46A44-7965-43B5-B290-E3D2B9D15EEE',
}

const initialScene = {
  world: {
    ground: true,
    backgroundColor: 0xE5E5E5,
    room: {
      visible: false,
      width: 10,
      length: 10,
      height: 3
    },
    environment: {
      file: undefined,
      x: 0,
      y: 0,
      z: 0,
      rotation: 0,
      scale: 1,
      visible: true,
      grayscale: true
    },
    ambient: {
      intensity: 0.5
    },
    directional: {
      intensity: 0.5,
      rotation: -0.9,
      tilt: 0.75
    },
    fog: {
      visible: true,
      far: 40
    },
    shadingMode: ShadingType.Outline
  },
  sceneObjects: {
    '6BC46A44-7965-43B5-B290-E3D2B9D15EEE': {
      id: '6BC46A44-7965-43B5-B290-E3D2B9D15EEE',
      type: 'camera',
      fov: 22.25,
      x: 0,
      y: 6,
      z: 1,
      rotation: 0,
      tilt: 0,
      roll: 0.0,
      name: undefined
    }
  },
  activeCamera: '6BC46A44-7965-43B5-B290-E3D2B9D15EEE'
}

// TODO sg key
const initialState = {
  models: {
    'adult-female': {
      id: 'adult-female',
      name: 'Adult Female',
      type: 'character',
      validMorphTargets: ['ectomorphic', 'mesomorphic', 'endomorphic'],
      height: 1.65
    },
    'adult-male': {
      id: 'adult-male',
      name: 'Adult Male',
      type: 'character',
      validMorphTargets: ['ectomorphic', 'mesomorphic', 'endomorphic'],
      height: 1.8
    },
    'teen-female': {
      id: 'teen-female',
      name: 'Teen Female',
      type: 'character',
      validMorphTargets: ['ectomorphic', 'mesomorphic', 'endomorphic'],
      height: 1.6
    },
    'teen-male': {
      id: 'teen-male',
      name: 'Teen Male',
      type: 'character',
      validMorphTargets: ['ectomorphic', 'mesomorphic', 'endomorphic'],
      height: 1.6
    },
    'child': {
      id: 'child',
      name: 'Child',
      type: 'character',
      validMorphTargets: ['ectomorphic', 'endomorphic'],
      height: 1.2
    },
    'baby': {
      id: 'baby',
      name: 'Baby',
      type: 'character',
      validMorphTargets: [],
      height: 0.75
    },

    'box': {
      id: 'box',
      name: 'Box',
      type: 'object',
      height: 1
    },
    ...ObjectModelFileDescriptions,
    ...AttachablesModelFileDescriptions
  },

  attachments: {},

  aspectRatio: 2.35,

  board: {},

  undoable: {
    world: initialScene.world,
    activeCamera: initialScene.activeCamera,
    sceneObjects: withDisplayNames(initialScene.sceneObjects),
    selections: [],
    selectedBone: null,
    selectedAttachable: null
  },

  meta: {
    storyboarderFilePath: undefined,
    lastSavedHash: undefined
  },

  workspace: {
    guides: {
      center: false,
      thirds: false
    }
  },

  mainViewCamera: 'live', // 'ortho' or 'live'
  input: {
    accel: [0, 0, 0],
    mag: [0, 0, 0],
    sensor: [0, 0, 0, 0],
    down: false,
    mouseMode: false,
    orbitMode: false
  },
  lastAction: { type:null },
  devices: {
    0: {
      analog: {
        lStickX: 127,
        lStickY: 127,
        rStickX: 127,
        rStickY: 127
      },
      motion: {
        gryoPitch: 0,
        gyroRoll: 0,
        gyroYaw: 0
      },
      digital: {
        circle: false
      }
    }
  },
  presets: {
    scenes: {
      'C181CF19-AF44-4348-8BCB-FB3EE582FC5D': {
        id: 'C181CF19-AF44-4348-8BCB-FB3EE582FC5D',
        name: 'Default Scene',
        state: defaultScenePreset
      }
    },

    characters: {
      '7C694D0F-9D45-4B74-BA70-38479E520091': {
        id: '7C694D0F-9D45-4B74-BA70-38479E520091',
        name: 'Default Character',
        state: defaultCharacterPreset
      }
    },

    poses: {
      ...defaultPosePreset
    },
    handPoses: defaultHandPosePresets,
    emotions: defaultEmotionsPresets
  },
  server: {
    uri: undefined,
    client: false
  },
  cameraShots: {}
}

const cameraShotsReducer = (state = {}, action) => {
  return produce(state, draft => {
    switch (action.type) {
      case 'SET_CAMERA_SHOT':
        const camera = getCameraShot(draft, action.payload.cameraId)
        
        camera.size = action.payload.size || camera.size
        camera.angle = action.payload.angle || camera.angle
        camera.character = action.payload.character 
        return
        
        // select a single object
      case 'CREATE_OBJECT':
        if (action.payload.type === 'camera') {
          getCameraShot(draft, action.payload.id)
        }
        return
      
      case 'DUPLICATE_OBJECTS':
        // select the new duplicates, replacing the selection list
          action.payload.ids.forEach((id, i) => {
            if (draft[id]) {
              getCameraShot(draft, action.payload.newIds[i])
            }
          })
        return
      
      case 'DELETE_OBJECTS':
        if (
            action.payload.ids == null ||
            action.payload.ids.length === 0
        ) return
  
        for (let id of action.payload.ids) {
          if (draft[id] == null) continue
          
          delete draft[id]
        }
        return
      
      default:
        return
    }
  })
}

const selectionsReducer = (state = [], action) => {
  return produce(state, draft => {
    switch (action.type) {
      case 'LOAD_SCENE':
      case 'UPDATE_SCENE_FROM_XR':
      case 'MERGE_STATE':
        // clear selections
        return []

      // select a single object
      case 'SELECT_OBJECT':
        return (action.payload == null)
            // empty the selection
            ? []
            // make the selection
            : Array.isArray(action.payload) ? action.payload : [action.payload]

      case 'SELECT_OBJECT_TOGGLE':
        let n = draft.indexOf(action.payload)
        if (n === -1) {
          draft.push(action.payload)
        } else {
          draft.splice(n, 1)
        }
        return
      case 'DESELECT_OBJECT':
        let objectsToDeselect = Array.isArray(action.payload) ? action.payload : [action.payload]
        return draft.filter((target) => objectsToDeselect.indexOf(target) === -1)
      case 'SELECT_ATTACHABLE':
        return [action.payload.bindId]
        
      case 'DUPLICATE_OBJECTS':
        // select the new duplicates, replacing the selection list
        return action.payload.newIds

      case 'DELETE_OBJECTS':
        for (let id of action.payload.ids) {
          // did we remove a selected id?
          if (draft && draft.includes(id) && draft[id]) {
            // delete it from the selections list
            draft.splice(draft.indexOf(id), 1)
          }
        }
        return

      default:
        return
    }
  })
}

const attachableSelectionsReducer = (state = [], action) => {
  return produce(state, draft => {
    switch (action.type) {
      case 'LOAD_SCENE':
      case 'UPDATE_SCENE_FROM_XR':
        // clear selections
        return null

      // select a single object
      case 'SELECT_OBJECT':
        // de-select any currently selected bone
        return null

      case 'SELECT_ATTACHABLE':
        return action.payload.id

      case 'DESELECT_ATTACHABLE':
        return null

      case 'DELETE_OBJECTS':
        for (let id of action.payload.ids) {
          // did we remove a selected id?
          if (draft && draft.includes(id) && draft[id]) {
            // delete it from the selections list
            draft.splice(draft.indexOf(id), 1)
          }
        }
        return
  
      case 'GROUP_OBJECTS':
        return [action.payload.groupId]
  
      case 'UNGROUP_OBJECTS':
        return action.payload.ids
  
      case 'MERGE_GROUPS':
        return [action.payload.groupIds[0]]

      default:
        return
    }
  })
}

const sceneObjectsReducer = (state = {}, action) => {
  return produce(state, draft => {
    switch (action.type) {
      case 'LOAD_SCENE':
      case 'UPDATE_SCENE_FROM_XR':
        return withDisplayNames(
          resetLoadingStatus(
            migrateRotations(
              action.payload.sceneObjects
            )
          )
        )

      case 'BLOCK_OBJECT': 
        let objectsToBlock = Array.isArray(action.payload) ? action.payload : [action.payload]
        for(let id of objectsToBlock) {
          if (draft[id]) {
            draft[id].blocked = true
          }
        }

        return draft

      case 'UNBLOCK_OBJECT': 
        let objectsToUnblock = Array.isArray(action.payload) ? action.payload : [action.payload]
        for(let id of objectsToUnblock) {
          if (draft[id]) {
            draft[id].blocked = false
          }
        }

        return draft

      case 'UNBLOCK_ALL':
        for(let id of Object.keys(draft)) {
          if (draft[id]) {
            draft[id].blocked = false
          }
        }

        return draft

      case 'CREATE_OBJECT':
        let id = action.payload.id != null
          ? action.payload.id
          : THREE.Math.generateUUID()

        draft[id] = {
          ...action.payload, id
        }

        return withDisplayNames(draft)

      case 'CREATE_OBJECTS':
        if (
            action.payload.objects == null ||
            action.payload.objects.length === 0
        ) return
        for(let object of action.payload.objects) {
          draft[object.id] = object
        }
        return withDisplayNames(draft)
  
      case 'DELETE_OBJECTS':
        if (
            action.payload.ids == null ||
            action.payload.ids.length === 0
        ) return
    
        for (let id of action.payload.ids) {
          if (draft[id] == null) continue
      
          if (draft[id].group && draft[draft[id].group]) {
            draft[draft[id].group].children = draft[draft[id].group].children.filter(childId => childId !== id)
            if (draft[draft[id].group].children.length === 0) {
              delete draft[draft[id].group]
            }
          }

          if (draft[id].type === 'character') {
            let attachableIds = Object.values(draft).filter(obj => obj.attachToId === id).map(obj => obj.id)
            for (let attachableId of attachableIds) {
              delete draft[attachableId]
            }
          }
      
          delete draft[id]
        }
    
        return withDisplayNames(draft)
  
      case 'GROUP_OBJECTS':
        if (
            action.payload.ids == null ||
            action.payload.ids.length === 0
        ) return
    
        draft[action.payload.groupId] = {
          id: action.payload.groupId,
          name: 'Group',
          type: 'group',
          visible: true,
          children: action.payload.ids
        }
    
        action.payload.ids.forEach((childId) => draft[childId].group = action.payload.groupId)
    
        return withDisplayNames(draft)
  
      case 'UNGROUP_OBJECTS':
        if (
            action.payload.ids == null ||
            action.payload.ids.length === 0 ||
            action.payload.groupId == null
        ) return
        
        const groupKey = action.payload.groupId
        const group = draft[groupKey]
        const selectedGroupItems = action.payload.ids
    
        if (group) {
          /** Ungroup items */
          draft[groupKey].children = draft[groupKey].children.filter((childId) => {
            if (draft[childId] && selectedGroupItems.indexOf(childId) !== -1) {
              draft[childId].group = null
          
              return false
            }
        
            return true
          })
      
          if (draft[groupKey].children.length === 0) {
            /** if we select all the children of group then remove group*/
        
            delete draft[groupKey]
          }
        }
    
        return withDisplayNames(draft)
  
      case 'MERGE_GROUPS':
        if (
            action.payload.ids == null ||
            action.payload.ids.length === 0 ||
            action.payload.groupIds == null ||
            action.payload.groupIds.length === 0
        ) return
  
        let destGroup = draft[action.payload.groupIds[0]]
  
        action.payload.groupIds.forEach((group, index) => {
          /** Skip the first group that we want to merge items in */
          if (index === 0 || !draft[group]) return
    
          draft[group].children.forEach((childId) => {
            if (draft[childId]) {
              /** Append child to the first selected group */
              draft[childId].group = destGroup.id
              if (destGroup.children.indexOf(childId) === -1) destGroup.children.push(childId)
            }
          })
    
          delete draft[group]
        })
  
        /** Add items that doesn't have a group to the main group */
        action.payload.ids.forEach((childId) => {
          draft[childId].group = destGroup.id
          if (destGroup.children.indexOf(childId) === -1) destGroup.children.push(childId)
        })
    
        return withDisplayNames(draft)

      case 'UPDATE_OBJECT':
        if (draft[action.payload.id] == null) return
        updateObject(
          draft[action.payload.id],
          state[action.payload.id],
          action.payload,
          { models: initialState.models }
        )
        return

      case 'UPDATE_OBJECTS':
        for (let [ key, value ] of Object.entries(action.payload)) {
          if (draft[key] == null) return

          if (draft[key].locked) continue
          draft[key].x = value.x ? value.x : draft[key].x
          draft[key].y = value.y ? value.y : draft[key].y
          draft[key].z = value.z ? value.z : draft[key].z
          draft[key].rotation = value.rotation ? value.rotation : draft[key].rotation 
        }
        return

      case 'DUPLICATE_OBJECTS':
        for (let n in action.payload.ids) {
          let srcId = action.payload.ids[n]
          let dstId = action.payload.newIds[n]
 
          let offsetX = 0.5 // (Math.random() * 2 - 1)
          let offsetY = 0.5 // (Math.random() * 2 - 1)

          if (state[srcId]) {
            let source = state[srcId]

            draft[dstId] = {
              ...source,
              name: source.name == null ? null : source.name + ' copy',
              x: source.x + offsetX,
              y: source.y + offsetY,
              z: source.z,
              id: dstId
            }
            
            if (source.group && state[source.group] && state[source.group].children) {
              draft[source.group].children.push(dstId)
            }
            
            if (source.children) {
              draft[dstId].children = []
              source.children.map((childId) => {
                let newDstId = THREE.Math.generateUUID()
                let sourceChild = state[childId]
  
                draft[newDstId] = {
                  ...sourceChild,
                  name: sourceChild.name == null ? null : sourceChild.name + ' copy',
                  x: sourceChild.x + offsetX,
                  y: sourceChild.y + offsetY,
                  z: sourceChild.z,
                  id: newDstId,
                  group: dstId
                }
  
                draft[dstId].children.push(newDstId)
              })
            }
          }
        }
        return withDisplayNames(draft)

      // update a single bone by name
      case 'UPDATE_CHARACTER_SKELETON':
        draft[action.payload.id].skeleton = draft[action.payload.id].skeleton || {}
        let rotation = action.payload.rotation
        if(draft[action.payload.id].skeleton[action.payload.name]) {
          draft[action.payload.id].skeleton[action.payload.name].rotation = !rotation ?
                                                         draft[action.payload.id].skeleton[action.payload.name].rotation :
                                                         { x: rotation.x, y: rotation.y, z: rotation.z }
        } else {
          draft[action.payload.id].skeleton[action.payload.name] = {
            rotation: action.payload.rotation
          }
        }

        // Check if handBone got same bones and update it if it does
        if(draft[action.payload.id].handSkeleton && draft[action.payload.id].handSkeleton[action.payload.name]) {
          draft[action.payload.id].handSkeleton[action.payload.name] = {
            rotation: action.payload.rotation
          }
        }
        return

      // update many bones from a skeleton object
      case 'UPDATE_CHARACTER_IK_SKELETON':
        if(!draft[action.payload.id]) return;
        draft[action.payload.id].skeleton = action.payload.skeleton.length ? draft[action.payload.id].skeleton : {}
        for (let bone of action.payload.skeleton) {
          let rotation = bone.rotation
          let position = bone.position
          let quaternion = bone.quaternion
          if(draft[action.payload.id].skeleton[bone.name]) {
            draft[action.payload.id].skeleton[bone.name].rotation = !rotation ? 
                                                                      draft[action.payload.id].skeleton[bone.name].rotation : 
                                                                      { x: rotation.x, y: rotation.y, z: rotation.z }
            draft[action.payload.id].skeleton[bone.name].position = !position ?
                                                                      draft[action.payload.id].skeleton[bone.name].position : 
                                                                      { x: position.x, y: position.y, z: position.z }
            draft[action.payload.id].skeleton[bone.name].quaternion = !quaternion ?
                                                                      draft[action.payload.id].skeleton[bone.name].quaternion : 
                                                                      { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w }                                                
          } else {
            draft[action.payload.id].skeleton[bone.name] = {}
            draft[action.payload.id].skeleton[bone.name].rotation = !rotation ? 
            {} : 
            { x: rotation.x, y: rotation.y, z: rotation.z }
            draft[action.payload.id].skeleton[bone.name].position = !position ?
            {} : 
            { x: position.x, y: position.y, z: position.z }
            draft[action.payload.id].skeleton[bone.name].quaternion = !quaternion ?
            {} : 
            { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w }
          }
          draft[action.payload.id].skeleton[bone.name].name = bone.name
        
        }
        return

      case 'UPDATE_CHARACTER_IK_POLETARGETS':
        draft[action.payload.id].poleTargets = draft[action.payload.id].poleTargets || {}
        for (let [ key, value ] of Object.entries(action.payload.poleTargets)) {
          draft[action.payload.id].poleTargets[key] = value
        }
        return

      case 'ATTACHMENTS_RELOCATE':
        let { src, dst } = action.payload
        for (let id in draft) {
          let sceneObject = draft[id]

          if (sceneObject.model === src) {
            sceneObject.model = dst
          }
        }
        return

      // When an Emotion preset is removed, also remove references to it in any Scene Object
      case 'DELETE_EMOTION_PRESET':
        for (let id in state) {
          if (state[id].emotionPresetId === action.payload.id) {
            delete draft[id].emotionPresetId
          }
        }
        return

      default:
        return
    }
  })
}


const metaReducer = (state = {}, action, appState) => {
  return produce(state, draft => {
    switch (action.type) {
      case 'LOAD_SCENE':
        draft.lastSavedHash = getHash(appState)
        return
      case 'UPDATE_SCENE_FROM_XR':
        // don't update lastSavedHash
        // SG will detect the unsaved changes and prompt user to save
        return

      case 'MARK_SAVED':
        draft.lastSavedHash = getHash(appState)
        return

      case 'SET_META_STORYBOARDER_FILE_PATH':
        draft.storyboarderFilePath = action.payload
        return

      default:
        return
    }
  })
}

const activeCameraReducer = (state = initialScene.activeCamera, action) => {
  return produce(state, draft => {
    switch (action.type) {
      case 'LOAD_SCENE':
      case 'UPDATE_SCENE_FROM_XR':
        return action.payload.activeCamera

      case 'SET_ACTIVE_CAMERA':
        return action.payload

      default:
        return
    }
  })
}

const selectedBoneReducer = (state = null, action) => {
  return produce(state, draft => {
    switch (action.type) {
      case 'LOAD_SCENE':
      case 'UPDATE_SCENE_FROM_XR':
        // clear selections
        return null

      // select a single object
      case 'SELECT_OBJECT':
        // de-select any currently selected bone
        return null

      case 'SELECT_BONE':
        return action.payload

      case 'DELETE_OBJECTS':
        // de-select any currently selected bone
        draft = null

      default:
        return
    }
  })
}

const worldReducer = (state = initialState.undoable.world, action) => {
  return produce(state, draft => {
    switch (action.type) {
      case 'LOAD_SCENE':
      case 'UPDATE_SCENE_FROM_XR':
        return R.pipe(
          migrateWorldLights,
          migrateWorldFog,
          migrateWorldShadingMode,
          migrateWorldEnvironmentGrayscale,
        )(action.payload.world)

      case 'UPDATE_WORLD':
        if (action.payload.hasOwnProperty('ground')) {
          draft.ground = action.payload.ground
        }
        if (action.payload.hasOwnProperty('backgroundColor')) {
          draft.backgroundColor = action.payload.backgroundColor
        }
        return

      case 'UPDATE_WORLD_ROOM':
        if (action.payload.hasOwnProperty('width')) { draft.room.width = action.payload.width }
        if (action.payload.hasOwnProperty('length')) { draft.room.length = action.payload.length }
        if (action.payload.hasOwnProperty('height')) { draft.room.height = action.payload.height }
        if (action.payload.hasOwnProperty('visible')) { draft.room.visible = action.payload.visible }
        return

      case 'UPDATE_WORLD_ENVIRONMENT':
        if (action.payload.hasOwnProperty('file')) {
          draft.environment.file = action.payload.file
        }
        if (action.payload.scale != null) {
          draft.environment.scale = action.payload.scale
        }
        if (action.payload.visible != null) {
          draft.environment.visible = action.payload.visible
        }
        if (action.payload.grayscale != null) {
          draft.environment.grayscale = action.payload.grayscale
        }
        if (action.payload.rotation != null) {
          draft.environment.rotation = action.payload.rotation
        }
        if (action.payload.x != null) {
          draft.environment.x = action.payload.x
        }
        if (action.payload.y != null) {
          draft.environment.y = action.payload.y
        }
        if (action.payload.z != null) {
          draft.environment.z = action.payload.z
        }
        if (action.payload.intensity != null) {
          draft.ambient.intensity = action.payload.intensity
        }
        if (action.payload.intensityDirectional != null) {
          draft.directional.intensity = action.payload.intensityDirectional
        }
        if (action.payload.rotationDirectional != null) {
          draft.directional.rotation = action.payload.rotationDirectional
        }
        if (action.payload.tiltDirectional != null) {
          draft.directional.tilt = action.payload.tiltDirectional
        }
        return

      case 'UPDATE_WORLD_FOG':
        if (action.payload.hasOwnProperty('visible')) {
          draft.fog.visible = action.payload.visible
        }
        if (action.payload.hasOwnProperty('far')) {
          draft.fog.far = action.payload.far
        }
        return

      case 'CYCLE_SHADING_MODE':
        let types = Object.values(ShadingType)

        let { shadingMode } = state

        let index = -1

        // if shadingMode has no value, or is invalid ...
        if (shadingMode == null || types.includes(shadingMode) == false) {
          // ... default to Outline
          index = types.indexOf(ShadingType.Outline)
        } else {
          index = types.indexOf(shadingMode)
          index = (index + 1) % types.length
        }

        draft.shadingMode = types[index]
        return

      default:
        return
    }
  })
}

const presetsReducer = (state = initialState.presets, action) => {
  return produce(state, draft => {
    switch (action.type) {
      case 'CREATE_SCENE_PRESET':
        draft.scenes[action.payload.id] = action.payload
        return

      case 'DELETE_SCENE_PRESET':
        delete draft.scenes[action.payload.id]
        return

      case 'UPDATE_SCENE_PRESET':
        // allow a null value for name
        if (action.payload.hasOwnProperty('name')) {
          draft.scenes[action.payload.id].name = action.payload.name
        }
        return

      case 'CREATE_CHARACTER_PRESET':
        draft.characters[action.payload.id] = action.payload
        return

      case 'CREATE_POSE_PRESET':
        draft.poses[action.payload.id] = action.payload
        return

      case 'DELETE_POSE_PRESET':
        delete draft.poses[action.payload.id]
        return


      case 'UPDATE_POSE_PRESET':
        // allow a null value for name
        if (action.payload.hasOwnProperty('name')) {
          draft.poses[action.payload.id].name = action.payload.name
        }
        return

      case 'CREATE_HAND_POSE_PRESET':
        draft.handPoses[action.payload.id] = action.payload
        return
      case 'DELETE_HAND_POSE_PRESET':
        delete draft.handPoses[action.payload.id]
        return        
      case 'CREATE_EMOTION_PRESET':
        draft.emotions[action.payload.id] = action.payload
        return
      case 'DELETE_EMOTION_PRESET':
        delete draft.emotions[action.payload.id]
        return
    }
  })
}

const mainReducer = (state/* = initialState*/, action) => {
  return produce(state, draft => {
    draft.lastAction.type = action.type

    switch (action.type) {
      case 'LOAD_SCENE':
        draft.mainViewCamera = 'live'
        return
      case 'UPDATE_SCENE_FROM_XR':
        // don't swap the camera
        return

      // case 'SET_INPUT_ACCEL':
      //   draft.input.accel = action.payload
      //   return
      //
      //   case 'SET_INPUT_MAG':
      //   draft.input.mag = action.payload
      //   return
      //
      //   case 'SET_INPUT_SENSOR':
      //   draft.input.sensor = action.payload
      //   return
      //
      // case 'SET_INPUT_DOWN':
      //   draft.input.down = action.payload
      //   return
      //
      // case 'SET_INPUT_MOUSEMODE':
      //   draft.input.mouseMode = action.payload
      //   return
      //
      // case 'SET_INPUT_ORBITMODE':
      //   draft.input.orbitMode = action.payload
      //   return

      case 'UPDATE_MODELS':
        draft.models = {
          ...state.models,
          ...action.payload
        }
        return

      case 'SET_ASPECT_RATIO':
        draft.aspectRatio = action.payload
        return
      case 'SET_CURRENT_LANGUAGE':
        draft.language = action.payload
        return

      case 'SET_MAIN_VIEW_CAMERA':
        draft.mainViewCamera = action.payload
        return

      case 'UPDATE_DEVICE':
        draft.devices[action.payload.id] = action.payload
        return

      case 'UPDATE_SERVER':
        // if (action.payload.uri) {
        //   console.log('shot-generator web client at', action.payload.uri)
        // }
        // if (action.payload.xrUri) {
        //   console.log('shot-generator XR client at', action.payload.xrUri)
        // }
        draft.server = { ...draft.server, ...action.payload }
        return

      case 'SET_BOARD':
        const { uid, shot, /* action, */ dialogue, notes } = action.payload
        draft.board = {
          uid,

          // used by BoardInspector
          shot,
          dialogue,
          action: action.payload.action,
          notes
        }
        return

      case 'TOGGLE_WORKSPACE_GUIDE':
        draft.workspace.guides[action.payload] = !draft.workspace.guides[action.payload]
        return

      case 'ATTACHMENTS_PENDING':
        draft.attachments[action.payload.id] = { status: 'NotAsked' }
        return
      case 'ATTACHMENTS_LOAD':
        draft.attachments[action.payload.id] = { status: 'Loading' }
        return
      case 'ATTACHMENTS_SUCCESS':
        draft.attachments[action.payload.id] = { status: 'Success', value: action.payload.value }
        return
      case 'ATTACHMENTS_ERROR':
        draft.attachments[action.payload.id] = { status: 'Error', error: action.payload.error }
        return

      case 'ATTACHMENTS_DELETE':
        delete draft.attachments[action.payload.id]
        return

      case 'UNDO_GROUP_START':
        batchGroupBy.start(action.payload)
        return

      case 'UNDO_GROUP_END':
        batchGroupBy.end(action.payload)
        return

      case 'MERGE_STATE':
        return merge(draft, action.payload)
    }
  })
}

const checksReducer = (state, action) => {
  return produce(state, draft => {
    switch (action.type) {
      case 'UPDATE_OBJECT':
        // ignore actions that are just changes to `loaded`
        if (action.payload.hasOwnProperty('loaded')) return

        let sceneObject = getSceneObjects(draft)[action.payload.id]
        
        if (sceneObject.type === 'character') {
          // unless characterPresetId was just set ...
          if (!action.payload.hasOwnProperty('characterPresetId')) {
            // ... detect change between state and preset
           // console.log("Checking character changes")
            checkForCharacterChanges(state, draft, action.payload.id)
          }

          // unless posePresetId was just set ...
          if (!action.payload.hasOwnProperty('posePresetId')) {
            // ... detect change between state and preset
            checkForSkeletonChanges(state, draft, action.payload.id)
          }

           // unless handPosePresetId was just set ...
          if (!action.payload.hasOwnProperty('handPosePresetId')) {
            // ... detect change between state and preset
            checkForHandSkeletonChanges(state, draft, action.payload.id)
          }
        }
        return

      // if we ever allow UPDATE_OBJECTS to change more stuff:
      // case 'UPDATE_OBJECTS':
        // if we ever allow UPDATE_OBJECTS to change character properties,
        // uncomment this:
        // checkForCharacterChanges(state, draft, key)

        // if we ever allow UPDATE_OBJECTS to change skeletons,
        // uncomment this:
        // checkForSkeletonChanges(state, draft, key)
        // return

      case 'UPDATE_CHARACTER_SKELETON':
        checkForSkeletonChanges(state, draft, action.payload.id)
        return

      case 'UPDATE_CHARACTER_IK_SKELETON':
        checkForSkeletonChanges(state, draft, action.payload.id)
        return

      // when we REDO, we are changing the entire state all at once
      // so, we gotta run all the checks
      case '@@redux-undo/REDO':
        for (let sceneObject of Object.values(getSceneObjects(draft))) {
          if (sceneObject.type === 'character') {
            checkForCharacterChanges(state, draft, sceneObject.id)
            checkForSkeletonChanges(state, draft, sceneObject.id)
          }
        }
        return

      default:
        return
    }
  })
}

const filterHistory = (action, currentState, previousHistory) => {
  // ignore `loaded` status updates
  if (action.type === 'UPDATE_OBJECT' && Object.keys(action.payload).includes('loaded')) {
    return false
  }

  return true
}

const undoableReducers = combineReducers({
  sceneObjects: sceneObjectsReducer,
  activeCamera: activeCameraReducer,
  world: worldReducer,
  selections: selectionsReducer,
  selectedBone: selectedBoneReducer,
  selectedAttachable: attachableSelectionsReducer
})

const undoableReducer = undoable(
  undoableReducers,
  {
    limit: 50,

    filter: filterHistory,

    // uncomment to automatically group any series of UPDATE_OBJECT or UPDATE_OBJECTS:
    // groupBy: batchGroupBy.init(['UPDATE_OBJECT', 'UPDATE_OBJECTS'])
    groupBy: batchGroupBy.init()
  }
)

const rootReducer = reduceReducers(
  initialState,

  mainReducer,
  
  (state, action) => {
    const presets = presetsReducer(state.presets, action)
  
    return (presets !== state.presets) ? { ...state, presets} : state
  },
  
  (state, action) => {
    const undoable = undoableReducer(state.undoable, action)
  
    return (undoable !== state.undoable) ? { ...state, undoable} : state
  },
  
  (state, action) => {
    const cameraShots = cameraShotsReducer(state.cameraShots, action)

    return (cameraShots !== state.cameraShots) ? { ...state, cameraShots} : state
  },

  checksReducer,

  // `meta` must run last, to calculate lastSavedHash
  (state, action) => {
    const meta = metaReducer(state.meta, action, state)
  
    return (meta !== state.meta) ? { ...state, meta} : state
  },
)

module.exports = {
  initialState,

  reducer: rootReducer,

  // internal actions
  _blockObject: id => ({ type: 'BLOCK_OBJECT', payload: id}),
  _unblockObject: id => ({ type: 'UNBLOCK_OBJECT', payload: id}),
  _unblockAll: id => ({ type: 'UNBLOCK_ALL' }),

  //
  //
  // action creators 
  //
  deselectObject: id => ({ type: 'DESELECT_OBJECT', payload: id }),
  
  selectObject: id => ({ type: 'SELECT_OBJECT', payload: id }),
  selectObjectToggle: id => ({ type: 'SELECT_OBJECT_TOGGLE', payload: id }),

  selectBone: id => ({ type: 'SELECT_BONE', payload: id }),
  selectAttachable: payload => ({ type: 'SELECT_ATTACHABLE', payload }),
  deselectAttachable: () => ({ type: 'DESELECT_ATTACHABLE' }),

  createObject: values => ({ type: 'CREATE_OBJECT', payload: values }),
  createObjects: objects => ({ type: 'CREATE_OBJECTS', payload: {objects} }),
  updateObject: (id, values) => ({ type: 'UPDATE_OBJECT', payload: { id, ...values } }),

  // batch update
  updateObjects: payload => ({ type: 'UPDATE_OBJECTS', payload }),

  deleteObjects: ids => ({ type: 'DELETE_OBJECTS', payload: { ids } }),
  groupObjects: ids => ({
    type: 'GROUP_OBJECTS',
    payload: {
      groupId: THREE.Math.generateUUID(),
      ids
    }
  }),
  ungroupObjects: (groupId, ids) => ({
    type: 'UNGROUP_OBJECTS',
    payload: {
      groupId,
      ids
    }
  }),
  mergeGroups: (groupIds, ids) => ({
    type: 'MERGE_GROUPS',
    payload: {
      groupIds,
      ids
    }
  }),

  duplicateObjects: (ids, newIds) => ({ type: 'DUPLICATE_OBJECTS', payload: { ids, newIds } }),

  setMainViewCamera: name => ({ type: 'SET_MAIN_VIEW_CAMERA', payload: name }),

  cycleShadingMode: () => ({ type: 'CYCLE_SHADING_MODE' }),
  
  setCameraShot: (cameraId, values) => ({ type: 'SET_CAMERA_SHOT', payload: { cameraId, ...values } }),

  loadScene: data => ({ type: 'LOAD_SCENE', payload: data }),
  updateSceneFromXR: data => ({ type: 'UPDATE_SCENE_FROM_XR', payload: data }),

  updateCharacterSkeleton: ({ id, name, rotation }) => ({
    type: 'UPDATE_CHARACTER_SKELETON',
    payload: { id, name, rotation }
  }),

  updateCharacterIkSkeleton: ({ id, skeleton }) => ({
    type: 'UPDATE_CHARACTER_IK_SKELETON',
    payload: { id, skeleton }
  }),

  updateCharacterPoleTargets: ({ id, poleTargets }) => ({
    type: 'UPDATE_CHARACTER_IK_POLETARGETS',
    payload: { id, poleTargets }
  }),

  setActiveCamera: id => ({ type: 'SET_ACTIVE_CAMERA', payload: id }),

  resetScene: () => ({
    type: 'LOAD_SCENE',
    payload: {
      world: initialState.undoable.world,
      sceneObjects: initialState.undoable.sceneObjects,
      activeCamera: initialState.undoable.activeCamera
    }
  }),

  createScenePreset: payload => ({ type: 'CREATE_SCENE_PRESET', payload }),
  updateScenePreset: (id, values) => ({ type: 'UPDATE_SCENE_PRESET', payload: { id, ...values} }),
  deleteScenePreset: id => ({ type: 'DELETE_SCENE_PRESET', payload: { id } }),

  createCharacterPreset: payload => ({ type: 'CREATE_CHARACTER_PRESET', payload }),

  createPosePreset: payload => ({ type: 'CREATE_POSE_PRESET', payload }),
  createHandPosePreset: payload => ({ type: 'CREATE_HAND_POSE_PRESET', payload }),
  createEmotionPreset: payload => ({ type: 'CREATE_EMOTION_PRESET', payload }),
  deleteEmotionPreset: id => ({ type: 'DELETE_EMOTION_PRESET', payload: { id } }),
  updatePosePreset: (id, values) => ({ type: 'UPDATE_POSE_PRESET', payload: { id, ...values} }),
  deletePosePreset: id => ({ type: 'DELETE_POSE_PRESET', payload: { id } }),
  deleteHandPosePreset: id => ({ type: 'DELETE_HAND_POSE_PRESET', payload: { id } }),

  updateWorld: payload => ({ type: 'UPDATE_WORLD', payload }),
  updateWorldRoom: payload => ({ type: 'UPDATE_WORLD_ROOM', payload }),
  updateWorldEnvironment: payload => ({ type: 'UPDATE_WORLD_ENVIRONMENT', payload }),
  updateWorldFog: payload => ({ type: 'UPDATE_WORLD_FOG', payload }),

  updateDevice: (id, values) => ({ type: 'UPDATE_DEVICE', payload: { id, ...values } }),

  updateServer: payload => ({ type: 'UPDATE_SERVER', payload }),

  setBoard: payload => ({ type: 'SET_BOARD', payload }),

  markSaved: () => ({ type: 'MARK_SAVED' }),

  toggleWorkspaceGuide: payload => ({ type: 'TOGGLE_WORKSPACE_GUIDE', payload }),

  undoGroupStart: payload => ({ type: 'UNDO_GROUP_START', payload }),
  undoGroupEnd: payload => ({ type: 'UNDO_GROUP_END', payload }),
  
  mergeState: payload => ({ type: 'MERGE_STATE', payload }),

  //
  //
  // selectors
  //
  getSceneObjects,
  getSelections,
  getActiveCamera,
  getSelectedBone,
  getWorld,

  getSerializedState,
  getSelectedAttachable,

  getIsSceneDirty,
  getHash,
  getSceneObjectIds,

  getDefaultPosePreset: () => initialState.presets.poses['79BBBD0D-6BA2-4D84-9B71-EE661AB6E5AE']
}
