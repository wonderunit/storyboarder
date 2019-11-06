const THREE = require('three')
const MS_TO_METER = 150

/**
 * Calculates time of a transition from start to end
 * @param start
 * @param end
 * @returns {number}
 */
module.exports = (start, end) => {
  return new THREE.Vector3(end.x, end.y, end.z).sub(new THREE.Vector3(start.x, start.y, start.z)).length() * MS_TO_METER
}
