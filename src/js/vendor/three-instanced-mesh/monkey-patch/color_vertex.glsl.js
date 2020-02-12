/**************************
 * Dusan Bosnjak @pailhead
 **************************/

// read per instance color from attribute, pass to varying

module.exports = [

"#ifdef USE_COLOR",

	"vColor.xyz = color.xyz;",

"#endif",

"#if defined( INSTANCE_COLOR ) && defined( INSTANCE_TRANSFORM )",
		
	"vInstanceColor = instanceColor;",
		
"#endif",

].join("\n")