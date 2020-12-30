#include <envmap_common_pars_fragment>

uniform float opacity;
uniform vec3 color;

varying vec3 vWorldDirection;

#include <cube_uv_reflection_fragment>

void main() {
    vec3 vReflect = vWorldDirection;
    vec4 envColor = vec4(color, 1.0);
    #include <envmap_fragment>
    gl_FragColor = envColor;
    gl_FragColor.a *= opacity;
    #include <tonemapping_fragment>
    #include <encodings_fragment>
}