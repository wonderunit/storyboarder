/**
 Based on THREE.SkeletonHelper

 * @author Sean Griffin / http://twitter.com/sgrif
 * @author Michael Guerrero / http://realitymeltdown.com
 * @author mrdoob / http://mrdoob.com/
 * @author ikerr / http://verold.com
 * @author Mugen87 / https://github.com/Mugen87
 */

// REFERENCE
// Animation Bounding Boxes:
// - https://jsfiddle.net/fnjkeg9x/1/
// - https://discourse.threejs.org/t/object-bounds-not-updated-with-animation/3749/12

const THREE = require('three')

// const ModelLoader = require('../services/model-loader')

// const {
  
//   createPosePreset,
  
// } = require('../shared/reducers/shot-generator')

const { LineSegments } = THREE
const { Matrix4 } = THREE
const { VertexColors } = THREE
const { LineBasicMaterial } = THREE
const { Color } = THREE
const { Vector3 } = THREE
const { Vector4 } = THREE
const { Quaternion } = THREE
const { BufferGeometry } = THREE
const { Float32BufferAttribute } = THREE
const { Object3D } = THREE
const { SkinnedMesh } = THREE

const getVertexForBones = ( bufferPositions, bufferSkinIndices, bufferSkinWeights ) => {
    
  let bonesInfluenceVertices = []
  
  for ( var i = 0; i < bufferSkinIndices.count; i++ ) {
    let boneIndex = new Vector4()
    let vertex = new Vector3()
    let vertWeight = new Vector4()

    vertex.fromBufferAttribute( bufferPositions, i )
    boneIndex.fromBufferAttribute( bufferSkinIndices, i )
    vertWeight.fromBufferAttribute( bufferSkinWeights, i )
    
    if (vertWeight.x > 0.01 ) {
      if (bonesInfluenceVertices[boneIndex.x] ) {
        bonesInfluenceVertices[boneIndex.x].push( 
          {
            vertex,
            weight: vertWeight.x     
          })
      } else {
        bonesInfluenceVertices[boneIndex.x] = [{
          vertex,
          weight: vertWeight.x     
        }]
      }
    }

    if (vertWeight.y > 0.01) {
      if (bonesInfluenceVertices[boneIndex.y]) {
        bonesInfluenceVertices[boneIndex.y].push( {
          vertex,
          weight: vertWeight.y     
        } )
      } else {
        bonesInfluenceVertices[boneIndex.y] = [{
          vertex,
          weight: vertWeight.x     
        }]      
      }
    }

    if (vertWeight.z > 0.01) {
      if (bonesInfluenceVertices[boneIndex.z]) {
        bonesInfluenceVertices[boneIndex.z].push( {
          vertex,
          weight: vertWeight.z     
        } )
      } else {
        bonesInfluenceVertices[boneIndex.z] = [{
          vertex,
          weight: vertWeight.z     
        }]      
      }
    }

    if (vertWeight.w > 0.01) {
      if (bonesInfluenceVertices[boneIndex.w]) {
        bonesInfluenceVertices[boneIndex.w].push( {
          vertex,
          weight: vertWeight.w     
        } )
      } else {
        bonesInfluenceVertices[boneIndex.w] = [{
          vertex,
          weight: vertWeight.w     
        }]      
      }
    }

  }
  return bonesInfluenceVertices  
}

let once = true

const calcMedianDistance = (fixedposition, allverts, object, inverdsedMatrix, bone, multiply, boneIndex, skinnedMesh) => {
  let allDistances = []
  let median = 0
  let maxDist = 0
  let minDist = 10000000;
  let tempObj = new THREE.Object3D()
  let plane

  let midPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2,0.2),
    new THREE.MeshBasicMaterial({
      color: 0x4400ff,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.5,
      flatShading: true,
      side: THREE.DoubleSide
    })
  )
  midPlane.position.set(fixedposition.x, fixedposition.y, fixedposition.z)
  midPlane.quaternion.copy(bone.quaternion)
  midPlane.quaternion.setFromRotationMatrix( bone.matrixWorld )
  midPlane.quaternion.multiply(new Quaternion(-Math.sqrt(0.5), 0 , 0, -Math.sqrt(0.5)))
  midPlane.updateMatrix()

  plane = new THREE.Plane();
  var dir = new THREE.Vector3(0,1,0);
  var centroid = new Vector3( 0, 0, -1 ).applyQuaternion( midPlane.quaternion )
  //centroid.applyQuaternion(inverdsedMatrix.quaternion)
  //centroid.applyMatrix4(inverdsedMatrix)
  plane.setFromNormalAndCoplanarPoint(centroid, dir).normalize();

  let boneProjection = new Vector3()
  plane.projectPoint(fixedposition, boneProjection)
  // Getting the difference from mid point to where the points are projected (the normalized plane)
  let difference = new Vector3().subVectors(fixedposition, boneProjection)
  
  let midPoint = new THREE.Mesh(
    new THREE.BoxBufferGeometry(0.05,0.05,0.05),
    new THREE.MeshBasicMaterial({
      color: 0x4400ff,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.5,
      flatShading: true,
      side: THREE.DoubleSide
    })
  )
  midPoint.position.set(fixedposition.x, fixedposition.y, fixedposition.z)
  
  //var helper = new THREE.PlaneHelper( plane, 1, 0xffff00 );
  //helper.updateMatrix()
  //if (once) tempObj.add( helper )
  if (once) tempObj.add(midPlane)
  if (once) tempObj.add(midPoint)

  for (let vect of allverts)
  {
    let vect2 = vect.vertex.clone().applyMatrix4(inverdsedMatrix)
    let vect3 = new Vector3()
    
    // Getting the projections and adding the difference
    plane.projectPoint(vect2, vect3)
    vect3.addVectors(vect3, difference)
    
    let distanceFromOriginal = vect3.distanceTo(vect2)
    if ( distanceFromOriginal<0.02 * multiply )
    {
      allDistances.push(fixedposition.distanceTo(vect3))

      if (once) {  // add a small cube when debugging to see which vertexes are used for calculations
        let vert = new THREE.Mesh(
          new THREE.BoxBufferGeometry(0.01,0.01,0.01),
          new THREE.MeshBasicMaterial({
            color: 0xff0044,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            opacity: 0.5,
            flatShading: true
          })
        )
        vert.position.set(vect3.x, vect3.y, vect3.z)
        tempObj.add(vert)
      }
      median += allDistances[allDistances.length-1]
      if (allDistances[allDistances.length-1] > maxDist) maxDist = allDistances[allDistances.length-1] 
      if (allDistances[allDistances.length-1] < minDist) minDist = allDistances[allDistances.length-1] 
    }
  }

  median = median / allDistances.length
  return {
    median: maxDist,
    object: tempObj
  }
}

const getPointInBetweenByPerc = (pointA, pointB, percentage) => {
  var dir = pointB.clone().sub(pointA);
  var len = dir.length();
  dir = dir.normalize().multiplyScalar(len*percentage);
  return pointA.clone().add(dir);
}


function getBoneList( object ) {
  var boneList = []

  if ( object && object.isBone ) {
    boneList.push( object )
  }

  for ( var i = 0; i < object.children.length; i ++ ) {
    boneList.push.apply( boneList, getBoneList( object.children[ i ] ) )
  }

  return boneList
}

function filter_array(test_array) {
    let index = -1
    const arr_length = test_array ? test_array.length : 0
    let resIndex = -1
    const result = []

    while (++index < arr_length) {
        const value = test_array[index]

        if (value) {
            result[++resIndex] = value
        }
    }

    return result
}

let cache = {}

function BonesHelper( object, object3D, { boneLengthScale = 1, cacheKey } ) {
  Object3D.call( this )
  //ModelLoader.isCustomModel(model)
  let sknMesh = object3D.children.find(child => child instanceof THREE.SkinnedMesh) ||
    object3D.children[0].children.find(child => child instanceof THREE.SkinnedMesh)
  

  // console.log('new BonesHelper', 'cacheKey:', cacheKey)
  let skeleton_clone
  if (!cache[cacheKey]) {
    console.log('adding to cache', cacheKey)
    cache[cacheKey] = cloneSkinned( object3D )
  }
  skeleton_clone = cache[cacheKey]

  let zeroedSkinnedMesh = skeleton_clone.children.find(child => child instanceof THREE.SkinnedMesh) ||
    skeleton_clone.children[0].children.find(child => child instanceof THREE.SkinnedMesh)
  
  zeroedSkinnedMesh.skeleton.pose()

  //sknMesh.savePose(createPosePreset)
  sknMesh.savePose(zeroedSkinnedMesh)
  
  let skinIndex = sknMesh.geometry.attributes.skinIndex
  let vertexPositions = sknMesh.geometry.attributes.position
  let skinWeights = sknMesh.geometry.attributes.skinWeight

  let vertexDistanceMyltiplyFactor = 1
  var bbox = new THREE.Box3().setFromObject(object3D);
  let height = bbox.max.y - bbox.min.y
  if (height>2) vertexDistanceMyltiplyFactor = height * 10
  let bones = getBoneList( object );
  this.cones = []

  this.hit_meshes = []

  let boneMatrix = new Matrix4()
  let matrixWorldInv = new Matrix4()
  let boneCounter = 0
  matrixWorldInv.getInverse( object.matrixWorld )
  
  let bonesContainingVerts = getVertexForBones(vertexPositions, skinIndex, skinWeights, vertexDistanceMyltiplyFactor)
  let traversedBones = []

  for (var ii = 0; ii< bones.length; ii++) {
    var bone = bones[ii]

    var jj = 0
    let posA = new Vector3()
    let posB = new Vector3()
    let scaleA = new Vector3()
    let scaleB = new Vector3()
    let scaleC = new Vector3()

    while (bone.children && bone.children[jj] && bone.children[jj].isBone  )
    {
      if (traversedBones.includes(bone)) {

        let currentCreated = traversedBones[traversedBones.indexOf(bone)]
        this.remove(currentCreated)
        this.remove(currentCreated.hitBone)
        this.remove(currentCreated.helper)
        traversedBones[traversedBones.indexOf(bone)] = bone
      }
      else {
        traversedBones.push(bone)
      }

      let boneIndex = traversedBones.indexOf(bone)

      scaleA.setFromMatrixScale(boneMatrix)
      scaleB.setFromMatrixScale(matrixWorldInv)
      scaleC.setFromMatrixScale(object.matrixWorld)

      posA.setFromMatrixPosition(boneMatrix.multiplyMatrices(matrixWorldInv, bone.matrixWorld))//.multiplyScalar(1/scaleA.x)
      posB.setFromMatrixPosition(boneMatrix.multiplyMatrices(matrixWorldInv, bone.children[jj].matrixWorld))//.multiplyScalar(1/scaleA.x)
      //once = ii > 10 && ii < 20 ? true : false
      // set to true and remove false to add the intersection verts (debugging)
      //once = true
      //if (once) console.log('median distance for bone',bone.name)//bone.name)//,': ', distanceToVerts)
      once = false
      let distanceToVerts = 0.1
      let createdHelper = new Object3D()

      let absoluteBonePosA = new Vector3
      let absoluteBonePosB = new Vector3

      //get position from the zeroed bones
      let boneEquiv = zeroedSkinnedMesh.skeleton.bones.filter(bone_current => bone_current.name === bone.name)[0]
      absoluteBonePosA.setFromMatrixPosition(boneEquiv.matrixWorld)
      absoluteBonePosB.setFromMatrixPosition(boneEquiv.children[jj].matrixWorld)
      
      if (bonesContainingVerts[ii])
      {
        relativePos = getPointInBetweenByPerc(absoluteBonePosA, absoluteBonePosB, 0.5)
        let med = calcMedianDistance(relativePos, bonesContainingVerts[ii], this, matrixWorldInv, boneEquiv, vertexDistanceMyltiplyFactor, ii, sknMesh)
        distanceToVerts = med.median !== 0 ? med.median : 0.1
        createdHelper = med.object        
      }

      let boneLength = posA.distanceTo(posB) * scaleC.y// / scaleA.y
      let boneWidth

      boneWidth = boneLength * boneLengthScale > 0.15 ? boneLength : 0.15 / boneLengthScale   //restrict minimum width
      if (boneLength * boneLengthScale > 0.35) boneWidth = 0.35 / boneLengthScale //also maximum..
      
      let hit_bone_width = distanceToVerts*1.5 // / scaleA.y
      let geometry = new THREE.CylinderBufferGeometry(boneWidth / 25, boneWidth /15 , boneLength - boneWidth/20, 4 )//, heightSegments : Integer, openEnded : Boolean, thetaStart : Float, thetaLength : Float)

      // secondary geometry used for hit testing
      let hit_geometry = new THREE.BoxBufferGeometry(hit_bone_width, boneLength, hit_bone_width )
      let hit_material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.5,
        flatShading: true
      })

      let s_material = new THREE.MeshBasicMaterial({
        color:0x7a72e9,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.9,
        flatShading: true,
      })

      this.cones[boneIndex]= new THREE.Mesh()

      let coneGeom = new THREE.Mesh( geometry.clone(), s_material.clone() )
      let hitMesh = new THREE.Mesh(hit_geometry, hit_material)

      coneGeom.position.y = boneLength / 2 + boneWidth / 60
      this.cones[boneIndex].add( coneGeom )
      this.cones[boneIndex] = new THREE.Mesh( geometry.clone(), s_material.clone() )

      this.cones[boneIndex].geometry.applyMatrix(new Matrix4().makeTranslation(0, boneLength/2+boneWidth/60, 0))
      hitMesh.geometry.applyMatrix(new Matrix4().makeTranslation(0, boneLength/2, 0))
      
      // set visible here to see the hit mesh
      hitMesh.material.visible = false
      hitMesh.name = 'hitter_'+bone.name
      hitMesh.userData.type = 'hitter'

      // Add the axis helper if needed
      // let axisHelper = new THREE.AxesHelper(0.2)
      // axisHelper.position.y -= boneLength/2
      //this.cones[boneIndex].add(axisHelper)
      

      this.cones[boneIndex].userData.name = bone.name
      this.cones[boneIndex].userData.type = 'bone'
      this.cones[boneIndex].userData.bone = bone.uuid
      this.cones[boneIndex].userData.segment = 0

      //hitMesh.geometry.applyMatrix(new Matrix4().makeScale(4, 1, 4))
      //this.cones[boneCounter].add(s_sphere)
      if (boneLength>0)
      {
        // don't add mesh hitters for hand fingers and shoulders

        // remove custom bone stats for now!
        
        /*
        if ( ( bone.name.indexOf('LeftHand')>0 && ( bone.name.charAt(bone.name.indexOf('LeftHand')+8)) !== "" )
          || ( bone.name.indexOf('RightHand')>0 && ( bone.name.charAt(bone.name.indexOf('RightHand')+9)) !== "" )
          || ( bone.name.indexOf('Shoulder')>0 ) )
        {
          //console.log('not adding hitter for bone: ', bone.name)
        } else {
          // make the hand hitters longer to cover fingers
          if ( ( bone.name.indexOf('LeftHand')>0 && ( bone.name.charAt(bone.name.indexOf('LeftHand')+8)) === "" )
            || ( bone.name.indexOf('RightHand')>0 && ( bone.name.charAt(bone.name.indexOf('RightHand')+9)) === "" ) )
          {
            hitMesh.geometry.applyMatrix(new Matrix4().makeScale(4, 2, 4))
          }
          if ( bone.name.indexOf('LeftArm')>0 || bone.name.indexOf('RightArm')>0 )
          {
            hitMesh.geometry.applyMatrix(new Matrix4().makeScale(1, 1.2, 1))
            hitMesh.geometry.applyMatrix(new Matrix4().makeTranslation(0, -boneLength/8, 0))
          }
          this.hit_meshes[boneIndex] = ( hitMesh )
          this.add(hitMesh)

        }
        if ( bone.name.indexOf('Neck')>0 )
        {
          hitMesh.geometry.applyMatrix(new Matrix4().makeScale(3, 1, 3))
          //hitMesh.geometry.applyMatrix(new Matrix4().makeTranslation(0, -boneLength, 0))
        }
        if ( bone.name.indexOf('Leg')>0 )
        {
          hitMesh.geometry.applyMatrix(new Matrix4().makeScale(1.5, 1, 1.5))
          //hitMesh.geometry.applyMatrix(new Matrix4().makeTranslation(0, -boneLength, 0))
        }
        if ( bone.name.indexOf('Foot')>0 )
        {
          hitMesh.geometry.applyMatrix(new Matrix4().makeScale(1.5, 1, 1.5))
          //hitMesh.geometry.applyMatrix(new Matrix4().makeTranslation(0, -boneLength, 0))
        }
        if ( bone.name.indexOf('Hips')>0 && ( bone.name.charAt(bone.name.indexOf('Hips')+4)) === "" )
        {
          hitMesh.geometry.applyMatrix(new Matrix4().makeScale(6, 1.8, 5))
          hitMesh.geometry.applyMatrix(new Matrix4().makeTranslation(0, -boneLength, 0))
        }
        if ( (bone.name.indexOf('Spine')>0) )
        {
          //align the spine hit meshes better (the bones are slightly to the back of the mesh)
          hitMesh.geometry.applyMatrix(new Matrix4().makeScale(6, 1, 5))

          hitMesh.geometry.applyMatrix(new Matrix4().makeTranslation(0, 0, boneLength/3 - spineNumber * boneLength/10))
          spineNumber++
        }
        */

        this.hit_meshes[boneIndex] = ( hitMesh )
        this.add(hitMesh)
        this.add(createdHelper)

        bone.helper = createdHelper
        bone.hitBone = hitMesh
        bone.connectedBone = this.cones[boneIndex]

        boneCounter++

      }

      jj++

    }
  }

  zeroedSkinnedMesh = null

  this.hit_meshes = filter_array(this.hit_meshes)
  this.root = object
  this.object3D = object3D
  this.bones = bones
  //if (sknMesh.needsRepose) sknMesh.repose()
  this.matrix = object.matrixWorld
  this.matrixAutoUpdate = false
}

BonesHelper.prototype = Object.create( Object3D.prototype )
BonesHelper.prototype.constructor = BonesHelper

BonesHelper.prototype.updateMatrixWorld = function () {
  var boneMatrix = new Matrix4()
  var matrixWorldInv = new Matrix4()
  var object3dMatrix = new Matrix4()

  return function updateMatrixWorld( force ) {
    var bones = this.bones
    matrixWorldInv.getInverse( this.root.matrixWorld )

    for ( var ii = 0; ii < bones.length; ii++ )
    {
      var bone = bones [ii]
      boneMatrix.multiplyMatrices( matrixWorldInv, bone.matrixWorld )   // changed to parent position, as that's the length calculated

      if (bone.connectedBone === undefined) continue

      bone.connectedBone.position.setFromMatrixPosition( boneMatrix )
      bone.connectedBone.quaternion.setFromRotationMatrix( boneMatrix )
      bone.connectedBone.scale.setFromMatrixScale( boneMatrix )
      if (bone.hitBone) {
        bone.hitBone.position.setFromMatrixPosition( boneMatrix )
        bone.hitBone.quaternion.setFromRotationMatrix( boneMatrix )
        bone.hitBone.scale.setFromMatrixScale( boneMatrix )
      }
    }

    Object3D.prototype.updateMatrixWorld.call( this, force )
  }
}()

BonesHelper.prototype.raycast = function ( raycaster, intersects ) {
  let results = raycaster.intersectObjects(this.cones)
  for (let result of results) {
    // add a .bone key to the Intersection object referencing the cone's bone
    result.bone = this.bones.find(bone => bone.uuid === result.object.userData.bone)
    intersects.push(result)
  }
}

const cloneSkinned = ( source ) => {

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
    //console.log('cloned mesh: ', clonedMesh)
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

const getDefaultRotationForBone = (skeleton, bone) => {
  return { x: bone.rotation.x, y: bone.rotation.y, z: bone.rotation.z}  
}

SkinnedMesh.prototype.savePose = function(sknMesh) {
  let poseSkeleton = {}
  
  // sknMesh.skeleton.pose()
  this.needsRepose = false

  for (var i = 0; i< this.skeleton.bones.length; i++)
  { 
    this.skeleton.bones[i].updateMatrix()
    sknMesh.skeleton.bones[i].updateMatrix()
    let defaultRotation = getDefaultRotationForBone(this.skeleton, this.skeleton.bones[i])
    let zeroRotation = getDefaultRotationForBone(sknMesh.skeleton, sknMesh.skeleton.bones[i])
    
    //calculating initial rotation vs default rotation difference
    let rotDiff = {
      x: defaultRotation.x - zeroRotation.x,
      y: defaultRotation.y - zeroRotation.y,
      z: defaultRotation.z - zeroRotation.z
    }

    if ( rotDiff.x < -0.0001 || rotDiff.x > 0.0001 ||
      rotDiff.y < -0.0001 || rotDiff.y > 0.0001 ||
      rotDiff.z < -0.0001 || rotDiff.z > 0.0001 )
      {
        this.needsRepose = true
        poseSkeleton[this.skeleton.bones[i].name] = {
          rotation: {
            x: defaultRotation.x,
            y: defaultRotation.y,
            z: defaultRotation.z
          }          
        }        
      }
  }

  if ( this.needsRepose ) {
    this.userData.initialSkeleton = poseSkeleton
  }
  //REMOVED SAVING 

  // let preset = {
  //   id: this.parent.userData.id,
  //   name: this.name,
  //   state: {
  //     skeleton: poseSkeleton || {}
  //   }
  // }
  // //console.log('saving: ', preset)
  // createPosePreset(preset)
}

SkinnedMesh.prototype.repose = function() {
  //console.log('reposing ', this.skeleton.bones, ' to: ', this.userData.initialSkeleton)
  for (var i = 0; i< this.skeleton.bones.length; i++)
  {    
    if (this.userData.initialSkeleton[this.skeleton.bones[i].name])
    {
      this.skeleton.bones[i].rotation.x = this.userData.initialSkeleton[this.skeleton.bones[i].name].rotation.x
      this.skeleton.bones[i].rotation.y = this.userData.initialSkeleton[this.skeleton.bones[i].name].rotation.y
      this.skeleton.bones[i].rotation.z = this.userData.initialSkeleton[this.skeleton.bones[i].name].rotation.z
    }   
  }
  
}

module.exports = BonesHelper
