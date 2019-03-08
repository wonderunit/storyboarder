const THREE = require('three')
const { MeshLine, MeshLineMaterial } = require('../vendor/THREE.MeshLine')

const METERS_PER_FEET = 0.3048

const BoundingUVGenerator = {
  generateTopUV: function (geometry, extrudedShape, extrudeOptions, indexA, indexB, indexC) {
    var ax = geometry.vertices[ indexA ].x,
      ay = geometry.vertices[ indexA ].y,

      bx = geometry.vertices[ indexB ].x,
      by = geometry.vertices[ indexB ].y,

      cx = geometry.vertices[ indexC ].x,
      cy = geometry.vertices[ indexC ].y,

      bb = extrudedShape.getBoundingBox(),
      bbx = bb.maxX - bb.minX,
      bby = bb.maxY - bb.minY

    return [
      new THREE.UV((ax - bb.minX) / bbx, 1 - (ay - bb.minY) / bby),
      new THREE.UV((bx - bb.minX) / bbx, 1 - (by - bb.minY) / bby),
      new THREE.UV((cx - bb.minX) / bbx, 1 - (cy - bb.minY) / bby)
    ]
  },

  generateBottomUV: function (geometry, extrudedShape, extrudeOptions, indexA, indexB, indexC) {
    return this.generateTopUV(geometry, extrudedShape, extrudeOptions, indexA, indexB, indexC)
  },

  generateSideWallUV: function (geometry, extrudedShape, wallContour, extrudeOptions,
                                  indexA, indexB, indexC, indexD, stepIndex, stepsLength,
                                  contourIndex1, contourIndex2) {
    var ax = geometry.vertices[ indexA ].x,
      ay = geometry.vertices[ indexA ].y,
      az = geometry.vertices[ indexA ].z,

      bx = geometry.vertices[ indexB ].x,
      by = geometry.vertices[ indexB ].y,
      bz = geometry.vertices[ indexB ].z,

      cx = geometry.vertices[ indexC ].x,
      cy = geometry.vertices[ indexC ].y,
      cz = geometry.vertices[ indexC ].z,

      dx = geometry.vertices[ indexD ].x,
      dy = geometry.vertices[ indexD ].y,
      dz = geometry.vertices[ indexD ].z

    var amt = extrudeOptions.depth,
      bb = extrudedShape.getBoundingBox(),
      bbx = bb.maxX - bb.minX,
      bby = bb.maxY - bb.minY

    if (Math.abs(ay - by) < 0.01) {
      return [
        new THREE.UV(ax / bbx, az / amt),
        new THREE.UV(bx / bbx, bz / amt),
        new THREE.UV(cx / bbx, cz / amt),
        new THREE.UV(dx / bbx, dz / amt)
      ]
    } else {
      return [
        new THREE.UV(ay / bby, az / amt),
        new THREE.UV(by / bby, bz / amt),
        new THREE.UV(cy / bby, cz / amt),
        new THREE.UV(dy / bby, dz / amt)
      ]
    }
  }
}

let createLineMesh = (pointsArray, material) => {
  let geometry = new THREE.Geometry()
  for (var i = 0; i < pointsArray.length; i++) {
    var n = 2
    while (n--) {
      geometry.vertices.push(new THREE.Vector3(pointsArray[i][0], pointsArray[i][1], pointsArray[i][2]))
    }
  }
  geometry.translate(-.5, 0, -.5)
  let line = new MeshLine()
  line.setGeometry(geometry, function (p) { return 1 })
  let mesh = new THREE.Mesh(line.geometry, material)
  return mesh
}

const buildSquareRoom = (w, l, h, { textures }) => {
  w = w * METERS_PER_FEET
  l = l * METERS_PER_FEET
  h = h * METERS_PER_FEET

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
    bevelEnabled: false,
    uvGenerator: BoundingUVGenerator
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
  geometry.applyMatrix(mS)

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

  var room = new THREE.Group()
  room.add(mesh)

  mesh.layers.disable(0)
  mesh.layers.enable(1)
  mesh.layers.disable(2)
  mesh.layers.enable(3)

  return room
}

module.exports = buildSquareRoom
