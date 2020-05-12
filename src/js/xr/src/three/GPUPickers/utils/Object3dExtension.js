const THREE = require( "three");

THREE.Object3D.prototype.worldToLocalQuaternion = function (quaternion)
{
    let resultQuat = quaternion;
    let rotation = this.matrixWorld.getRotation();
    resultQuat.multiply(rotation.inverse());
    return resultQuat;
}

THREE.Object3D.prototype.localToWorldQuaternion = function (quaternion)
{
    let resultQuat = quaternion;
    let rotation = this.matrixWorld.getRotation();
    resultQuat.multiply(rotation);
    return resultQuat;
}

THREE.Object3D.prototype.getInverseMatrix = function ()
{
    let matrix = new THREE.Matrix4();
    matrix.getInverse(this.matrix);
    return matrix;
}

THREE.Object3D.prototype.getInverseMatrixWorld = function ()
{
    let matrix = new THREE.Matrix4();

    matrix.getInverse(this.matrixWorld);
    return matrix;
}

THREE.Matrix4.prototype.inverse = function()
{
    let matrix = new THREE.Matrix4();
    matrix.getInverse(this);
    return matrix;
}

THREE.Object3D.prototype.worldPosition = function()
{
    let position = new THREE.Vector3();
    this.getWorldPosition(position);
    
    return position;
}

THREE.Matrix4.prototype.getRotation = function()
{
    let vector = new THREE.Vector3();
    let matrix = new THREE.Matrix4();
    let quaternion = new THREE.Quaternion();

    let te = this.elements;

    let sx = vector.set( te[ 0 ], te[ 1 ], te[ 2 ] ).length();
    let sy = vector.set( te[ 4 ], te[ 5 ], te[ 6 ] ).length();
    let sz = vector.set( te[ 8 ], te[ 9 ], te[ 10 ] ).length();

    // if determine is negative, we need to invert one scale
    let det = this.determinant();
    if ( det < 0 ) sx = - sx;

    // scale the rotation part
    matrix.copy( this );

    let invSX = 1 / sx;
    let invSY = 1 / sy;
    let invSZ = 1 / sz;

    matrix.elements[ 0 ] *= invSX;
    matrix.elements[ 1 ] *= invSX;
    matrix.elements[ 2 ] *= invSX;

    matrix.elements[ 4 ] *= invSY;
    matrix.elements[ 5 ] *= invSY;
    matrix.elements[ 6 ] *= invSY;

    matrix.elements[ 8 ] *= invSZ;
    matrix.elements[ 9 ] *= invSZ;
    matrix.elements[ 10 ] *= invSZ;

    quaternion.setFromRotationMatrix( matrix );
    return quaternion;
}

THREE.Object3D.prototype.worldQuaternion = function ()
{
    let quaternion = new THREE.Quaternion();
    this.getWorldQuaternion(quaternion);
    return quaternion;
}

THREE.Object3D.prototype.worldScale = function ()
{
    let scale = new THREE.Vector3();
    this.getWorldScale(scale);
    return scale;
}

THREE.Object3D.prototype.removeAllChildren = function()
{
    while(this.children.length !== 0)
    {
        this.remove(this.children[0]);
    }
}

// For memes
THREE.Quaternion.prototype.substract = function(quanternion)
{
    let firstQuat = this;
    firstQuat.x -= quanternion.x;
    firstQuat.y -= quanternion.y;
    firstQuat.z -= quanternion.z;
    firstQuat.w -= quanternion.w;
    return firstQuat;
}

THREE.Euler.prototype.substract = function(euler)
{
    let firstEuler = this.clone();
    firstEuler.x -= euler.x;
    firstEuler.y -= euler.y;
    firstEuler.z -= euler.z;
    return firstEuler;
}

THREE.Euler.prototype.sub = function(euler)
{
    let firstEuler = this;
    firstEuler.x -= euler.x;
    firstEuler.y -= euler.y;
    firstEuler.z -= euler.z;
    return firstEuler;
}

THREE.Euler.prototype.add = function(euler)
{
    let firstEuler = this;
    firstEuler.x += euler.x;
    firstEuler.y += euler.y;
    firstEuler.z += euler.z;
    return firstEuler;
}

THREE.Quaternion.prototype.applyMatrix4 = function(matrix)
{
    let rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(this);
    rotationMatrix.premultiply(matrix);
    this.copy(rotationMatrix.getRotation());
}
THREE.Vector3.prototype.substract = function(vector)
{
    let result = new THREE.Vector3().subVectors(this, vector);
    return result;
}

THREE.Matrix4.prototype.inverse = function()
{
    let matrix = new THREE.Matrix4().getInverse(this);
    return matrix;
}

THREE.Object3D.prototype.cloneMesh = function()
{
    return new this.constructor().copyMesh( this, true );
}

THREE.Vector3.prototype.substract = function(vector)
{
    return new THREE.Vector3().subVectors(this, vector);
}

THREE.Matrix4.prototype.x_axis = function ()
{
    let x = new THREE.Vector3();
    let y = new THREE.Vector3();
    let z = new THREE.Vector3();
    this.extractBasis(x, y, z);
    return x;
}

THREE.Vector3.prototype.isZero = function()
{
    return this.x === 0 && this.y === 0 && this.z === 0;
}

THREE.Object3D.prototype.copyMesh = function( source, recursive)
{
    if ( recursive === undefined ) recursive = true;

    this.name = source.name;

    this.up.copy( source.up );

    this.position.copy( source.position );
    this.quaternion.copy( source.quaternion );
    this.scale.copy( source.scale );

    this.matrix.copy( source.matrix );
    this.matrixWorld.copy( source.matrixWorld );

    this.matrixAutoUpdate = source.matrixAutoUpdate;
    this.matrixWorldNeedsUpdate = source.matrixWorldNeedsUpdate;

    this.layers.mask = source.layers.mask;
    this.visible = source.visible;

    this.castShadow = source.castShadow;
    this.receiveShadow = source.receiveShadow;

    this.frustumCulled = source.frustumCulled;
    this.renderOrder = source.renderOrder;

    if ( recursive === true ) {

        for ( var i = 0; i < source.children.length; i ++ ) {

            var child = source.children[ i ];
            if(child.type !== "Audio" && child.userData.type !== "IkHelper" && child.userData.type !== "BonesHelper")
            {
                this.add( child.clone() );
            }
        }
    }
    return this;
}

THREE.Object3D.prototype.copy = function ( source, recursive ) {

    if ( recursive === undefined ) recursive = true;

    this.name = source.name;

    this.up.copy( source.up );

    this.position.copy( source.position );
    this.quaternion.copy( source.quaternion );
    this.scale.copy( source.scale );

    this.matrix.copy( source.matrix );
    this.matrixWorld.copy( source.matrixWorld );

    this.matrixAutoUpdate = source.matrixAutoUpdate;
    this.matrixWorldNeedsUpdate = source.matrixWorldNeedsUpdate;

    this.layers.mask = source.layers.mask;
    this.visible = source.visible;

    this.castShadow = source.castShadow;
    this.receiveShadow = source.receiveShadow;

    this.frustumCulled = source.frustumCulled;
    this.renderOrder = source.renderOrder;

    this.userData = JSON.parse( JSON.stringify( source.userData ) );

    if ( recursive === true ) {

        for ( var i = 0; i < source.children.length; i ++ ) {

            var child = source.children[ i ];
            if(child.type !== "Audio" && (child.isMesh || child.userData.type !== "attachable")) {
                this.add( child.clone() );
            }
        }

    }

    return this;

}
