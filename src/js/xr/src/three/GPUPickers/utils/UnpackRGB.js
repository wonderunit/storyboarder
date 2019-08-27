let unpackDownscale = 255. / 256.;
let unPackFactors = new THREE.Vector4( unpackDownscale / (256*256*256), unpackDownscale / (256*256), unpackDownscale / 256, unpackDownscale / 1 );
function unpackRGBAToScenePosition( canvasPos, rgba, cssPosition, camera, renderer ) 
{
    let vector = new THREE.Vector4().fromArray(rgba).multiplyScalar(1/255);
    let zDepth = vector.dot(unPackFactors );

    let x = cssPosition.x / renderer.domElement.width;
    let y = cssPosition.y / renderer.domElement.height;
    x = 2 * x - 1; 
    y = 2 * (1 - y) - 1; 
    zDepth = 2 * zDepth - 1;
    canvasPos.set(x, y, zDepth);
    canvasPos.applyMatrix4(camera.projectionMatrixInverse);
    canvasPos.applyMatrix4(camera.matrixWorld);
}

module.exports = {unpackRGBAToScenePosition};
