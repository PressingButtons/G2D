import GLSL from './G2DGLSL';
import { G2DEnum, type G2DGraphicLayer } from "./G2DTypes";
import { mat4 } from "./gl_matrix";

let SolidRectModel:WebGLBuffer;
let LinedRectModel:WebGLBuffer;
let CircleModel:WebGLBuffer;
let TexModel:WebGLBuffer;
let ColorShader:G2DShader;
let TextureShader:G2DShader;
let AttTransform:G2DSegmentedBuffer;
let AttColor:G2DSegmentedBuffer;
let Projector:G2DProjectionModule;
let TextureLib:G2DTextureLib;
let gl:WebGL2RenderingContext;
const MAX_INSTANCES = 100;
let init = false;

export default function G2DBuild( canvas:HTMLCanvasElement, debug = false ) {
    if( !init || debug) {
        gl = canvas.transferControlToOffscreen( ).getContext('webgl2') as WebGL2RenderingContext;
        // =========================================
        SolidRectModel = G2DCreateBuffer(gl, [-1, -1, 1, -1, -1, 1, 1, 1], gl.STATIC_DRAW).buffer;
        LinedRectModel = G2DCreateBuffer(gl, [-1, -1, 1, -1, 1, 1, -1, 1], gl.STATIC_DRAW).buffer;
        CircleModel    = G2DCreateBuffer(gl, new Array(50).fill(0).map((_,i) => [Math.cos(i/50), Math.sin(i/50)]).flat( ), gl.STATIC_DRAW).buffer;
        TexModel       = G2DCreateBuffer(gl, [0, 0, 1, 0, 0, 1, 1, 1], gl.STATIC_DRAW).buffer;
        // =========================================
        AttTransform = G2DSegmentedBuffer(gl, 18, MAX_INSTANCES);
        AttColor = G2DSegmentedBuffer(gl, 4, MAX_INSTANCES);
        // =========================================
        Projector = G2DProjectionModule( gl );
        TextureLib = G2DTextureLib( gl );
        // =========================================
        ColorShader = CreateColorShader( gl );
        TextureShader = CreateTextureShader( gl );
        // =========================================
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // =========================================
        // =========================================
        init = true;
        console.log('G2D initialized');
    }
    return {
        fill:( color:[number, number, number, number] ) => {
            gl.clearColor(...color);
            gl.clear(gl.COLOR_BUFFER_BIT);
        },
        textures:TextureLib,
        G2DRect,
        G2DTexture
    }
}

const CreateColorShader = ( gl:WebGL2RenderingContext ) => {
    return G2DShader(gl, {
        source: {vertex: GLSL.colorVertex, fragment: GLSL.colorFragment },
        buffer: { transform: AttTransform.buffer, color: AttColor.buffer },
        uniforms:['u_projection'],
        forms: {
            [G2DEnum.SOLID_RECTANGLE]: {
                model: SolidRectModel
            },
            [G2DEnum.LINED_RECTANGLE]: {
                model: LinedRectModel
            }
        }
    });
}

const CreateTextureShader = ( gl:WebGL2RenderingContext ) => {
    return G2DShader(gl, {
        source: {vertex:GLSL.textureVertex, fragment:GLSL.textureFragment},
        buffer: {transform:AttTransform.buffer, color:AttColor.buffer},
        uniforms:['u_projection', 'u_texture'],
        forms: {
            [G2DEnum.SOLID_RECTANGLE]: {
                model:SolidRectModel,
                texcoord: TexModel,
            }
        }
    })
}

// ============================================
const G2DCreateBuffer = ( gl:WebGL2RenderingContext, values:number[], usage:GLenum ) => {
    const buffer = gl.createBuffer( );
    const data = new Float16Array(values);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    return { buffer, data };
}
// ============================================
type G2DLayerOptions = {
    x?:number, y?:number, z?:number, rx?:number, ry?:number, rz?:number, scale?:number, color?:Float16Array
}

class G2DGraphic {

    instances:G2DGraphicLayer[]
    #form:G2DEnum;
    #type:G2DEnum;

    protected constructor( form: G2DEnum, type:G2DEnum, options:G2DLayerOptions = {}) {
        this.instances = [];
        this.#form = form;
        this.#type = type;
        this.add(options);
    }

    get form( ) { return this.#form }
    get type( ) { return this.#type }
    protected set type( n:G2DEnum ) { this.#type = n }

    add( options:G2DLayerOptions = { }) {
        if( this.instances.length < MAX_INSTANCES) {
            let { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, scale = 1, color = new Float16Array([1, 1, 1, 1])} = options;
             this.instances.push({x, y, z, rx, ry, rz, scale, color});
        }
        return this.instances[this.instances.length - 1];
    }

    remove( i:number ) {
        this.instances.splice(i, 1);
        return this.instances.length;
    }

    draw( ) {

    }

}

class G2DRect extends G2DGraphic {

    w:number; 
    h:number;

    constructor( w:number, h:number, options:G2DLayerOptions = {}) {
        super( G2DEnum.RECTANGLE, G2DEnum.LINED_RECTANGLE, options );
        this.w = w;
        this.h = h;
    }

    draw( ) {
        ColorShader.activate( );
        ColorShader.use(this.type);
        gl.uniformMatrix4fv(ColorShader.uniform('u_projection'), false, Projector.value);
        const count = UpdateAttributes( this );
        let mode = this.type == G2DEnum.LINED_RECTANGLE ? gl.LINE_LOOP : gl.TRIANGLE_STRIP;
        gl.drawArraysInstanced(mode, 0, 4, count);
    }

    toSolid( ) {
        this.type = G2DEnum.SOLID_RECTANGLE;
    }

    toLines( ) {
        this.type = G2DEnum.LINED_RECTANGLE;
    }

}

class G2DTexture extends G2DGraphic {

    ref:string;

    constructor( textureRef:string, options:G2DLayerOptions = { }) {
        super(G2DEnum.RECTANGLE, G2DEnum.SOLID_RECTANGLE, options);
        if( !TextureLib.get(textureRef ))
            throw `G2D Texture Error: Cannot create texture object, texture not defined[${textureRef}].`
        this.ref = textureRef;
    }

    get w( ) { return TextureLib.get(this.ref).w }
    get h( ) { return TextureLib.get(this.ref).h }

    draw( ) {
        TextureShader.activate( );
        TextureShader.use( this.type );
        gl.uniformMatrix4fv(TextureShader.uniform('u_projection'), false, Projector.value);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, TextureLib.get(this.ref).texture);
        gl.uniform1i(TextureShader.uniform('u_texture'), 0);
        const count = UpdateAttributes( this );
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    }

}

// ============================================
type G2DProjectionModule = {
    value: Float16Array;
    update: (x:number, y:number, s:number) => void;
}

const G2DProjectionModule = ( gl:WebGL2RenderingContext ) => {
    const value = new Float16Array(16);
    const update = ( x:number, y:number, s:number ) => {
        const w = gl.canvas.width * 0.5;
        const h = gl.canvas.height * 0.5;
        mat4.ortho( value, x - w, x + w, y + h, y - h, -1, 1);
    }
    update(0, 0, 1);
    return { value, update }
}
// ============================================
type  G2DVertex = {
    activate:( ) => void;
    setColorAttribute:(buffer:WebGLBuffer) => void;
    setDepthAttribute:(buffer:WebGLBuffer) => void;
    setPositionAttribute:(buffer:WebGLBuffer) => void;
    setTexcoordAttribute:(buffer:WebGLBuffer) => void;
    setTransformAttribute:(buffer:WebGLBuffer) => void;
}

const G2DVertex = ( gl:WebGL2RenderingContext, program:WebGLProgram ):G2DVertex => {
    const vao = gl.createVertexArray( );

    const activate = ( ) => gl.bindVertexArray( vao );

    return {
        activate,
        setColorAttribute: ( buffer:WebGLProgram ) => G2DSetAttribColor(gl, program, buffer, vao ),
        setDepthAttribute: (buffer:WebGLBuffer ) => G2DSetAttribDepth( gl, program, buffer, vao ),
        setPositionAttribute: (buffer:WebGLBuffer ) => G2DSetAttribPosition(gl, program, buffer, vao),
        setTexcoordAttribute: (buffer:WebGLBuffer ) => G2DSetAttribTexcoord(gl, program, buffer, vao),
        setTransformAttribute: (buffer:WebGLBuffer ) => G2DSetAttribTransform(gl, program, buffer, vao),
    }
}

export const G2DSetAttribColor = ( gl:WebGL2RenderingContext, program:WebGLProgram, buffer:WebGLBuffer, vao:WebGLVertexArrayObject ) => {
    gl.bindVertexArray( vao );
    gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
    const location = gl.getAttribLocation(program, 'a_color');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 4, gl.HALF_FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(location, 1);
}

export const G2DSetAttribDepth = ( gl:WebGL2RenderingContext, program:WebGLProgram, buffer:WebGLBuffer, vao:WebGLVertexArrayObject ) => {
    gl.bindVertexArray( vao );
    gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
    const location = gl.getAttribLocation(program, 'a_depth');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 1, gl.HALF_FLOAT, false, 36, 32);
}

export const G2DSetAttribPosition = ( gl:WebGL2RenderingContext, program:WebGLProgram, buffer:WebGLBuffer, vao:WebGLVertexArrayObject ) => {
    gl.bindVertexArray( vao );
    gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
    const location = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.HALF_FLOAT, false, 4, 0);
}

export const G2DSetAttribTexcoord = ( gl:WebGL2RenderingContext, program:WebGLProgram, buffer:WebGLBuffer, vao:WebGLVertexArrayObject ) => {
    gl.bindVertexArray( vao );
    gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
    const location = gl.getAttribLocation(program, 'a_texcoord');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.HALF_FLOAT, false, 4, 0);    
}

export const G2DSetAttribTransform = ( gl:WebGL2RenderingContext, program:WebGLProgram, buffer:WebGLBuffer, vao:WebGLVertexArrayObject ) => {
    gl.bindVertexArray( vao );
    gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
    const location = gl.getAttribLocation(program, 'a_transform');
    for(let i = 0; i < 4; i++) {
        gl.enableVertexAttribArray(location + i);
        gl.vertexAttribPointer(location + i, 4, gl.HALF_FLOAT, false, 36, 8 * i);
        gl.vertexAttribDivisor( location + i, 1);
    }
}
// ============================================
type G2DShader = {
    activate:( ) => void;
    use:(type:G2DEnum) => void;
    uniform:(name:string) => WebGLUniformLocation;
}

 type G2DShaderOptions = {
    source: { vertex:string, fragment:string },
    buffer: { transform: WebGLBuffer, color: WebGLBuffer }
    uniforms:string[];
    forms:{[key:number]: {
        model:WebGLBuffer,
        texcoord?:WebGLBuffer;
        depth?:WebGLBuffer;
        palette?:WebGLBuffer;
    }}
}

const G2DShader = ( gl:WebGL2RenderingContext, options:G2DShaderOptions ):G2DShader => {
    const program = G2DCompileProgram( gl, options.source.vertex, options.source.fragment );
    const vertex:{[key:number]:G2DVertex} = { };
    const uniforms:{[key:string]:WebGLUniformLocation} = { }
    // =========================================
    for(const name of options.uniforms) {
        let location = gl.getUniformLocation( program, name );
        if( location ) uniforms[name] = location;
        else throw `G2D Shader Error: Could not find uniform ${name}`
    }
    // =========================================
    for( const id in options.forms ) {
        const { model, texcoord, depth, palette } = options.forms[id];
        vertex[id] = G2DVertex( gl, program );
        vertex[id].setPositionAttribute( model );
        vertex[id].setTransformAttribute( options.buffer.transform );
        vertex[id].setColorAttribute( options.buffer.color );
        if( texcoord ) 
            vertex[id].setTexcoordAttribute( texcoord );
        if( depth ) 
            vertex[id].setDepthAttribute( depth );
        //if( palette ) vertex[id].setTexcoordAttribute( texcoord );
    }
    // =========================================
    return {
        activate:( ) => gl.useProgram( program ),
        use:( type ) => vertex[type].activate( ),
        uniform:(name ) => { return uniforms[name] }
    }
}

const compileShader = ( gl:WebGL2RenderingContext, source:string, type:GLenum ) => {
    const shader = gl.createShader( type ) as WebGLShader;
    gl.shaderSource( shader, source );
    gl.compileShader( shader );
    if(gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        return shader;
    let info = gl.getShaderInfoLog( shader );
    throw 'G2D Shader compile error.';
}

const G2DCompileProgram = ( gl:WebGL2RenderingContext, vsource:string, fsource:string ) => {
    const vshader = compileShader( gl, vsource, gl.VERTEX_SHADER );
    const fshader = compileShader( gl, fsource, gl.FRAGMENT_SHADER);
    const program = gl.createProgram( );
    gl.attachShader(program, vshader);
    gl.attachShader(program, fshader);
    gl.linkProgram(program);
    if(gl.getProgramParameter(program, gl.LINK_STATUS))
        return program;
    let info = gl.getProgramInfoLog( program );
    console.error( {info, vsource, fsource } );
    throw 'G2D Program link error'
}
// ============================================
type  G2DSegmentedBuffer = {
    buffer:WebGLBuffer, chunks:Float16Array[], refresh:( ) => void, dump:( ) => number[]
}
const G2DSegmentedBuffer = ( gl:WebGL2RenderingContext, segLength:number, count:number ):G2DSegmentedBuffer => {
    const buffer = gl.createBuffer( );
    const main = new Float16Array( segLength * count );
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, main, gl.DYNAMIC_DRAW);
    // ================================
    const chunks = new Array(count).fill(0).map((_,i) => main.subarray(i * segLength, i * segLength + segLength));
    return { 
        buffer, chunks, 
        refresh:( ) => {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, main);
        },
        dump:( ) => {
            return [...main];
        }
    }
}
// ============================================
const UpdateAttributes = ( obj:G2DGraphic ) => {
    for(let i = 0; i < obj.instances.length; i++) {
        let g = obj.instances[i];
        if( obj.form == G2DEnum.RECTANGLE )
            updateTransform( i, g.x, g.y, g.z, g.rx, g.ry, g.rz, (obj as G2DRect).w * g.scale, (obj as G2DRect).h * g.scale);
        updateColor( i, g.color );
    }
    AttTransform.refresh( );
    AttColor.refresh( );
    return obj.instances.length;
}

const updateTransform = ( index:number, x:number, y:number, z:number, rx:number, ry:number, rz:number, w:number, h:number) => {
    let chunk = AttTransform.chunks[index];
    mat4.fromTranslation(chunk, x, y, z);
    mat4.rotateX(chunk, rx);
    mat4.rotateY(chunk, ry);
    mat4.rotateZ(chunk, rz);
    mat4.scale(chunk, w * 0.5, h * 0.5);
}

const updateColor = ( index:number, color:Float16Array ) => {
    let chunk = AttColor.chunks[index];
    chunk.set(color);
}
// ============================================
type G2DTextureLib = {
    get:( name:string ) => { texture:WebGLTexture, w:number, h:number },
    load:(items:{url:string, cellHeight?:number}[]) => Promise<void>;
}

const G2DTextureLib = ( gl:WebGL2RenderingContext ):G2DTextureLib => {

    let lib:{[key:string]: { texture:WebGLTexture, w:number, h:number } } = { };

    const getBitmap = ( url:string ) => {
        return fetch( url ).then( res => res.blob( )).then( createImageBitmap );
    }

    const createTexture = ( bitmap:ImageBitmap, cellHeight:number ) => {
        const texture = gl.createTexture( );
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
        gl.texImage3D( gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, bitmap.width, bitmap.height, bitmap.height/cellHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        return texture;
    }

    const load = async( items:{ url:string, cellHeight?:number}[] ) => {
        for(const item of items) {
            const bitmap = await getBitmap( item.url );
            const texture = createTexture( bitmap, item.cellHeight || bitmap.height );
            lib[item.url] = { texture, w:bitmap.width, h: item.cellHeight || bitmap.height }
        }
    }

    const get = ( name:string ) => {
        return lib[name];
    }

    return { get, load } 

}