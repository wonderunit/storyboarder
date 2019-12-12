const THREE = require('three')

function BoundingBoxHelper ( object, geometry, material ) {
  this.object = object

  THREE.Mesh.call( this, geometry, material )
}

BoundingBoxHelper.prototype = Object.create( THREE.Mesh.prototype )
BoundingBoxHelper.prototype.constructor = BoundingBoxHelper

module.exports = BoundingBoxHelper
