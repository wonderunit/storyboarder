/**************************
 * Dusan Bosnjak @pailhead
 **************************/

module.exports = [

"#if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP ) || defined( USE_ROUGHNESSMAP ) || defined( USE_METALNESSMAP )",
 
  "varying vec2 vUv;",
  
  "uniform mat3 uvTransform;",

"#endif",

"#ifdef INSTANCE_TRANSFORM",

//for dynamic, avoid computing the matrices on the cpu
"attribute vec3 instancePosition;",
"attribute vec4 instanceQuaternion;",
"attribute vec3 instanceScale;",

"#if defined( INSTANCE_COLOR )",
  "attribute vec3 instanceColor;",
  "varying vec3 vInstanceColor;",
"#endif",

"mat4 getInstanceMatrix(){",

  "vec4 q = instanceQuaternion;",
  "vec3 s = instanceScale;",
  "vec3 v = instancePosition;",

  "vec3 q2 = q.xyz + q.xyz;",
  "vec3 a = q.xxx * q2.xyz;",
  "vec3 b = q.yyz * q2.yzz;",
  "vec3 c = q.www * q2.xyz;",

  "vec3 r0 = vec3( 1.0 - (b.x + b.z) , a.y + c.z , a.z - c.y ) * s.xxx;",
  "vec3 r1 = vec3( a.y - c.z , 1.0 - (a.x + b.z) , b.y + c.x ) * s.yyy;",
  "vec3 r2 = vec3( a.z + c.y , b.y - c.x , 1.0 - (a.x + b.x) ) * s.zzz;",

  "return mat4(",

      "r0 , 0.0,",
      "r1 , 0.0,",
      "r2 , 0.0,",
      "v  , 1.0",

  ");",

"}",

"#endif"

].join("\n");

