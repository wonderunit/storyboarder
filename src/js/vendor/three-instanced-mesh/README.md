# three-instanced-mesh

Higher level abstraction of `THREE.InstancedBufferGeometry` for [three.js](https://github.com/mrdoob/three.js/). For a webgl level overview check out [TojiCode](http://blog.tojicode.com/2013/07/webgl-instancing-with.html). For a more in depth overview on how this works, [i've written an article more or less on how to build this from scratch](https://medium.com/@pailhead011/instancing-with-three-js-36b4b62bc127).

## note

The signature for `THREE.InstancedBufferAttribute` changed with version R96. ~0.96.0 of this package should work with >= R96, the previous one with the older.~ 0.96.1 should work with all versions of three. 

# API

## Methods:

**.setPositionAt( index: Int , position: THREE.Vector3 )**

_Updates the position attribute at given index._

**.setQuaternionAt( index: Int , quaternion: THREE.Quaternion )**

_Updates the quaternion attribute at given index._

**.setScaleAt( index: Int , scale: THREE.Vector3 )**

_Updates the scale attribute at given index._

**.setColorAt( index: Int , color: THREE.Color )**

_Updates the color attribute at given index if instance colors are enabled._

**.getPositionAt( index: Int , target: THREE.Vector3)**

_Write value from position attribute at index into target THREE.Vector3._

**.getQuaternionAt( index: Int , target: THREE.Quaternion)**

_Write value from quaternion attribute at index into target THREE.Quaternion._

**.getScaleAt( index: Int , target: THREE.Vector3)**

_Write value from scale attribute at index into target THREE.Vector3._

**.getColorAt( index: Int , target: THREE.Color)**

_Write value from color attribute at index into target THREE.Color if instance colors are enabled._

**.needsUpdate( attributeName: String )**

_Set appropriate attribute needsUpdate flags. If `attributeName` is omitted all of the attributes will be marked for updates. Valid names are `position, quaternion, scale, colors`._

## Properties:

All of these have some side effects. This should probably be revisited but here are some notes:

**.material: THREE.Material**

_Whenever you set `myInstanceMesh.material = material` the material will be cloned and decorated with the instancing flags. This is supposed to make it simple to use, but is quite a side effect._

**.numInstances: Int**

_Number of instances, when this changes the attributes need to be reinstantiated._ 

**.geometry: THREE.BufferGeometry**

_If regular BufferGeometry is passed, this will create an instance of InstancedBufferGeometry and copy the attributes into it._ 





# what it should do

Provide an abstraction for relatively low level `THREE.InstancedBufferGeometry`, allows for the instancing attributes to be setup by a "placement function" and converts a regular buffer geometry to instanced. This is a modified [example](http://dusanbosnjak.com/test/webGL/three-instanced-mesh/webgl_performance_doublesided.html) running 30k objects instead of 5. All of the objects should be drawn with one draw call, thus speeding things up. It does a simple transformation of normals to view space if the instances are known to be uniformly scaled. If not, it does a mat3 inversion on the gpu (yikes!) but it works. 

- [Working with shadows.](http://dusanbosnjak.com/test/webGL/three-instanced-mesh/webgl_instanced_mesh_v4.html)
- [An attampt at "auto instancing"](http://dusanbosnjak.com/test/webGL/three-auto-instancing/)

So for example, if you have static world assets that need to be scattered, you can group them with this thus saving a bit of memory (over merging) and a bit of overhead ( less draw calls ). You should still probably take care of how the assets are grouped so they could be culled. The class computes no bounding information. Swithing to different geometries should be really fast since only one is uploaded to the gpu, it shouldn't stutter much when initializing new geometry (when you first change the box to a sphere in the example).

In order to pull this off with three.js you need some 400 lines of code as per this example. https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_buffergeometry_instancing_lambert.html

# how it works

- Including the module will allow the usage of `THREE.InstancedMesh` constructor. This will also patch different shader chunks to attach the instancing logic to `THREE.ShaderChunks{}` (overrides certain chunks).
- A `THREE.InstancedBufferGeometry` is instantiated and the provided `THREE.BufferGeometry` argument copied into it (instancing only works on `InstancedBufferGeometry`).
- Three optimization flags - `dynamic`, `uniformScale` and `colors` are set. These should only be provided upon construction. `color` would instantiate another buffer which is wasteful if not used, `uniform` would require a shader recompilation (when false it uses a branch in glsl to do a heavy matrix computation), `dynamic` sets a buffer of a different type and is a property of `THREE.BufferGeometry`.
- Instancing attributes are set taking these flags into consideration (`instancePosition`,`instanceQuaternion` and `instanceScale` are always created, `instanceColor` depends on the flag). Their arrays are **not instantiated**. *The idea behind this is noble, why do any work you are going to make reduntant right away. Scale on the other hand can likely be just 1,1,1, maybe an optional method to "init" the mesh should be provided? Please give feedback*
- **The provided material is cloned.** It needs to be decorated with defines, `customDistanceMaterial` and `customDepthMaterial` in order to allow for instancing to interact with the rest of three's rendering logic that relies on depth (shadows, AO...). Three manages the default materials under the hood of `THREE.WebGLRenderer`. Internally it holds a cache of shader programs which are created based on the properties of a `Material` (and other stuff like lights). In order to not alter the renderer. This is all done here through a fancy `.material` setter, which is not the most elegant solution. *Please provide feedback and use cases.*
- Methods are used to fill buffers. 

# Usage

[![NPM](https://nodei.co/npm/three-instanced-mesh.png)](https://npmjs.org/package/three-instanced-mesh)

```javascript

//var InstancedMesh = require('three-instanced-mesh')( THREE ); //should replace shaders on first call

//or just patch three
require( 'three-instanced-mesh' )(THREE);

//geometry to be instanced
var boxGeometry = new THREE.BoxBufferGeometry(2,2,2,1,1,1);

//material that the geometry will use
var material = new THREE.MeshPhongMaterial();

//the instance group
var cluster = new THREE.InstancedMesh( 
  boxGeometry,                 //this is the same 
  material, 
  10000,                       //instance count
  false,                       //is it dynamic
  false                        //does it have color
  true,                        //uniform scale, if you know that the placement function will not do a non-uniform scale, this will optimize the shader
);

var _v3 = new THREE.Vector3();
var _q = new THREE.Quaternion();

for ( var i = 0 ; i < 10000 ; i ++ ) {
  
  cluster.setQuaternionAt( i , _q );
  cluster.setPositionAt( i , _v3.set( Math.random() , Math.random(), Math.random() ) );
  cluster.setScaleAt( i , _v3.set(1,1,1) );

}

scene.add( cluster );
```

## please provide feedback or examples use cases:)


A man once stopped me in the street down in the TenderLoin and asked me "What's the best nation?" and I said "Giants!" thinking he said "Who's the best in the nation?". The answer was "Donation". If you find this useful you can totally support it by [donating to my pizza budget](http://paypal.me/pailhead) :) 
