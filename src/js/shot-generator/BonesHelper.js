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

function BonesHelper( object ) {
  Object3D.call( this )
  let bones = getBoneList( object );
  this.cones = []

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

      // old material
      // let material = new THREE.MeshStandardMaterial( {
      //   color: 0x006eb8,
      //   emissive: 0x003254,
      //   wireframe: false,
      //   depthTest: false,
      //   depthWrite: false,
      //   transparent: true,
      //   opacity: 0.9,
      //   flatShading: true,
      // })

      this.cones[boneCounter]= new THREE.Mesh()
      let coneGeom = new THREE.Mesh( geometry.clone(), s_material.clone() )
      coneGeom.position.y = boneLength / 2 + boneWidth / 60
      this.cones[boneCounter].add( coneGeom )

      this.cones[boneCounter] = new THREE.Mesh( geometry.clone(), s_material.clone() )

      this.cones[boneCounter].geometry.applyMatrix(new Matrix4().makeTranslation(0, boneLength/2+boneWidth/60, 0))

      // Add the axis helper if needed
      //this.cones[boneCounter].add(new THREE.AxesHelper(boneLength / 2))
      this.cones[boneCounter].userData.name = bone.name
      this.cones[boneCounter].userData.type = 'bone'
      this.cones[boneCounter].userData.bone = bone.uuid
      this.cones[boneCounter].userData.segment = 0

      //this.cones[boneCounter].add(s_sphere)
      if (boneLength>0)
      {
        this.add(this.cones[boneCounter])
        bone.connectedBone = this.cones[boneCounter]
        boneCounter++
      }

      jj++

    }
  }

  this.root = object
  this.bones = bones

  object.parent.bonesHelper = this
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
      boneMatrix.multiplyMatrices( matrixWorldInv, bone.matrixWorld )   // changed to parent position, as thet's the length calculated
      if (bone.connectedBone === undefined) continue

      bone.connectedBone.position.setFromMatrixPosition( boneMatrix )
      bone.connectedBone.quaternion.setFromRotationMatrix( boneMatrix )
      bone.connectedBone.scale.setFromMatrixScale( boneMatrix )
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
  let results = raycaster.intersectObjects(this.children)
  for (let result of results) {
    // add a .bone key to the Intersection object referencing the cone's bone
    //console.log('intersecting bones: ', result.object)
    result.bone = this.bones.find(bone => bone.uuid === result.object.userData.bone)
    intersects.push(result)
  }
}

module.exports = BonesHelper
