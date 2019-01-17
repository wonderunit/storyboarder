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

const { LineSegments } = THREE
const { Matrix4 } = THREE
const { VertexColors } = THREE
const { LineBasicMaterial } = THREE
const { Color } = THREE
const { Vector3 } = THREE
const { BufferGeometry } = THREE
const { Float32BufferAttribute } = THREE
const { Object3D } = THREE

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

function BonesHelper( object, object3D ) {
  Object3D.call( this )
  let bones = getBoneList( object );
  this.cones = []

  this.hit_meshes = []

  let boneMatrix = new Matrix4()
  let matrixWorldInv = new Matrix4()
  let posA = new Vector3()
  let posB = new Vector3()
  let scaleA = new Vector3()
  let scaleB = new Vector3()
  let boneCounter = 0
  matrixWorldInv.getInverse( object.matrixWorld )

  let skeletonHelper = new THREE.SkeletonHelper( bones[0] )
  skeletonHelper.material.linewidth = 5
  //this.add(skeletonHelper)
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
        //console.log('double!: ', currentCreated)
        this.remove(currentCreated)
        this.remove(currentCreated.hitBone)
        traversedBones[traversedBones.indexOf(bone)] = bone
      }
      else {
        traversedBones.push(bone)
      }

      let boneIndex = traversedBones.indexOf(bone)

      posA.setFromMatrixPosition(boneMatrix.multiplyMatrices(matrixWorldInv, bone.matrixWorld))
      posB.setFromMatrixPosition(boneMatrix.multiplyMatrices(matrixWorldInv, bone.children[jj].matrixWorld))

      scaleA.setFromMatrixScale(boneMatrix)
      scaleB.setFromMatrixScale(matrixWorldInv)
      scaleC.setFromMatrixScale(object.matrixWorld)
      let boneLength = posA.distanceTo(posB) * scaleC.y //* scaleB.y
      let boneWidth = boneLength > 0.15 ? boneLength : 0.15   //restrict minimum width
      if (boneWidth > 0.35) boneWidth = 0.35  //also maximum..
      let s_geometry = new THREE.SphereGeometry(boneWidth/18, 8, 8)
      let s_material = new THREE.MeshBasicMaterial({
        color: 0x006eb8,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.9,
        flatShading: true,
      })

      let s_sphere = new THREE.Mesh(s_geometry, s_material)

      let geometry = new THREE.CylinderBufferGeometry(boneWidth / 25, boneWidth /15 , boneLength - boneWidth/20, 4 )//, heightSegments : Integer, openEnded : Boolean, thetaStart : Float, thetaLength : Float)
      //let geometry = new THREE.CylinderBufferGeometry(boneWidth / 25, boneWidth /15 , boneLength , 4 )//, heightSegments : Integer, openEnded : Boolean, thetaStart : Float, thetaLength : Float)


      //secondary geometry used for hit testing
      //console.log('this is: ', bone.name.indexOf('Spine'))
      // if it's mixamo rig all spine bones contain the SPine string, set that to wider
      let hit_bone_width = ((bone.name.indexOf('Spine')>0)||(bone.name.indexOf('Hips')>0)) ? boneWidth : boneWidth / 4
      let hit_geometry = new THREE.CylinderBufferGeometry(hit_bone_width, hit_bone_width, boneLength, 4)
      let hit_material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.5,
        flatShading: true
      })

      this.cones[boneIndex]= new THREE.Mesh()

      //this.cones[traversedBones.indexOf(bone)]

      let coneGeom = new THREE.Mesh( geometry.clone(), s_material.clone() )
      let hitMesh = new THREE.Mesh(hit_geometry, hit_material)

      coneGeom.position.y = boneLength / 2 + boneWidth / 60
      this.cones[boneIndex].add( coneGeom )
      this.cones[boneIndex] = new THREE.Mesh( geometry.clone(), s_material.clone() )

      this.cones[boneIndex].geometry.applyMatrix(new Matrix4().makeTranslation(0, boneLength/2+boneWidth/60, 0))
      hitMesh.geometry.applyMatrix(new Matrix4().makeTranslation(0, boneLength/2, 0))
      this.hit_meshes[boneIndex] = ( hitMesh )

      // set visible here to see the hit mesh
      hitMesh.material.visible = false
      hitMesh.name = 'hitter_'+bone.name
      hitMesh.userData.type = 'hitter'

      // Add the axis helper if needed
      //this.cones[boneCounter].add(new THREE.AxesHelper(boneLength / 2))

      this.cones[boneIndex].userData.name = bone.name
      this.cones[boneIndex].userData.type = 'bone'
      this.cones[boneIndex].userData.bone = bone.uuid
      this.cones[boneIndex].userData.segment = 0
      //this.cones[boneCounter].add(s_sphere)
      if (boneLength>0)
      {
        if ( ( bone.name.indexOf('LeftHand')>0 && ( bone.name.charAt(bone.name.indexOf('LeftHand')+8)) !== "" )
          || ( bone.name.indexOf('RightHand')>0 && ( bone.name.charAt(bone.name.indexOf('RightHand')+9)) !== "" ) )
        {
          //console.log('not adding hitter for bone: ', bone.name)
        } else {
          if ( ( bone.name.indexOf('LeftHand')>0 && ( bone.name.charAt(bone.name.indexOf('LeftHand')+8)) === "" )
            || ( bone.name.indexOf('RightHand')>0 && ( bone.name.charAt(bone.name.indexOf('RightHand')+9)) === "" ) )
          {
            hitMesh.geometry.applyMatrix(new Matrix4().makeScale(1, 1.8, 1))
            //hitMesh.geometry.applyMatrix(new Matrix4().makeTranslation(0, boneLength, 0))
          }
          this.add(hitMesh)

        }
        if ( bone.name.indexOf('Hips')>0 && ( bone.name.charAt(bone.name.indexOf('Hips')+4)) === "" )
        {
          hitMesh.geometry.applyMatrix(new Matrix4().makeScale(1, 1.8, 1))
          hitMesh.geometry.applyMatrix(new Matrix4().makeTranslation(0, -boneLength, 0))
        }
        //removed, adding only when selected
        //this.add(this.cones[boneCounter])
        bone.hitBone = hitMesh
        bone.connectedBone = this.cones[boneIndex]

        boneCounter++

      }

      jj++

    }
  }
  //console.log('traversed bomnes: ', traversedBones)

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

  return function updateMatrixWorld( force ) {
    var bones = this.bones

    matrixWorldInv.getInverse( this.root.matrixWorld )
    let rootScale = new Vector3().setFromMatrixScale( this.root.matrixWorld )
    let rootScaleInversed = new Vector3().setFromMatrixScale( matrixWorldInv )
    let boneCounter = 0
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

      //bone.connectedBone.scale.setFromMatrixScale( matrixWorldInv )
      if (bone.name.indexOf("Foot")>=0)
      {
        // FIX REQUIRED HERE FOR BONES THAT DON'T HAVE CORRECT ROTATIONS

      }
      //boneMatrix.multiplyMatrices( matrixWorldInv, bone.parent.matrixWorld )
    }

    Object3D.prototype.updateMatrixWorld.call( this, force )
  }
}()

BonesHelper.prototype.raycast = function ( raycaster, intersects ) {
  //let results = raycaster.intersectObjects(this.children)
  let results = raycaster.intersectObjects(this.cones)
  for (let result of results) {
    // add a .bone key to the Intersection object referencing the cone's bone
    //console.log('intersecting bones: ', result.object)
    result.bone = this.bones.find(bone => bone.uuid === result.object.userData.bone)
    intersects.push(result)
  }
}

module.exports = BonesHelper
