const THREE = require('three')

const React = require('react')
const { useRef, useEffect, useState } = React

const BoundingBoxHelper = require('./BoundingBoxHelper')
const BonesHelper = require('./BonesHelper')

const debounce = require('lodash.debounce')

// character needs:
//   mesh
//   boundingBoxHelper (boundary box)
// scene needs:
//   activeBonesHelper (for active character)

const updateBoundingBoxHelper = ( aabb, aabbHelper ) => {
  aabb.getCenter( aabbHelper.position )
  aabb.getSize( aabbHelper.scale )
}

let updateBoundingBox = (object, aabb, aabbHelper) => {
  // as currently written, updateAABB can't get the information it needs until
  // after the new bone position (or animation) has been rendered once.
  // so we wait a single frame ...
  requestAnimationFrame(() => {
    // ... and then calculate the bounding box and update in place
    updateAABB( object, aabb )
    updateBoundingBoxHelper( aabb, aabbHelper )
  })
}

const Character = React.memo(({ scene, id, type, remoteInput, characterModels, isSelected, selectedBone, camera, updateCharacterSkeleton, updateObject, ...props }) => {
  let object = useRef(null)
  let aabb = useRef(null)
  let aabbHelper = useRef(null)
  let boundingBoxUpdater = useRef(debounce(updateBoundingBox, 250, { leading: true }))

  let isRotating = useRef(false)
  let startingDeviceRotation = useRef(null)
  let startingObjectRotation = useRef(null)
  let startingGlobalRotation = useRef(null)

  const cloneAnimated = ( source ) => {

    var cloneLookup = new Map()
    var clone = source.clone()

    parallelTraverse( source, clone, function ( sourceNode, clonedNode ) {
      cloneLookup.set( sourceNode, clonedNode )
    } )

    source.traverse( function ( sourceMesh ) {
      if ( ! sourceMesh.isSkinnedMesh ) return
      var sourceBones = sourceMesh.skeleton.bones
      var clonedMesh = cloneLookup.get( sourceMesh )
      clonedMesh.skeleton = sourceMesh.skeleton.clone()
      clonedMesh.skeleton.bones = sourceBones.map( function ( sourceBone ) {
        if ( ! cloneLookup.has( sourceBone ) ) {
          throw new Error( 'THREE.AnimationUtils: Required bones are not descendants of the given object.' )
        }
        return cloneLookup.get( sourceBone )
      } )
      clonedMesh.bind( clonedMesh.skeleton, sourceMesh.bindMatrix )
    } )

    return clone
  }

  const parallelTraverse = ( a, b, callback ) => {
    callback( a, b )
    for ( var i = 0; i < a.children.length; i ++ ) {
      parallelTraverse( a.children[ i ], b.children[ i ], callback )
    }
  }

  const updateSkeleton = () => {
    let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]
    skel.skeleton.pose()

    if (props.skeleton) {
      for (let name in props.skeleton) {
        let bone = skel.skeleton.getBoneByName(name)
        if (bone) {
          bone.rotation.x = props.skeleton[name].rotation.x
          bone.rotation.y = props.skeleton[name].rotation.y
          bone.rotation.z = props.skeleton[name].rotation.z
        }
      }
    }
  }

  useEffect(() => {
    console.log(type, id, 'add')
    //console.log('\tusing model', characterModels[props.model])

    let cloned = cloneAnimated(characterModels[props.model])
    //let cloned = characterModels[props.model]
    object.current = cloned
    object.current.originalHeight = characterModels[props.model].originalHeight
    let mat = cloned.children[0].material ? cloned.children[0].material.clone() : cloned.children[1].material.clone()
    object.current.material = mat

    //   MULTI MATERIALS
    // object.current.material = object.current.material.map(material => material.clone())

    object.current.userData.id = id
    object.current.userData.type = type

    object.current.scale.set( characterModels[props.model].scale.x, characterModels[props.model].scale.y, characterModels[props.model].scale.z )
    object.current.rotation.set( characterModels[props.model].rotation.x, characterModels[props.model].rotation.y, characterModels[props.model].rotation.z )

    scene.add( object.current )

    // initialize the bounding box helper
    aabb.current = new THREE.Box3()
    let geometry = new THREE.BoxGeometry( 1, 1, 1 )
    let material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } )
    material.visible = false
    aabbHelper.current = new BoundingBoxHelper( object.current, geometry, material )

    scene.add( aabbHelper.current )

    requestAnimationFrame(() => {
      boundingBoxUpdater.current( object.current, aabb.current, aabbHelper.current )

    })

    return function cleanup () {
      console.log(type, id, 'remove')
      if (object.current) {
        //scene.remove(object.current.bonesHelper)
        scene.remove(object.current)
        object.current = null
        scene.remove(aabbHelper.current)
        aabbHelper.current = null

        aabb.current = null
      }
    }
  }, [props.model])

  //
  // updaters
  //
  // FIXME frame delay between redux update and react render here
  // FIXME use a faster AABB calculation method
  //
  useEffect(() => {
    if (object.current) {
      object.current.position.x = props.x
      object.current.position.z = props.y
      object.current.position.y = props.z
      boundingBoxUpdater.current( object.current, aabb.current, aabbHelper.current )
    }
  }, [props.model, props.x, props.y, props.z])

  useEffect(() => {
    if (object.current) {
      object.current.visible = props.visible
      if (props.visible) {
        boundingBoxUpdater.current( object.current, aabb.current, aabbHelper.current )
        aabbHelper.current.visible = true
      } else {
        aabbHelper.current.visible = false
      }
    }
  }, [props.model, props.visible])

  useEffect(() => {
    if (object.current) {
      object.current.rotation.y = props.rotation
      boundingBoxUpdater.current( object.current, aabb.current, aabbHelper.current )
    }
  }, [props.model, props.rotation])

  useEffect(() => {
    console.log(type, id, 'skeleton')
    updateSkeleton()
    boundingBoxUpdater.current( object.current, aabb.current, aabbHelper.current )
  }, [props.model, props.skeleton])

  useEffect(() => {
    if (object.current) {
      // FIXME hardcoded
      // let bbox = new THREE.Box3().setFromObject( object.current )

      height = object.current.originalHeight
      let scale = props.height / height

      object.current.scale.set( scale, scale, scale )
      boundingBoxUpdater.current( object.current, aabb.current, aabbHelper.current )
    }
  }, [props.model, props.height, props.skeleton])

  useEffect(() => {
    if (object.current) {
      // adjust head proportionally
      let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]

      let headBone = skel.skeleton.getBoneByName('mixamorigHead')
      // FIXME hardcoded
      let baseHeight = 1.6256
      let baseHeadScale = baseHeight / props.height

      //head bone
      headBone.scale.setScalar( baseHeadScale )
      headBone.scale.setScalar( props.headScale )
      boundingBoxUpdater.current( object.current, aabb.current, aabbHelper.current )
    }
  }, [props.model, props.headScale, props.skeleton])

  useEffect(() => {
    // Morphs are changing
    let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]

    //console.log( '\tmorphTargetDictionary', skel.morphTargetDictionary )

    skel.morphTargetInfluences[ 0 ] = props.morphTargets.mesomorphic
    skel.morphTargetInfluences[ 1 ] = props.morphTargets.ectomorphic
    skel.morphTargetInfluences[ 2 ] = props.morphTargets.endomorphic

  }, [props.model, props.morphTargets])

  useEffect(() => {
    // handle selection/unselection
    let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]

    if ( skel.material.length > 0 ) {
      skel.material.forEach(material => {
        material.userData.outlineParameters =
          isSelected
            ? {
              thickness: 0.015,
              color: [ 0.9, 0, 0 ]
            }
           : {
             thickness: 0.009,
             color: [ 0, 0, 0 ],
           }
      })
    } else {
      skel.material.userData.outlineParameters =
        isSelected
          ? {
            thickness: 0.015,
            color: [ 0.9, 0, 0 ]
          }
         : {
           thickness: 0.009,
           color: [ 0, 0, 0 ],
         }
    }
  }, [props.model, isSelected])

  useEffect(() => {
    if (!isSelected) return

    if (remoteInput.mouseMode) return

    // console.log('**** Character camera is', camera)

    let realTarget
    if (selectedBone) {
      // target = object.current.skeleton.getBoneByName(selectedBone)
      let skel = (object.current.children[0] instanceof THREE.Mesh) ? object.current.children[0] : object.current.children[1]

      realTarget = skel.skeleton.bones.find(bone => bone.uuid == selectedBone) || object.current
    } else {
      realTarget = object.current
    }
    let target = new THREE.Object3D()
    target.rotation.copy(realTarget.rotation)
    target.isBone = realTarget.isBone
    target.parent = realTarget.parent
    target.name = realTarget.name
    target.userData = realTarget.userData

    if (remoteInput.down) {
      if (target) {
        let [ alpha, beta, gamma ] = remoteInput.mag.map(THREE.Math.degToRad)

        if (!isRotating.current) {
          isRotating.current = true
          startingObjectRotation.current ={
            x: target.rotation.x,
            y: target.rotation.y,
            z: target.rotation.z
          }

          startingDeviceRotation.current = {
            alpha: alpha,
            beta: beta,
            gamma: gamma
          }

          startingGlobalRotation.current = {
            quaternion: realTarget.getWorldQuaternion()
          }
        }

        let startingDeviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(startingDeviceRotation.current.beta, startingDeviceRotation.current.alpha, -startingDeviceRotation.current.gamma, 'YXZ')).multiply(new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)))
        let tempQ = startingGlobalRotation.current.quaternion.clone()
        let cameraQuaternion = camera.quaternion.clone();
        let currentMainRotation = object.current.quaternion.clone()
        let deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha, -gamma, 'YXZ')).multiply(new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)))
        if (target.isBone)
        {
          // let w = 0.5,
          //   x = -0.5,
          //   y = -0.5,
          //   z = -0.5
          let w = 0,
              x = 0,
              y = 0,
              z = 1
          startingDeviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(startingDeviceRotation.current.beta, startingDeviceRotation.current.alpha, -startingDeviceRotation.current.gamma, 'YXZ')).multiply(new THREE.Quaternion(w, x, y, z))
          deviceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, alpha, -gamma, 'YXZ')).multiply(new THREE.Quaternion(w, x, y, z))
        }

        //let inversedRotation = new THREE.Quaternion(w, x, y, z)
        var parentWorldQuaternion = realTarget.parent.getWorldQuaternion(parentWorldQuaternion).clone()
        let startingObjectQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(startingObjectRotation.current.x,startingObjectRotation.current.y,startingObjectRotation.current.z))

        startingDeviceQuaternion.multiply(cameraQuaternion.clone())
        deviceQuaternion.multiply(cameraQuaternion.clone())

        // startingDeviceQuaternion.multiply( parentWorldQuaternion.clone() )
        // deviceQuaternion.multiply( parentWorldQuaternion.clone() )

        let deviceDifference = startingDeviceQuaternion.clone().inverse().multiply(deviceQuaternion)

        if (target.isBone)
        {
          t = new THREE.Vector3()
          q = new THREE.Quaternion()
          s = new THREE.Vector3()
          //deviceDifference.multiply ( parentWorldQuaternion.clone().inverse() )
          //tempQ.multiply( parentWorldQuaternion.clone() )
          tempQ.multiply( deviceDifference )
          tempQ.multiply( parentWorldQuaternion.clone().inverse() )

          target.quaternion.copy(tempQ)

        }
        cameraQuaternion = camera.quaternion.clone();

        let q1 = startingDeviceQuaternion.clone().normalize()//.multiply(camera.quaternion);
        let q2 = deviceQuaternion.clone().normalize()//.multiply(camera.quaternion);
        let r = q2.multiply(q1.clone().inverse())//.multiply(helperObj.quaternion);

        // OLD ROTATION ON AXIS
        // let deviceDifference = startingDeviceQuaternion.clone().inverse().multiply(deviceQuaternion)
        // startingObjectQuaternion.multiply(deviceDifference)
        // target.quaternion.copy(startingObjectQuaternion)

        if (selectedBone) {
          updateCharacterSkeleton({
            id,
            name: target.name,
            rotation: {
              x: target.rotation.x,
              y: target.rotation.y,
              z: target.rotation.z
            }
          })
        } else {
          updateObject(target.userData.id, {
            rotation: target.rotation.y
          })
        }
      }
    } else {
      isRotating.current = false
    }
  }, [remoteInput])

  return null
})

// via https://discourse.threejs.org/t/object-bounds-not-updated-with-animation/3749/12
// see also: https://gamedev.stackexchange.com/a/43996
const updateAABB = function ( ) {
  return function updateAABB( skinnedMesh, aabb ) {

    let vertex = new THREE.Vector3()
    let temp = new THREE.Vector3()
    let skinned = new THREE.Vector3()
    let skinIndices = new THREE.Vector4()
    let skinWeights = new THREE.Vector4()
    let boneMatrix = new THREE.Matrix4()

    let skel = (skinnedMesh.children[0] instanceof THREE.Mesh) ? skinnedMesh.children[0] : skinnedMesh.children[1]

    var skeleton = skel.skeleton
    var boneMatrices = skeleton.boneMatrices
    var geometry = skel.geometry

    var index = geometry.index
    var position = geometry.attributes.position
    var skinIndex = geometry.attributes.skinIndex
    var skinWeight = geometry.attributes.skinWeight

    var bindMatrix = skel.bindMatrix
    var bindMatrixInverse = skel.bindMatrixInverse

    var i, j, si, sw

    aabb.makeEmpty()

    for ( i = 0; i < position.count; i ++ ) {

      vertex.fromBufferAttribute( position, i )
      skinIndices.fromBufferAttribute( skinIndex, i )
      skinWeights.fromBufferAttribute( skinWeight, i )

      // the following code section is normally implemented in the vertex shader

      vertex.applyMatrix4( bindMatrix ) // transform to bind space
      skinned.set( 0, 0, 0 )

      for ( j = 0; j < 4; j ++ ) {

        si = skinIndices.getComponent( j )
        sw = skinWeights.getComponent( j )
        boneMatrix.fromArray( boneMatrices, si * 16 )

        // weighted vertex transformation

        temp.copy( vertex ).applyMatrix4( boneMatrix ).multiplyScalar( sw )
        skinned.add( temp )

      }

      skinned.applyMatrix4( bindMatrixInverse ) // back to local space

      // expand aabb

      aabb.expandByPoint( skinned )

    }
    aabb.applyMatrix4( skinnedMesh.matrixWorld )
  }
}()


module.exports = Character
