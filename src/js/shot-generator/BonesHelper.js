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

const ModelLoader = require('../services/model-loader')

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

const getVertexForBones = ( bufferPositions, bufferSkinIndices, bufferSkinWeights ) => {
    
  let bonesInfluenceVertices = []
  for ( var i = 0; i < bufferSkinIndices.count; i++ ) {
    let boneIndex = new Vector4()
    let vertex = new Vector3()
    let vertWeight = new Vector4()

    vertex.fromBufferAttribute( bufferPositions, i )
    boneIndex.fromBufferAttribute( bufferSkinIndices, i )
    vertWeight.fromBufferAttribute( bufferSkinWeights, i )
    
    if (vertWeight.x > 0.01) {
      if (bonesInfluenceVertices[boneIndex.x] ) {
        bonesInfluenceVertices[boneIndex.x].push( vertex )
      } else {
        bonesInfluenceVertices[boneIndex.x] = [vertex]      
      }
    }

    if (vertWeight.y > 0.01) {
      if (bonesInfluenceVertices[boneIndex.y]) {
        bonesInfluenceVertices[boneIndex.y].push( vertex )
      } else {
        bonesInfluenceVertices[boneIndex.y] = [vertex]      
      }
    }

    if (vertWeight.z > 0.01) {
      if (bonesInfluenceVertices[boneIndex.z]) {
        bonesInfluenceVertices[boneIndex.z].push( vertex )
      } else {
        bonesInfluenceVertices[boneIndex.z] = [vertex]      
      }
    }

    if (vertWeight.w > 0.01) {
      if (bonesInfluenceVertices[boneIndex.w]) {
        bonesInfluenceVertices[boneIndex.w].push( vertex )
      } else {
        bonesInfluenceVertices[boneIndex.w] = [vertex]      
      }
    }

  }
  return bonesInfluenceVertices  
}

let once = true

const calcMedianDistance = (fixedposition, allverts, object, inverdsedMatrix, bone) => {
  let allDistances = []
  let median = 0
  let maxDist = 0
  let minDist = 10000000;
  let tempObj = new THREE.Object3D()
  let plane
  //if (once) {
    let test = new THREE.Mesh(
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
    test.position.set(fixedposition.x, fixedposition.y, fixedposition.z)
    test.quaternion.copy(bone.quaternion)
    test.quaternion.setFromRotationMatrix( bone.matrixWorld )
    //test.quaternion.multiply(new Quaternion(-Math.sqrt(0.5), 0 , 0, -Math.sqrt(0.5)))
    test.updateMatrixWorld()
    test.updateMatrix()
    plane = new THREE.Plane(fixedposition.clone().applyMatrix4(inverdsedMatrix), 1)
    plane.applyMatrix4(test.matrix)
    plane.normalize()
    //plane.applyMatrix4(test.matrixWorld)
    //plane.quaternion.copy(test.quaternion)
    //test.quaternion.multiplyQuaternions()

    let boneProjection = new Vector3()
    plane.projectPoint(fixedposition, boneProjection)
    let difference = new Vector3().subVectors(fixedposition, boneProjection)
    let testPoint = new THREE.Mesh(
      new THREE.BoxBufferGeometry(0.02,0.02,0.02),
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
    testPoint.position.set(fixedposition.x, fixedposition.y, fixedposition.z)

    var helper = new THREE.PlaneHelper( plane, 1, 0xffff00 );
    helper.updateMatrix()
    if (once) tempObj.add( helper )
    //if (once) tempObj.add(test)
    if (once) tempObj.add(testPoint)
  //}

  for (let vect of allverts)
  {
    let vect2 = vect.clone().applyMatrix4(inverdsedMatrix)
    let vect3 = new Vector3()
    plane.projectPoint(vect2, vect3)
    vect3.addVectors(vect3, difference)
    let distanceFromOriginal = vect3.distanceTo(vect2)
    if (distanceFromOriginal<0.01)
    {
      //console.log('difference from original: ',vect3.distanceTo(vect2))
      //console.log('dif: ', difference)
      allDistances.push(fixedposition.distanceTo(vect3))

      if (once) {
        let test = new THREE.Mesh(
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
        test.position.set(vect3.x, vect3.y, vect3.z)
        tempObj.add(test)
      }
      median += allDistances[allDistances.length-1]
      if (allDistances[allDistances.length-1] > maxDist) maxDist = allDistances[allDistances.length-1] 
      if (allDistances[allDistances.length-1] < minDist) minDist = allDistances[allDistances.length-1] 
    }

   
  }
  if (once) {
    once = false
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

function BonesHelper( object, object3D ) {
  Object3D.call( this )
  //console.log('object: ', object3D)
  //ModelLoader.isCustomModel(model)
  let skeleton = object3D.children[1].skeleton
  skeleton.pose()

  let skinIndex = object3D.children[1].geometry.attributes.skinIndex
  let vertexPositions = object3D.children[1].geometry.attributes.position
  let skinWeights = object3D.children[1].geometry.attributes.skinWeight
  //console.log('obj: ', vertexPositions)

  let bones = getBoneList( object );
  this.cones = []

  this.hit_meshes = []

  let boneMatrix = new Matrix4()
  let matrixWorldInv = new Matrix4()
  let boneCounter = 0
  matrixWorldInv.getInverse( object.matrixWorld )
  
  let bonesContainingVerts = getVertexForBones(vertexPositions, skinIndex, skinWeights)
  let traversedBones = []

  for (var ii = 0; ii< bones.length; ii++) {
    var bone = bones[ii]
    //console.log('skeleton: ', skeleton.skeleton)
    //console.log('is it the same bone? : ', skeleton.skeleton.bones[ii] == bones[ii])
    var jj = 0
    let posA = new Vector3()
    let posB = new Vector3()
    let scaleA = new Vector3()
    let scaleB = new Vector3()
    let scaleC = new Vector3()
    let spineNumber = 0

    //console.log(object3D.children[1].geometry)

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

      posA.setFromMatrixPosition(boneMatrix.multiplyMatrices(matrixWorldInv, bone.matrixWorld))
      posB.setFromMatrixPosition(boneMatrix.multiplyMatrices(matrixWorldInv, bone.children[jj].matrixWorld))
      once = ii > 10 && ii < 20 ? true : false
      //once = true
      //if (once) console.log('median distance for bone',bone.name)//bone.name)//,': ', distanceToVerts)
      once = false
      let distanceToVerts = 0.1 
      let createdHelper = new Object3D()
      if (bonesContainingVerts[ii])
      {
        let relativePos = getPointInBetweenByPerc(posA, posB, 0.5)
        let med = calcMedianDistance(relativePos, bonesContainingVerts[ii], this, matrixWorldInv, bone)
        distanceToVerts = med.median !== 0 ? med.median : 0.1
        createdHelper = med.object        
      }
      //console.log('median distance for bone',bone.name,': ', distanceToVerts)

      scaleA.setFromMatrixScale(boneMatrix)
      scaleB.setFromMatrixScale(matrixWorldInv)
      scaleC.setFromMatrixScale(object.matrixWorld)
      let boneLength = posA.distanceTo(posB) * scaleC.y //* scaleB.y
      let boneWidth = boneLength > 0.15 ? boneLength : 0.15   //restrict minimum width
      if (boneWidth > 0.35) boneWidth = 0.35  //also maximum..

      let hit_bone_width = distanceToVerts*1.5
      let geometry = new THREE.CylinderBufferGeometry(boneWidth / 25, boneWidth /15 , boneLength - boneWidth/20, 4 )//, heightSegments : Integer, openEnded : Boolean, thetaStart : Float, thetaLength : Float)
      // secondary geometry used for hit testing
      // if it's mixamo rig all spine bones contain the SPine string, set that to wider
      //let hit_bone_width = ((bone.name.indexOf('Spine')>0)||(bone.name.indexOf('Hips')>0)) ? boneWidth2 / 4 : boneWidth2 / 4// boneWidth*1.3 : boneWidth / 4
      //let hit_geometry = new THREE.CylinderBufferGeometry(hit_bone_width, hit_bone_width, boneLength, 4)
      //let hit_geometry = new THREE.BoxBufferGeometry(hit_bone_width, hit_bone_width, boneLength)
      
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
      //hitMesh.material.visible = false
      hitMesh.name = 'hitter_'+bone.name
      hitMesh.userData.type = 'hitter'

      // Add the axis helper if needed
      //this.cones[boneCounter].add(new THREE.AxesHelper(boneLength / 2))

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
        //removed, adding only when selected

        this.hit_meshes[boneIndex] = ( hitMesh )
        this.add(hitMesh)
        this.add(createdHelper)

        bone.helper = createdHelper
        //this.add(this.cones[boneCounter])
        bone.hitBone = hitMesh
        bone.connectedBone = this.cones[boneIndex]

        boneCounter++

      }

      jj++

    }
  }

  let skeletonHelper = new THREE.SkeletonHelper( bones[0] )
  skeletonHelper.material.linewidth = 5
  //this.add(skeletonHelper)

  this.hit_meshes = filter_array(this.hit_meshes)
  this.root = object
  this.object3D = object3D
  this.bones = bones

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

module.exports = BonesHelper
