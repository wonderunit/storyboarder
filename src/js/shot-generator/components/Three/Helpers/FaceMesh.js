
import getMidpoint from './midpoint'
var basePosition = new THREE.Vector3();

var skinIndex = new THREE.Vector4();
var skinWeight = new THREE.Vector4();

let vector = new THREE.Vector3();
let _morphA = new THREE.Vector3();
let _morphB = new THREE.Vector3();
let _morphC = new THREE.Vector3();
let _tempA = new THREE.Vector3();
let _tempB = new THREE.Vector3();
let _tempC = new THREE.Vector3();
let matrix = new THREE.Matrix4();
let _uvA = new THREE.Vector2();
let _uvB = new THREE.Vector2();
let _uvC = new THREE.Vector2();
let _vA = new THREE.Vector3();
let _vB = new THREE.Vector3();
let _vC = new THREE.Vector3();
const applyMorph = (_vA, _vB, _vC, morphPosition, morphInfluences) => {
    _morphA.set( 0, 0, 0 );
    _morphB.set( 0, 0, 0 );
    _morphC.set( 0, 0, 0 );

    for ( let i = 0, il = morphPosition.length; i < il; i ++ ) {

        var influence = morphInfluences[ i ];
        var morphAttribute = morphPosition[ i ];

        if ( influence === 0 ) continue;

        _tempA.fromBufferAttribute( morphAttribute, a );
        _tempB.fromBufferAttribute( morphAttribute, b );
        _tempC.fromBufferAttribute( morphAttribute, c );

        if ( morphTargetsRelative ) {

            _morphA.addScaledVector( _tempA, influence );
            _morphB.addScaledVector( _tempB, influence );
            _morphC.addScaledVector( _tempC, influence );

        } else {

            _morphA.addScaledVector( _tempA.sub( _vA ), influence );
            _morphB.addScaledVector( _tempB.sub( _vB ), influence );
            _morphC.addScaledVector( _tempC.sub( _vC ), influence );

        }

    }

    _vA.add( _morphA );
    _vB.add( _morphB );
    _vC.add( _morphC );
}

THREE.SkinnedMesh.prototype.boneTransform = function(index, target ) {
        var skeleton = this.skeleton;
        var geometry = this.geometry;

        skinIndex.fromBufferAttribute( geometry.attributes.skinIndex, index );
        skinWeight.fromBufferAttribute( geometry.attributes.skinWeight, index );

        basePosition.fromBufferAttribute( geometry.attributes.position, index ).applyMatrix4( this.bindMatrix );

        target.set( 0, 0, 0 );

        for ( var i = 0; i < 4; i ++ ) {

            var weight = skinWeight.getComponent( i );

            if ( weight !== 0 ) {

                var boneIndex = skinIndex.getComponent( i );

                matrix.multiplyMatrices( skeleton.bones[ boneIndex ].matrixWorld, skeleton.boneInverses[ boneIndex ] );

                target.addScaledVector( vector.copy( basePosition ).applyMatrix4( matrix ), weight );

            }

        }

        return target.applyMatrix4( this.bindMatrixInverse );
}

class FaceMesh {
    constructor() {
        this.drawingCanvas = document.createElement("canvas");
        this.drawingCtx = this.drawingCanvas.getContext("2d");
        this.skinnedMesh = null;
        this.canvasBox = { left: 0, top: 0, width: 0, height: 0}
    }

    setSkinnedMesh(skinnedMesh, gl) {
        this.skinnedMesh = skinnedMesh;
        this.image = skinnedMesh.material.map.image;

        this.drawingCanvas.width = this.image.width;
        this.drawingCanvas.height = this.image.height;
        let texture = new THREE.Texture(this.drawingCanvas);
        texture.flipY = false
        this.drawingCtx.drawImage(this.image, 0, 0, this.image.width, this.image.height);
        this.skinnedMesh.material.map = texture
        this.skinnedMesh.material.map.needsUpdate = true;
        this.gl = gl;
        this.updateCanvasBox()

    }

    updateCanvasBox() {
        let gl = this.gl
        let canvaRect = gl.domElement.getBoundingClientRect();
        let docElement = gl.domElement.ownerDocument.documentElement;
        this.canvasBox.left = canvaRect.left + window.pageXOffset - docElement.clientLeft;
        this.canvasBox.top = canvaRect.top + window.pageYOffset - docElement.clientTop;
        this.canvasBox.widht = canvaRect.widht;
        this.canvasBox.height = canvaRect.height;
    }

    facesSearch(interactionPoint, headBone) {
        let object = this.skinnedMesh
        let geometry = this.skinnedMesh.geometry
        let drawRange = geometry.drawRange;
        let index = geometry.index;
        let uv = geometry.attributes.uv;
        let uv2 = geometry.attributes.uv2;
        let position = geometry.attributes.position
        let morphPosition = geometry.morphAttributes.position;
		let start = Math.max( 0, drawRange.start );
        let end = Math.min( index.count, ( drawRange.start + drawRange.count ) );

        let dir = new THREE.Vector3()
        headBone.getWorldDirection(dir)
        let dist = dir.clone().normalize().setLength(2)
        interactionPoint.add(dist)
        dir.negate()
        let target = new THREE.Vector3()
        let ray = new THREE.Ray(interactionPoint, dir)
        let _inverseMatrix = new THREE.Matrix4()
        _inverseMatrix.getInverse( object.matrixWorld );
		ray.applyMatrix4( _inverseMatrix );
        let material = object.material
        let point = new THREE.Vector3()
        for ( let i = start, il = end; i < il; i += 3 ) {

            let a = index.getX(i);
            let b =  index.getX(i + 1);
            let c =  index.getX(i + 2);
            _vA.fromBufferAttribute(position, a)
            _vB.fromBufferAttribute(position, b)
            _vC.fromBufferAttribute(position, c)
            var morphInfluences = object.morphTargetInfluences;
            //#region Apply morph 
            applyMorph(_vA, _vB, _vC, morphPosition, morphInfluences)
            ////#endregion

            object.boneTransform(a, _vA)
            object.boneTransform(b, _vB)
            object.boneTransform(c, _vC)

            let intersect
            if ( material.side === THREE.BackSide ) {

                intersect = ray.intersectTriangle( _vC, _vB, _vA, true, target );
        
            } else {
        
                intersect = ray.intersectTriangle( _vA, _vB, _vC, material.side !== THREE.DoubleSide, target );
        
            }
            if(!intersect) continue 
            point.copy(target)
	        point.applyMatrix4( object.matrixWorld );
	        var distance = ray.origin.distanceTo( point );

            if ( uv ) {
                _uvA.fromBufferAttribute( uv, a );
                _uvB.fromBufferAttribute( uv, b );
                _uvC.fromBufferAttribute( uv, c );
    
                intersect.uv = THREE.Triangle.getUV( target, _vA, _vB, _vC, _uvA, _uvB, _uvC, new THREE.Vector2() );
    
            }
    
            if ( uv2 ) {
    
                _uvA.fromBufferAttribute( uv2, a );
                _uvB.fromBufferAttribute( uv2, b );
                _uvC.fromBufferAttribute( uv2, c );
    
                intersect.uv2 = THREE.Triangle.getUV( target, _vA, _vB, _vC, _uvA, _uvB, _uvC, new THREE.Vector2() );
    
            }
            intersect.faceIndex = Math.floor( i / 3 ); // triangle number in indexed buffer semantics
            let face = new THREE.Face3( a, b, c );
            THREE.Triangle.getNormal( _vA, _vB, _vC, face.normal );
    
            intersect.face = face;
            intersect.distance = distance;
            intersect.point = point;
            return intersect;


        }
        return null
    }

    draw(texture) {
        this.updateCanvasBox()
        let headBone = this.skinnedMesh.skeleton.getBoneByName("Head")
        let leftEye = this.skinnedMesh.skeleton.getBoneByName("LeftEye")
        let rightEye = this.skinnedMesh.skeleton.getBoneByName("RightEye")
        let rightEyePosition = rightEye.worldPosition()
        let leftEyePosition = leftEye.worldPosition()
        let headPosition = headBone.worldPosition()
        let position = getMidpoint(headPosition, leftEyePosition, rightEyePosition)
        let uv = this.facesSearch(position, headBone).uv
        let meshPos = {
            x: uv.x * this.image.width,
            y: uv.y * this.image.height
        }
        let emotionImage = texture.image
        this.drawingCtx.drawImage(this.image, 0, 0, this.image.width, this.image.height);
        this.drawingCtx.drawImage(emotionImage, meshPos.x - emotionImage.width / 2, meshPos.y - emotionImage.height / 2, emotionImage.width, emotionImage.height);
        this.skinnedMesh.material.map.needsUpdate = true;
    }
}
export default FaceMesh;