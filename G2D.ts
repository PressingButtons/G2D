import G2DGLSL from "./G2DGLSL";
import { G2DEnum, type G2DLineLayer } from "./G2DTypes";
import { mat4 } from "./gl_matrix";

let gl:WebGL2RenderingContext;
let BufferRect:G2DBuffer;
let BufferCircle:G2DBuffer;
let BufferLine:G2DBuffer;
let BufferTransform:G2DBuffer;
let BufferColor:G2DBuffer;
let BufferTextureRect:G2DBuffer;
let BufferTextureCoord:G2DBuffer;
let SuiteColor:G2DSuite;
let SuiteTexture:G2DSuite;
let SuiteLine:G2DSuite;
let TransformChunks:Float16Array[];
let ColorChunks:Float16Array[];

const MAX_INSTANCES = 100;
const CIRCLE_POINTS = 50;

export default class G2DModule {

    static #instance:G2DModule;

    static get Graphics( ) { return this.#instance }

    static build( canvas:HTMLCanvasElement ) {
        gl = canvas.transferControlToOffscreen( ).getContext('webgl2') as WebGL2RenderingContext;
        this.#instance = new G2DModule( );
        G2DModule.#enableFeatures( );
        G2DModule.#buildBuffers( CIRCLE_POINTS );
        G2DModule.#buildBufferViewChunks( );
        G2DModule.#buildColorSuite( );
        G2DModule.#buildLineSuite( );
        G2DModule.#buildTextureSuite( );
        G2DProjector.update(0, 0, 1);
    }

    static #buildBuffers( cp:number = 20 ) {
        BufferRect   = new G2DBuffer([-1, -1, 1, -1, 1, 1, -1, 1], gl.STATIC_DRAW);
        BufferTextureRect = new G2DBuffer([-1, -1, 1, -1, -1, 1, 1, 1], gl.STATIC_DRAW);
        BufferTextureCoord = new G2DBuffer([0, 0, 1, 0, 0, 1, 1, 1], gl.STATIC_DRAW);
        BufferCircle = new G2DBuffer(new Array(cp).fill(0).map((_, i) => [Math.cos(2 * i * Math.PI/cp), Math.sin(2 * i * Math.PI/cp)]).flat( ), gl.STATIC_DRAW);
        BufferLine   = new G2DBuffer(new Array(4).fill(0), gl.DYNAMIC_DRAW);
        BufferTransform = new G2DBuffer(new Array(18 * MAX_INSTANCES).fill(0), gl.DYNAMIC_DRAW);
        BufferColor = new G2DBuffer(new Array(4 * MAX_INSTANCES).fill(0), gl.DYNAMIC_DRAW);
    }

    static #buildBufferViewChunks( ) {
        TransformChunks = [];
        ColorChunks = [];
        for(let i = 0; i < MAX_INSTANCES; i++) {
            TransformChunks.push(BufferTransform.data.subarray(i * 18, i * 18 + 18));
            ColorChunks.push(BufferColor.data.subarray(i * 4, i * 4 + 4));
        }
    }

    static #buildColorSuite( ) {
        SuiteColor = new G2DSuite(G2DGLSL.colorVertex, G2DGLSL.colorFragment);
        SuiteColor.cacheUniform('u_projection');
        // ===============================
        const circle = SuiteColor.createModel(G2DEnum.CIRCLE);
        circle.setAttribute('a_position', BufferCircle.buffer, 2, 0, 0);
        circle.setColor(BufferColor.buffer);
        circle.setTransform(BufferTransform.buffer);
        // ===============================
        const rectangle = SuiteColor.createModel(G2DEnum.RECTANGLE);
        rectangle.setAttribute('a_position', BufferRect.buffer, 2, 0, 0);
        rectangle.setColor(BufferColor.buffer);
        rectangle.setTransform(BufferTransform.buffer)        
    }

    static #buildLineSuite( ) {
        SuiteLine = new G2DSuite(G2DGLSL.lineVertex, G2DGLSL.colorFragment);
        SuiteLine.cacheUniform('u_projection');
        // ====================================
        const line = SuiteLine.createModel(G2DEnum.LINES);
        line.setAttribute('a_position', BufferLine.buffer, 2, 0, 0);
        line.setColor(BufferColor.buffer);
    }

    static #buildTextureSuite( ) {
        SuiteTexture = new G2DSuite(G2DGLSL.textureVertex, G2DGLSL.textureFragment);
        SuiteTexture.cacheUniform('u_projection');
        SuiteTexture.cacheUniform('u_texture');
        // ====================================
        const rect = SuiteTexture.createModel(G2DEnum.RECTANGLE);
        rect.setAttribute('a_position', BufferTextureRect.buffer, 2, 0, 0);
        rect.setAttribute('a_texcoord', BufferTextureCoord.buffer, 2, 0, 0);
        rect.setAttribute('a_depth', BufferTransform.buffer, 1, 36, 32);
        rect.setTransform(BufferTransform.buffer);
        rect.setColor(BufferColor.buffer);
    }

    static #enableFeatures( ) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    private constructor( ) { }

    fill( r:number, g:number, b:number, a:number ) {
        gl.clearColor(r, g, b, a);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    loadBitmap( url:string ) {
        return fetch( url ).then( res => res.blob( ) ).then( createImageBitmap ); 
    }

    drawCircles( mode:GLenum, circles:G2DCircle[], cam:[number, number, number] = [0, 0, 1] ) {
        gl.useProgram(SuiteColor.program);
        SuiteColor.vertices[G2DEnum.CIRCLE].activate( );
        G2DProjector.update(...cam);
        G2DProjector.set(SuiteColor.uniforms.u_projection);
        G2DShapeTransformer.updateCircle( circles );
        gl.drawArraysInstanced(mode == G2DEnum.SOLID ? gl.TRIANGLE_FAN : gl.LINE_LOOP, 0, CIRCLE_POINTS, circles.length);
    }

    drawLines( lines:G2DLine[], cam:[number, number, number] = [0, 0, 1] ) {
        gl.useProgram(SuiteLine.program);
        SuiteLine.vertices[G2DEnum.LINES].activate( );
        G2DProjector.update(...cam);
        G2DProjector.set(SuiteLine.uniforms.u_projection);
        for(let i = 0, line; line = lines[i]; i++) {
            BufferLine.data.set([line.x1, line.y1, line.x2, line.y2]);
            BufferLine.refresh( );
            BufferColor.data.set(line.color);
            BufferColor.refresh( );
            gl.drawArrays(gl.LINES, 0, 2);
        }
    }

    drawRectangles( mode:G2DEnum, rects:G2DRect[], cam:[number, number, number] = [0, 0, 1] ) {
        gl.useProgram(SuiteColor.program);
        SuiteColor.vertices[G2DEnum.RECTANGLE].activate( );
        G2DProjector.update(...cam);
        G2DProjector.set(SuiteColor.uniforms.u_projection);
        G2DShapeTransformer.updateRect( rects );
        gl.drawArraysInstanced(mode == G2DEnum.SOLID ? gl.TRIANGLE_FAN : gl.LINE_LOOP, 0, 4, rects.length);
    }

    drawTexture( texture:string, items:G2DRect[], cam:[number, number, number] = [0, 0, 1] ) {
        gl.useProgram(SuiteTexture.program);
        SuiteTexture.vertices[G2DEnum.RECTANGLE].activate( );
        G2DProjector.update(...cam);
        G2DProjector.set(SuiteTexture.uniforms.u_projection);
        G2DShapeTransformer.updateRect(items);
        G2DTextureCache.use( texture, SuiteTexture.uniforms.u_texture );
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, items.length);
    }

    resize( width:number, height:number ) {
        gl.canvas.width = width;
        gl.canvas.height = height;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

}


class G2DBuffer {

    data:Float16Array;
    buffer:WebGLBuffer;

    constructor( data:number[], usage:GLenum ) {
        this.data = new Float16Array(data);
        this.buffer = gl.createBuffer( );
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.data, usage);
    }

    update( data:number[ ] ) {
        this.data.set( data );
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data);
    }

    refresh( ) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data);
    }

}

class G2DSuite {

    program;
    vertices:{[key:number]: G2DVertex}
    uniforms:{[key:string]: WebGLUniformLocation}

    constructor( vertex:string, fragment:string ) {
        this.program = compilier.compile(vertex, fragment);
        this.vertices = { }; 
        this.uniforms = { };
    }

    createModel( id:number ) {
        this.vertices[id] = new G2DVertex( this.program );
        return this.vertices[id];
    }

    cacheUniform( name:string ) {
        const location = gl.getUniformLocation( this.program, name );
        if(!location) throw `G2DSuite Error: failed to find uniform[${name}]`;
        this.uniforms[name] = location;
    }

}

class G2DVertex {

    vao:WebGLVertexArrayObject;
    program:WebGLProgram;

    constructor( program:WebGLProgram ) {
        this.program = program;
        this.vao = gl.createVertexArray( );
    }

    #setup( name:string, buffer:WebGLBuffer ) {
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        return gl.getAttribLocation( this.program, name );
    }

    setAttribute( name:string, buffer:WebGLBuffer, size:number, stride:number, offset:number ) {
       const location = this.#setup( name, buffer );
       gl.enableVertexAttribArray( location );
       gl.vertexAttribPointer( location, size, gl.HALF_FLOAT, false, stride, offset);
    }

    setAttributeD( name:string, buffer:WebGLBuffer, size:number, stride:number, offset:number ) {
       const location = this.#setup( name, buffer );
       gl.enableVertexAttribArray( location );
       gl.vertexAttribPointer( location, size, gl.HALF_FLOAT, false, stride, offset);
       gl.vertexAttribDivisor( location, 1 );
    }

    setTransform( buffer:WebGLBuffer ) {
        const location = this.#setup( 'a_transform', buffer);
        for( let i = 0, loc; loc = location + i, i < 4; i++) {
            gl.enableVertexAttribArray( loc );
            gl.vertexAttribPointer( loc, 4, gl.HALF_FLOAT, false, 36, 8 * i);
            gl.vertexAttribDivisor( loc, 1 );
        }
    }

    setColor( buffer:WebGLBuffer ) {
        const location = this.#setup( 'a_color', buffer);
        gl.enableVertexAttribArray( location );
        gl.vertexAttribPointer( location, 4, gl.HALF_FLOAT, false, 0, 0);
        gl.vertexAttribDivisor( location, 1 );
    
    }

    activate( ) {
        gl.bindVertexArray( this.vao );
    }
}
// ========================================================
// Displayables
// ========================================================
type G2DShape = {
    x:number,
    y:number,
    z:number,
    rx:number,
    ry:number,
    rz:number,
    color:[number, number, number, number];

}

export interface G2DRect extends G2DShape {
    width:number;
    height:number;
}

export interface G2DCircle extends G2DShape {
    radius: number;
}

export type G2DLine = {
    x1:number;
    x2:number,
    y1:number,
    y2:number,
    color:[number, number, number, number]
}

export type G2DGraphic = G2DRect | G2DCircle | G2DLine;



// ========================================================
// Utility Objects 
// ========================================================
class G2DProjector {

    static #matrix = new Float32Array( 16 );

    static update( x:number, y:number, scale:number ) {
        const w = gl.canvas.width * 0.5 * scale;
        const h = gl.canvas.height * 0.5 * scale;
        mat4.ortho( G2DProjector.#matrix, x - w, x + w, y + h, y - h, -1, 1);
    }

    static set( location:WebGLUniformLocation ) {
        gl.uniformMatrix4fv( location, false, G2DProjector.#matrix );
    }

    private constructor( ) { }

}

class G2DShapeTransformer {

    static updateRect( items:G2DRect[] ) {
        for(let i = 0; i < items.length; i++) {
            const r = items[i];
            G2DShapeTransformer.setTransform(i, r.x, r.y, r.z, r.rx, r.ry, r.rz, r.width, r.height);
            G2DShapeTransformer.setColor(i, r.color);
        }
        BufferTransform.refresh( );
        BufferColor.refresh( );
    }

    static updateCircle( items:G2DCircle[] ) {
        for(let i = 0, c; c = items[i]; i++) {
            G2DShapeTransformer.setTransform(i, c.x, c.y, c.rz, c.rx, c.ry, c.rz, c.radius, c.radius);
            G2DShapeTransformer.setColor(i, c.color);
        }
        BufferTransform.refresh( );
        BufferColor.refresh( );
    }


    static setTransform( index:number, x:number, y:number, z:number, rx:number, ry:number, rz:number, w:number, h:number ) {
        const chunk = TransformChunks[index];
        mat4.fromTranslation(chunk, x, y, z);
        mat4.rotateX(chunk, rx);
        mat4.rotateY(chunk, ry);
        mat4.rotateZ(chunk, rz);
        mat4.scale(chunk, w * 0.5, h * 0.5);
    }

    static setColor(index:number, color:[number, number, number, number]) {
        const chunk = ColorChunks[index];
        chunk.set(color);
    }

    private constructor( ) { }
}

export class G2DTextureCache {

    private constructor( ) { }

    static #cache:{[key:string]: { texture:WebGLTexture, w:number, h:number }} = { }

    static async load( url:string ) {
        if(G2DTextureCache.#cache[url] != undefined )
            return G2DTextureCache.#cache[url];
        return G2DTextureCache.#create( url );
    }

    static async #create( url:string, h?:number ) {
        const bitmap = await G2DModule.Graphics.loadBitmap( url );
        const texture = gl.createTexture( );
        h = h ? h : bitmap.height;
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
        gl.texImage3D( gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, bitmap.width, bitmap.height, bitmap.height/h, 0, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        G2DTextureCache.#cache[ url] =  { texture, w:bitmap.width, h };
        return texture;
    }

    static use(url:string, location:WebGLUniformLocation, index:number = 0) {
        const {texture} = G2DTextureCache.#cache[url];
        if(texture) {
            gl.uniform1i(location, index);
            gl.activeTexture(gl.TEXTURE0 + index);
            gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
        }
    }

}
// ========================================================
// Compiler
// ========================================================

const compilier = (( ) => {

    const compileShader = ( source:string, type:GLenum ) => {
        const shader = gl.createShader( type ) as WebGLShader;
        gl.shaderSource( shader, source );
        gl.compileShader( shader );
        if(gl.getShaderParameter(shader, gl.COMPILE_STATUS))
            return shader;
        let info = gl.getShaderInfoLog( shader );
        throw 'G2D Shader compile error.';
    }

    const compileProgram = ( vertex:string, fragment:string ) => {
        const vshader = compileShader( vertex, gl.VERTEX_SHADER );
        const fshader = compileShader( fragment, gl.FRAGMENT_SHADER);
        const program = gl.createProgram( );
        gl.attachShader(program, vshader);
        gl.attachShader(program, fshader);
        gl.linkProgram(program);
        if(gl.getProgramParameter(program, gl.LINK_STATUS))
            return program;
        let info = gl.getProgramInfoLog( program );
        console.error( {info, vertex, fragment } );
        throw 'G2D Program link error'
    }

    return { compile:compileProgram }

})( );