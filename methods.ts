import { G2DLine, G2DPolygon } from "./classes";
import { mat4 } from "./gl_matrix";
import { type G2DAttribute, type G2DChunkedBuffer, type G2DMatrixAttribute,  type G2DVertexConfiguration } from "./types";

// =============================================
// Compiling Shader Programs
// =============================================

export const G2DCompile = (gl:WebGL2RenderingContext, vsource:string, fsource:string ) => {
    const vshader = createShader(gl, vsource, gl.VERTEX_SHADER);
    const fshader = createShader(gl, fsource, gl.FRAGMENT_SHADER);
    return createProgram( gl, vshader, fshader );
}

const createShader = (gl:WebGL2RenderingContext, source:string, type:GLenum) => {
    const shader = gl.createShader(type) as WebGLShader;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if( gl.getShaderParameter(shader, gl.COMPILE_STATUS) )
        return shader;
    console.error( gl.getShaderInfoLog(shader) )
    throw 'Failed to compile ahsder';
}

const createProgram = ( gl:WebGL2RenderingContext, vshader:WebGLShader, fshader:WebGLShader ) => {
    const program = gl.createProgram( );
    gl.attachShader(program, vshader);
    gl.attachShader(program, fshader);
    gl.linkProgram(program);
    if( gl.getProgramParameter(program, gl.LINK_STATUS) )
        return program;
    console.error( gl.getProgramInfoLog(program) )
    throw 'Failed to link Program';
}

// ============================================
// Creating OBjects
// ============================================

export const G2DCreateBuffer = ( gl:WebGL2RenderingContext, data:Float16Array, usage:GLenum ) => {
    const buffer = gl.createBuffer( );
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buffer;
}

export const G2DCreateBufferWithChunks = ( gl:WebGL2RenderingContext, chunkSize:number, numChunks:number ):G2DChunkedBuffer => {
    const data = new Float16Array(numChunks * chunkSize);
    const chunks = new Array(numChunks).fill(0).map((_, i) => data.subarray(i * chunkSize, i * chunkSize + chunkSize));
    const buffer = G2DCreateBuffer(gl, data, gl.DYNAMIC_DRAW);
    return { buffer, data, chunks };
}

export const G2DCreateTexture = ( gl:WebGL2RenderingContext, bitmap:ImageBitmap, height?:number ) => {
    const texture = gl.createTexture( );
    height = height ? height : bitmap.height;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, bitmap.width, height, bitmap.height / height, 0, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    return texture;
}

// ===========================
// Creating Vertex
// ===========================

export const G2DCreateVertex = ( gl:WebGL2RenderingContext, config:G2DVertexConfiguration ) => {
    const vao = gl.createVertexArray( );
    for(const attribute of config.attributes )
        enableAttribute( gl, vao, config.program, attribute);
    return vao;
}

const enableAttribute = ( gl:WebGL2RenderingContext, vao:WebGLVertexArrayObject, program:WebGLProgram, attribute: G2DAttribute | G2DMatrixAttribute ) => {
    if( 'size' in attribute )
        setAttribute( gl, vao, program, attribute );
    else 
        setMatrixAttribute( gl, vao, program, attribute );
}

const setAttribute = (gl:WebGL2RenderingContext, vao:WebGLVertexArrayObject, program:WebGLProgram, attribute:G2DAttribute) => {
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, attribute.buffer);
    const location = gl.getAttribLocation( program, attribute.name );
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, attribute.size, gl.HALF_FLOAT, false, attribute.stride, attribute.offset );
    if( attribute.divisor != undefined)
        gl.vertexAttribDivisor(location, attribute.divisor);
}

const setMatrixAttribute = (gl:WebGL2RenderingContext, vao: WebGLVertexArrayObject, program:WebGLProgram, attribute:G2DMatrixAttribute ) => {
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, attribute.buffer);
    const location = gl.getAttribLocation( program, attribute.name );
    for(let i = 0; i < 4; i++ ) {
        gl.enableVertexAttribArray(location + i);
        gl.vertexAttribPointer(location + i, 4, gl.HALF_FLOAT, false, attribute.stride, attribute.offset + (8 * i) );
        gl.vertexAttribDivisor(location + i, 1);
    }
}

// ==================================
// Extracting Properties
// ==================================

export const G2DExtractUniforms = ( gl:WebGL2RenderingContext, program:WebGLProgram, ...names:string[] ) => {
    const uniforms:{[key:string]: WebGLUniformLocation} = { };
    for(const name of names) {
        const uniform = gl.getUniformLocation(program, name);
        if( uniform )
            uniforms[name] = uniform;
        else 
            throw `Uniform(${name}), does not exist in program`;
    }
    return uniforms;
}

// ==================================================
// Loading Graphic Data
// ==================================================
export const G2DLoadBitmap = ( uri:string ) => {
    return fetch( uri ).then( res => res.blob( ) ).then( createImageBitmap );
}

export const G2DLoadTexture = async ( gl:WebGL2RenderingContext, uri:string, cellHeight?:number ) => {
    const bitmap = await G2DLoadBitmap( uri );
    return G2DCreateTexture( gl, bitmap, cellHeight )
}

// ================================
// Setting Projection
// ================================

export const G2DSetProjection = (gl:WebGL2RenderingContext, uniform:WebGLUniformLocation, view:[number, number, number], matrix:Float32Array ) => {
    const w = (gl.canvas.width  * 0.5) / view[2];
    const h = (gl.canvas.height * 0.5) / view[2];
    mat4.ortho(
        matrix,
        view[0] - w,
        view[0] + w,
        view[1] + h, 
        view[1] - h,
        1,
       -1
    );
    gl.uniformMatrix4fv( uniform, false, matrix);
}

// ======================================
// Transformations
// ======================================
export const G2DTransformPolygon = ( gl:WebGL2RenderingContext, polygon:G2DPolygon, transform:G2DChunkedBuffer, color:G2DChunkedBuffer ) => {
    for( let i = 0; i < polygon.length; i++ ) {
        const pchunk = polygon.chunk(i);
        const tchunk = transform.chunks[i];
        const cchunk = color.chunks[i];
        mat4.fromTranslation( tchunk, pchunk.px + pchunk.ox, pchunk.py + pchunk.oy, pchunk.pz + pchunk.oz );
        mat4.rotateX( tchunk, pchunk.rx );
        mat4.rotateY( tchunk, pchunk.ry );
        mat4.rotateZ( tchunk, pchunk.rz );
        mat4.scale(tchunk, pchunk.width * 0.5, pchunk.height * 0.5);
        tchunk[16] = pchunk.depth;
        tchunk[17] = pchunk.palette;
        cchunk.set(pchunk.getColor( ));
    }

    G2DUpdateBuffer(gl, transform.buffer, transform.data );
    G2DUpdateBuffer(gl, color.buffer, color.data)
}

export const G2DTransformLine = ( gl:WebGL2RenderingContext, line:G2DLine, lineBuffer:G2DChunkedBuffer, color:G2DChunkedBuffer ) => {
    for( let i = 0; i < line.length; i++ ) {
        const lchunk = line.chunk(i);
        const bchunk = lineBuffer.chunks[i];
        const cchunk = color.chunks[i];
        bchunk.set([lchunk.px, lchunk.py, lchunk.vx, lchunk.vy]);
        cchunk.set(lchunk.getColor());
    }
    G2DUpdateBuffer(gl, lineBuffer.buffer, lineBuffer.data );
    G2DUpdateBuffer(gl, color.buffer, color.data)
}

export const G2DUpdateBuffer = ( gl:WebGL2RenderingContext, buffer:WebGLBuffer, data:Float16Array, offset:number = 0 ) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, offset, data);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

