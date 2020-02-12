/**************************
 * Dusan Bosnjak @pailhead
 **************************/

module.exports = function( THREE ){

	//patches these methods and shader chunks with the required logic 
	THREE.ShaderChunk[ 'begin_vertex' ] = 				require('./begin_vertex.glsl.js'); 
	THREE.ShaderChunk[ 'color_fragment' ] = 			require('./color_fragment.glsl.js');
	THREE.ShaderChunk[ 'color_pars_fragment' ] = 		require('./color_pars_fragment.glsl.js');
	THREE.ShaderChunk[ 'color_vertex' ] = 				require('./color_vertex.glsl.js');
	THREE.ShaderChunk[ 'defaultnormal_vertex' ] = 		require('./defaultnormal_vertex.glsl.js');
	THREE.ShaderChunk[ 'uv_pars_vertex' ] = 			require('./uv_pars_vertex.glsl.js');
	
}