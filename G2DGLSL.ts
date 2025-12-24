const colorVertex =
`#version 300 es

layout (location=0) in vec4 a_position;
layout (location=1) in mat4 a_transform;
layout (location=5) in vec4 a_color;

uniform mat4 u_projection;

out vec4 v_color;

void main( ) {
    gl_Position = u_projection * a_transform * a_position;
    v_color = a_color;
}`

const colorFragment =
`#version 300 es

precision mediump float;

in  vec4 v_color;
out vec4 color;

void main( ) {
    color = v_color;
}`

const lineVertex = 
`#version 300 es

layout (location=0) in vec4 a_position;
layout (location=1) in vec4 a_color;

uniform mat4 u_projection;

out vec4 v_color;

void main( ) {
    gl_Position = u_projection * a_position;
    v_color = a_color;
}`


const textureVertex =
`#version 300 es

layout (location=0) in vec4 a_position;
layout (location=1) in vec2 a_texcoord;
layout (location=2) in mat4 a_transform;
layout (location=6) in vec4 a_color;
layout (location=10) in float a_depth;

uniform mat4 u_projection;

out float v_depth;
out vec4  v_color;
out vec2  v_texcoord;

void main( ) {
    gl_Position = u_projection * a_transform * a_position;
    v_texcoord = a_texcoord;
    v_color = a_color;
    v_depth = a_depth;
}`

const textureFragment =
`#version 300 es

precision mediump float;

uniform mediump sampler2DArray u_texture;

in vec4  v_color;
in vec2  v_texcoord;
in float v_depth;
out vec4 pixel;

void main( ) {
    pixel = texture(u_texture, vec3(v_texcoord, v_depth)) * v_color;
}`

export default { 
    colorFragment, 
    colorVertex, 
    lineVertex,
    textureVertex, 
    textureFragment
};