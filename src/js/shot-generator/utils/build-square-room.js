import * as THREE from 'three'

const buildSquareRoom = (w, l, h, { textures }) => {
  var hw = w / 2
  var hl = l / 2

  var scale = 13.2
  var shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(w / scale, 0)
  shape.lineTo(w / scale, l / scale)
  shape.lineTo(0, l / scale)
  shape.lineTo(0, 0)

  var extrudeSettings = {
    steps: 1,
    depth: h / scale,
    bevelEnabled: false
  }

  var materialWall = new THREE.MeshToonMaterial({map: textures.wall, side: THREE.FrontSide})
  materialWall.depthTest = true
  materialWall.transparent = false
  materialWall.userData.outlineParameters = { thickness: 0, alpha: 0.0 }

  // materialWall.blending = THREE.MultiplyBlending
  materialWall.opacity = 1

  var materialCeil = new THREE.MeshToonMaterial({map: textures.wall, side: THREE.FrontSide})
  materialCeil.depthTest = true
  materialCeil.transparent = false
  materialCeil.userData.outlineParameters = { thickness: 0, alpha: 0.0 }

  // materialWall.blending = THREE.MultiplyBlending
  materialCeil.opacity = 1

  // var materialFloor = new THREE.MeshBasicMaterial({
  //   color: 0x00ff00,
  //   transparent: true,
  //   side: THREE.BackSide,
  //   opacity: 0})

  var materials = [materialCeil, materialWall]//, materialFloor]

  var geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  var mesh = new THREE.Mesh(geometry, materials)
  // mesh.layers.set(layer)
  mesh.rotation.x = Math.PI / 2

  // for (var face in mesh.geometry.faces) {
  //   if (mesh.geometry.faces[face].normal.z === -1) {
  //     mesh.geometry.faces[face].materialIndex = 2
  //   }
  // }

  var mS = (new THREE.Matrix4()).identity()
  mS.elements[0] = -1
  mS.elements[5] = -1
  mS.elements[10] = -1
  geometry.applyMatrix4(mS)

  mesh.scale.set(scale, scale, scale)
  mesh.position.set(hw, 0, hl)

  mesh.geometry.verticesNeedUpdate = true
  mesh.geometry.normalsNeedUpdate = true
  mesh.geometry.uvsNeedUpdate = true
  mesh.geometry.buffersNeedUpdate = true
  mesh.geometry.computeBoundingSphere()
  mesh.geometry.computeFaceNormals()
  mesh.geometry.computeVertexNormals()

  mesh.renderOrder = 1.0

  return mesh
}

export default buildSquareRoom
