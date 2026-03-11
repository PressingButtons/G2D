import { mat4 } from "./gl_matrix";
import { G2DMode, type G2DAttribute, type G2DChunkedBuffer, type G2DCircle, type G2DDrawable, type G2DGraphic, type G2DLine, type G2DMatrixAttribute, type G2DRect, type G2DTexture, type G2DVertexConfiguration } from "./types";

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
// Graphic Shape Generation
// ==================================================
export const G2DGenerateCircle = ( ):G2DCircle => {
    return {
        position: {x:0, y:0, z:0},
        radius: 1,
        color: [0, 0, 0, 1],
        mode: G2DMode.LINES
    }
}

export const G2DGenerateLine = ( ):G2DLine => {
    return {
        color: [0, 0, 0, 1],
        origin: { x:0, y:0 },
        vector: { x:0, y:0} ,
    }
}

export const G2DGenerateRect = ( ):G2DRect => {
    return {
        position: {x:0, y:0, z:0},
        rotation: {x:0, y:0, z:0},
        size: {width: 1, height: 1},
        color: [0, 0, 0, 1],
        mode: G2DMode.LINES
    }
}

export const G2DGenerateTexture = ( ):G2DTexture => {
    return Object.assign( G2DGenerateRect( ), {
        texture: {uri: '', index: 0}
    })
}

export const G2DGetDrawMode = ( gl:WebGL2RenderingContext, mode:G2DMode ) => {
    if( mode == G2DMode.LINES )
        return gl.LINE_LOOP;
    else if( mode == G2DMode.SOLID )
        return gl.TRIANGLE_FAN
    else 
        return gl.TRIANGLE_STRIP;
}

export const G2DLoadBitmap = ( uri:string ) => {
    return fetch( uri ).then( res => res.blob( ) ).then( createImageBitmap );
}

export const G2DLoadTexture = async ( gl:WebGL2RenderingContext, uri:string, cellHeight?:number ) => {
    const bitmap = await G2DLoadBitmap( uri );
    return G2DCreateTexture( gl, bitmap, cellHeight )
}

export const G2DSetProjection = (gl:WebGL2RenderingContext, uniform:WebGLUniformLocation, view:[number, number, number], matrix:Float32Array ) => {
    const w = gl.canvas.width  * 0.5;
    const h = gl.canvas.height * 0.5;
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
export const G2DTransformCircle = ( gl:WebGL2RenderingContext, object:G2DDrawable, graphic:G2DCircle, transform:G2DChunkedBuffer, color:G2DChunkedBuffer ) =>{
    mat4.fromTranslation(transform.data, 
        object.position.x + graphic.position.x, 
        object.position.y + graphic.position.y,
        (object.position.z || 0) + graphic.position.z
    );

    mat4.scale( transform.data,
        graphic.radius,
        graphic.radius,
        1
    );

    color.data.set(graphic.color);

    G2DUpdateBuffer(gl, transform.buffer, transform.data);
    G2DUpdateBuffer(gl, color.buffer, color.data);
}

export const G2DTransformLine = ( gl:WebGL2RenderingContext, object:G2DDrawable, graphic:G2DLine, line:G2DChunkedBuffer, color:G2DChunkedBuffer ) =>{
    line.data.set([
        object.position.x + graphic.origin.x,
        object.position.y + graphic.origin.y,
        object.position.x + graphic.vector.x,
        object.position.y + graphic.vector.y
    ]);

    color.data.set(graphic.color);

    G2DUpdateBuffer(gl, line.buffer, line.data);
    G2DUpdateBuffer(gl, color.buffer, color.data);
}

export const G2DTransformRect = ( gl:WebGL2RenderingContext, object:G2DDrawable, graphic:G2DRect, transform:G2DChunkedBuffer, color:G2DChunkedBuffer ) =>{
    mat4.fromTranslation(transform.data, 
        object.position.x + graphic.position.x, 
        object.position.y + graphic.position.y,
        (object.position.z || 0) + graphic.position.z
    );
    mat4.rotateX( transform.data, graphic.rotation.x );
    mat4.rotateY( transform.data, graphic.rotation.y );
    mat4.rotateZ( transform.data, graphic.rotation.z );

    mat4.scale( transform.data,
        graphic.size.width * 0.5,
        graphic.size.height * 0.5,
        1
    );

    color.data.set(graphic.color);

    G2DUpdateBuffer(gl, transform.buffer, transform.data);
    G2DUpdateBuffer(gl, color.buffer, color.data);
}

export const G2DTransformTexture = ( gl:WebGL2RenderingContext, object:G2DDrawable, graphic:G2DTexture, transform:G2DChunkedBuffer, color:G2DChunkedBuffer ) =>{
    mat4.fromTranslation(transform.data, 
        object.position.x + graphic.position.x, 
        object.position.y + graphic.position.y,
        (object.position.z || 0) + graphic.position.z
    );
    mat4.rotateX( transform.data, graphic.rotation.x );
    mat4.rotateY( transform.data, graphic.rotation.y );
    mat4.rotateZ( transform.data, graphic.rotation.z );

    mat4.scale( transform.data,
        graphic.size.width * 0.5,
        graphic.size.height * 0.5,
        1
    );

    transform.data[16] = graphic.texture.index;
    if( graphic.palette )
        transform.data[17] = graphic.palette.index;

    color.data.set(graphic.color);

    G2DUpdateBuffer(gl, transform.buffer, transform.data);
    G2DUpdateBuffer(gl, color.buffer, color.data);
}

export const G2DUpdateBuffer = ( gl:WebGL2RenderingContext, buffer:WebGLBuffer, data:Float16Array, offset:number = 0 ) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, offset, data);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

