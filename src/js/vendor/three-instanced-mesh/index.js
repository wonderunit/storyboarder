/**************************
 * Dusan Bosnjak @pailhead
 **************************/
 
module.exports = function( THREE ){

const differentSignature = parseInt(THREE.REVISION) >= 96

//monkeypatch shaders
require('./monkey-patch.js')(THREE);


//depth mat
var DEPTH_MATERIAL = new THREE.MeshDepthMaterial();

DEPTH_MATERIAL.depthPacking = THREE.RGBADepthPacking;

DEPTH_MATERIAL.clipping = true;

DEPTH_MATERIAL.defines = {

	INSTANCE_TRANSFORM: ''

};

//distance mat
var 
	
	DISTANCE_SHADER = THREE.ShaderLib[ "distanceRGBA" ],
	DISTANCE_UNIFORMS = THREE.UniformsUtils.clone( DISTANCE_SHADER.uniforms ),
	DISTANCE_DEFINES = {
		'USE_SHADOWMAP': '',
		'INSTANCE_TRANSFORM': ''
	},
	DISTANCE_MATERIAL = new THREE.ShaderMaterial( {
		defines: DISTANCE_DEFINES,
		uniforms: DISTANCE_UNIFORMS,
		vertexShader: DISTANCE_SHADER.vertexShader,
		fragmentShader: DISTANCE_SHADER.fragmentShader,
		clipping: true
	})
;

//main class
THREE.InstancedMesh = function ( 
	bufferGeometry, 
	material, 
	numInstances, 
	dynamic, 
	colors, 
	uniformScale 
) {

	THREE.Mesh.call( this , (new THREE.InstancedBufferGeometry()).copy( bufferGeometry ) ); //hacky for now

	this._dynamic = !!dynamic; //TODO: set a bit mask for different attributes?

 	this._uniformScale = !!uniformScale;

 	this._colors = !!colors;

	this.numInstances = numInstances;

	this._setAttributes();

	/**
	 * use the setter to decorate this material
	 * this is in lieu of changing the renderer
	 * WebGLRenderer injects stuff like this
	 */
	this.material = material.clone();
 	
	this.frustumCulled = false; //you can uncheck this if you generate your own bounding info

	//make it work with depth effects
	this.customDepthMaterial = DEPTH_MATERIAL; 

	this.customDistanceMaterial = DISTANCE_MATERIAL;

}

THREE.InstancedMesh.prototype = Object.create( THREE.Mesh.prototype );

THREE.InstancedMesh.constructor = THREE.InstancedMesh;

//this is kinda gnarly, done in order to avoid setting these defines in the WebGLRenderer (it manages most if not all of the define flags)
Object.defineProperties( THREE.InstancedMesh.prototype , {

	'material': {

		set: function( m ){ 

			/**
			 * whenever a material is set, decorate it, 
			 * if a material used with regular geometry is passed, 
			 * it will mutate it which is bad mkay
			 *
			 * either flag Material with these instance properties:
			 * 
			 *  "i want to create a RED PLASTIC material that will
			 *   be INSTANCED and i know it will be used on clones
			 *   that are known to be UNIFORMly scaled"
			 *  (also figure out where dynamic fits here)
			 *  
			 * or check here if the material has INSTANCE_TRANSFORM
			 * define set, if not, clone, document that it breaks reference
			 * or do a shallow copy or something
			 * 
			 * or something else?
			 */
			m = m.clone();

			if ( m.defines ) {
				
				m.defines.INSTANCE_TRANSFORM = '';
				
				if ( this._uniformScale ) m.defines.INSTANCE_UNIFORM = ''; //an optimization, should avoid doing an expensive matrix inverse in the shader
				else delete m.defines['INSTANCE_UNIFORM'];

				if ( this._colors ) m.defines.INSTANCE_COLOR = '';
				else delete m.defines['INSTANCE_COLOR'];
			}

			else{ 
			
				m.defines = { INSTANCE_TRANSFORM: '' };

				if ( this._uniformScale ) m.defines.INSTANCE_UNIFORM = '';
				if ( this._colors ) m.defines.INSTANCE_COLOR = '';
			}

			this._material = m;

		},

		get: function(){ return this._material; }

	},

	//force new attributes to be created when set?
	'numInstances': {

		set: function( v ){ 

			this._numInstances = v;

			//reset buffers

			this._setAttributes();

		},

		get: function(){ return this._numInstances; }

	},

	//do some auto-magic when BufferGeometry is set
	//TODO: account for Geometry, or change this approach completely 
	'geometry':{

		set: function( g ){ 

			//if its not already instanced attach buffers
			if ( !!g.attributes.instancePosition ) {

				this._geometry = new THREE.InstancedBufferGeometry();

				this._setAttributes();

			} 

			else 

				this._geometry = g;

		},

		get: function(){ return this._geometry; }

	}

});

THREE.InstancedMesh.prototype.setPositionAt = function( index , position ){

	this.geometry.attributes.instancePosition.setXYZ( index , position.x , position.y , position.z );

};

THREE.InstancedMesh.prototype.setQuaternionAt = function ( index , quat ) {

	this.geometry.attributes.instanceQuaternion.setXYZW( index , quat.x , quat.y , quat.z , quat.w );

};

THREE.InstancedMesh.prototype.setScaleAt = function ( index , scale ) {

	this.geometry.attributes.instanceScale.setXYZ( index , scale.x , scale.y , scale.z );

};

THREE.InstancedMesh.prototype.setColorAt = function ( index , color ) {

	if( !this._colors ) {

		console.warn( 'THREE.InstancedMesh: color not enabled');

		return;

	}

	this.geometry.attributes.instanceColor.setXYZ( 
		index , 
		Math.floor( color.r * 255 ), 
		Math.floor( color.g * 255 ), 
		Math.floor( color.b * 255 )
	);

};

THREE.InstancedMesh.prototype.getPositionAt = function( index , position ){

	var arr = this.geometry.attributes.instancePosition.array;

	index *= 3;

	return position ? 

		position.set( arr[index++], arr[index++], arr[index] ) :

		new THREE.Vector3(  arr[index++], arr[index++], arr[index] )
	;
	
};

THREE.InstancedMesh.prototype.getQuaternionAt = function ( index , quat ) {

	var arr = this.geometry.attributes.instanceQuaternion.array;

	index = index << 2;

	return quat ? 

		quat.set(       arr[index++], arr[index++], arr[index++], arr[index] ) :

		new THREE.Quaternion( arr[index++], arr[index++], arr[index++], arr[index] )
	;
	
};

THREE.InstancedMesh.prototype.getScaleAt = function ( index , scale ) {

	var arr = this.geometry.attributes.instanceScale.array;

	index *= 3;

	return scale ? 

		scale.set(   arr[index++], arr[index++], arr[index] ) :

		new THREE.Vector3( arr[index++], arr[index++], arr[index] )
	;

};

THREE.InstancedMesh.prototype.getColorAt = (function(){

	var inv255 = 1/255;

	return function ( index , color ) {

		if( !this._colors ) {

			console.warn( 'THREE.InstancedMesh: color not enabled');

			return false;

		}

		var arr = this.geometry.attributes.instanceColor.array;
		
		index *= 3;

		return color ? 

			color.setRGB( arr[index++] * inv255, arr[index++] * inv255, arr[index] * inv255 ) :

			new THREE.Vector3( arr[index++], arr[index++], arr[index] ).multiplyScalar( inv255 )
		;

	};

})()

THREE.InstancedMesh.prototype.needsUpdate = function( attribute ){

	switch ( attribute ){

		case 'position' :

			this.geometry.attributes.instancePosition.needsUpdate =   true;

			break;

		case 'quaternion' :

			this.geometry.attributes.instanceQuaternion.needsUpdate = true;

			break;

		case 'scale' :

			this.geometry.attributes.instanceScale.needsUpdate =      true;

			break;

		case 'colors' :

			this.geometry.attributes.instanceColor.needsUpdate =      true;

			break;
			
		default:

			this.geometry.attributes.instancePosition.needsUpdate =   true;
			this.geometry.attributes.instanceQuaternion.needsUpdate = true;
			this.geometry.attributes.instanceScale.needsUpdate =      true;
		
			if(this._colors){
				this.geometry.attributes.instanceColor.needsUpdate =      true;
			}

			break;

	}

};

THREE.InstancedMesh.prototype._setAttributes = function(){

	var normalized = true
	var meshPerAttribute = 1 
	var vec4Size = 4
	var vec3Size = 3

	var attributes = {
		instancePosition: [
			new Float32Array( this.numInstances * vec3Size ), 
			vec3Size, 
			!normalized, 
			meshPerAttribute,
		],
		instanceQuaternion: [
			new Float32Array( this.numInstances * vec4Size ), 
			vec4Size, 
			!normalized, 
			meshPerAttribute,
		],
		instanceScale: [
			new Float32Array( this.numInstances * vec3Size ), 
			vec3Size, 
			!normalized,
			meshPerAttribute,
		]
	}

	if ( this._colors ){
		attributes.instanceColor = [
			new Uint8Array( this.numInstances * vec3Size ), 
			vec3Size, 
			normalized, 
			meshPerAttribute,
		]
	}

	Object.keys(attributes).forEach(name=>{
		const a = attributes[name]
		let attribute
		if(differentSignature){
			attribute = new THREE.InstancedBufferAttribute(...a)
		} else {
			attribute = new THREE.InstancedBufferAttribute(a[0],a[1],a[3])
			attribute.normalized = a[2]
		}
			
		attribute.dynamic = this._dynamic
		this.geometry.addAttribute(name, attribute)
	})

};

return THREE.InstancedMesh;

};
