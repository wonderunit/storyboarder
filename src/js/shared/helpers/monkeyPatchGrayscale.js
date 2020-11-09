/// Monkey path three js to have grayscale effect
const THREE = require('three')
const {fragmentShaderChunk } = require("../../shot-generator/helpers/GrayscaleFragmentShader")
let toonFragmentShader = THREE.ShaderLib.toon.fragmentShader
THREE.ShaderLib.toon.fragmentShader = toonFragmentShader.replace(/\}\s*$/, fragmentShaderChunk + '\n}' )
///