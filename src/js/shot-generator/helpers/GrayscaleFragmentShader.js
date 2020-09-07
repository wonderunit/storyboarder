

export const fragmentShaderChunk = [
    "  #ifdef GRAYSCALE",
    "   float gray = dot(gl_FragColor.rgb, vec3(0.2627, 0.678, 0.0593));",
    "   vec3 grayscale = vec3(gray);",
    "	gl_FragColor = vec4(grayscale, gl_FragColor.a );",
    "  #endif",
].join("\n")

