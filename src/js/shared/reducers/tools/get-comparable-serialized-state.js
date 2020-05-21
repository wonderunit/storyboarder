
const { map } = require('ramda')

const simplifyCharacter = sceneObject =>
  ({
    ...sceneObject,
    // if there's a skeleton
    skeleton: sceneObject.skeleton != null
      ? map(bone => ({name: bone.name, rotation: bone.rotation}), sceneObject.skeleton)
      : sceneObject.skeleton
  })

const simplifyIfCharacter = sceneObject =>
  sceneObject.type === 'character'
    ? simplifyCharacter(sceneObject)
    : sceneObject

// return only the stuff we want to compare for hashing purposes
const getComparableSerializedState = state => ({
  ...state,
  sceneObjects: map(simplifyIfCharacter, state.sceneObjects)
})

module.exports = getComparableSerializedState