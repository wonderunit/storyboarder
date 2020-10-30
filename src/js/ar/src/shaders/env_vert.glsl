varying vec3 vWorldDirection;

#include <common>

void main() {
    vWorldDirection = transformDirection( position, modelMatrix );
    #include <begin_vertex>
    #include <project_vertex>

    mat4 viewWithoutTranslate = viewMatrix;
    viewWithoutTranslate[3][0] = 0.0;
    viewWithoutTranslate[3][1] = 0.0;
    viewWithoutTranslate[3][2] = 0.0;

    vec4 pos = projectionMatrix * viewMatrix * vec4( position, 1.0 );//gl_Position.w;

    gl_Position = pos.xyww;
}