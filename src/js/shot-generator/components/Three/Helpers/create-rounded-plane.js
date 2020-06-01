
const createRoundedPlane = (radius = 2, offset = 2, smooth = 16) => {
    let geometry = new THREE.Geometry()

    offset = (offset - radius) / 2
    radius = radius / 4

    let planeA = new THREE.PlaneGeometry((offset+radius) * 2, offset * 2)
    geometry.merge(planeA)

    let planeB = new THREE.PlaneGeometry(offset * 2, (offset+radius) * 2)
    geometry.merge(planeB)

    let cornerA = new THREE.CircleGeometry(radius, smooth, (Math.PI * 2 / 4) * 1, Math.PI * 2 / 4);
    let matrixA = new THREE.Matrix4();
    matrixA.makeTranslation(0-offset, 0+offset, 0)
    geometry.merge(cornerA, matrixA)

    let cornerB = new THREE.CircleGeometry(radius, smooth, (Math.PI * 2 / 4) * 0, Math.PI * 2 / 4);
    let matrixB = new THREE.Matrix4();
    matrixB.makeTranslation(0+offset, 0+offset, 0)
    geometry.merge(cornerB, matrixB)

    let cornerC = new THREE.CircleGeometry(radius, smooth, (Math.PI * 2 / 4) * 3, Math.PI * 2 / 4);
    let matrixC = new THREE.Matrix4();
    matrixC.makeTranslation(0+offset, 0-offset, 0)
    geometry.merge(cornerC, matrixC)

    let cornerD = new THREE.CircleGeometry(radius, smooth, (Math.PI * 2 / 4) * 2, Math.PI * 2 / 4);
    let matrixD = new THREE.Matrix4();
    matrixD.makeTranslation(0-offset, 0-offset, 0)
    geometry.merge(cornerD, matrixD)

    remapUVs(geometry)
    return geometry
}

const remapUVs = (geometry) => {
    geometry.computeBoundingBox()
    let min = geometry.boundingBox.min
    let max = geometry.boundingBox.max
    let offset = new THREE.Vector2(0 - min.x, 0 - min.y)
    let size = new THREE.Vector2(max.x - min.x, max.y - min.y)
    geometry.faceVertexUvs[0] = []
    for(const face of geometry.faces) {
      let v1 = geometry.vertices[face.a]
      let v2 = geometry.vertices[face.b]
      let v3 = geometry.vertices[face.c]
      geometry.faceVertexUvs[0].push([
          new THREE.Vector2((v1.x + offset.x)/size.x, (v1.y + offset.y)/size.y),
          new THREE.Vector2((v2.x + offset.x)/size.x, (v2.y + offset.y)/size.y),
          new THREE.Vector2((v3.x + offset.x)/size.x, (v3.y + offset.y)/size.y)
      ])
    }

    geometry.uvsNeedUpdate = true
}

export default createRoundedPlane