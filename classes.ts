import { G2DCompile, G2DCreateVertex, G2DExtractUniforms, G2DLoadTexture, G2DSetProjection } from "./methods";
import type { G2DSuiteConfiguration } from "./types";

export class G2DSuite {

    program:WebGLProgram;
    uniforms:{[key:string]: WebGLUniformLocation};
    models:{[key:string]: WebGLVertexArrayObject};

    constructor( gl:WebGL2RenderingContext, config:G2DSuiteConfiguration ) {
        this.program = G2DCompile(gl, config.vertex, config.fragment);
        this.uniforms = G2DExtractUniforms(gl, this.program, ...config.uniforms);
        this.models = { };

        for(const key in config.models) {
            this.models[key] = G2DCreateVertex( gl, {program:this.program, attributes: config.models[key]} )
        }
    }

    use( gl:WebGL2RenderingContext, name:string ) {
        const model = this.models[name];
        if( model ) {
            gl.useProgram( this.program );
            gl.bindVertexArray( model );
        }
    }

    setProjection( gl:WebGL2RenderingContext, matrix:Float32Array, view:[number, number, number] ) {
        const uniform = this.uniforms.u_projection;
        G2DSetProjection(gl, uniform, view, matrix);
    }

}

export class G2DTextureCache {

    cache:{[key:string]: WebGLTexture}

    constructor( ) {
        this.cache = { };
    }

    async load( gl:WebGL2RenderingContext, uri:string, height?:number ) {
        let texture = this.cache[uri];
        if( texture )
            return texture;
        texture = await G2DLoadTexture( gl, uri, height );
        this.cache[uri] = texture;
        return texture;
    }

    use( gl:WebGL2RenderingContext, name:string, uniform:WebGLUniformLocation, index:number = 0 ) {
        const texture = this.cache[name];
        if( !texture ) 
            throw `Could not assign texture, texture(${name}) not found`;
        gl.uniform1i( uniform, index );
        gl.activeTexture( gl.TEXTURE0 + index );
        gl.bindTexture( gl.TEXTURE_2D_ARRAY, texture );
    }

    unload(uri:string ) {
        delete this.cache[uri];
    }

}

export enum G2DFigure {
    LINED_RECT = 0,
    SOLID_RECT = 1,
    LINED_CIRCLE = 2,
    SOLID_CIRCLE = 3,
    TEXTURE = 4
}

export class G2DPolygon {

    static get LENGTH( ) { return 21 }
    static get BYTE_LENGTH( ) { return G2DPolygon.LENGTH * 2 };

    protected _array:Float16Array;
    protected _chunks:G2DChunk[];

    constructor( figureCount:number = 1) {
        this._array = new Float16Array( figureCount * G2DPolygon.LENGTH );
        this._chunks = new Array(figureCount).fill(0).map((_, i) => new G2DChunk(this._array, i));
    }

    get length( ) {
        return this._chunks.length;
    }
    chunk( i:number ) {
        return this._chunks[i];
    }

    get data( ) {
        return this._array;
    }

}

/**
 * Chunk Layout 
 * [0] px
 * [1] py
 * [2] pz
 * [3] ox
 * [4] oy
 * [5] oz
 * [6] w
 * [7] h
 * [8] rx
 * [9] ry
 * [A] rz
 * [B] c0
 * [C] c1
 * [D] c2
 * [E] c3
 * [F] t0
 * [G] t1
 */


class G2DChunk {

    #chunk:Float16Array;

    constructor( array:Float16Array, index:number ) {
        const start = 2 + G2DPolygon.LENGTH * index;
        const end = start + G2DPolygon.LENGTH;
        this.#chunk = array.subarray(start, end);
    }

    get data( ) {
        return this.#chunk;
    }

    get px( ) { return this.#chunk[0]; }
    set px(n) { this.#chunk[0] = n; }

    get py( ) { return this.#chunk[1]; }
    set py(n) { this.#chunk[1] = n; }

    get pz( ) { return this.#chunk[2]; }
    set pz(n) { this.#chunk[2] = n; }
    
    get ox( ) { return this.#chunk[3]; }
    set ox(n) { this.#chunk[3] = n; }

    get oy( ) { return this.#chunk[4]; }
    set oy(n) { this.#chunk[4] = n; }

    get oz( ) { return this.#chunk[5]; }
    set oz(n) { this.#chunk[5] = n; }
    
    get width( ) { return this.#chunk[6]; }
    set width(n) { this.#chunk[6] = n; }

    get height( ) { return this.#chunk[7]; }
    set height(n) { this.#chunk[7] = n; }

    get rx( ) { return this.#chunk[8]; }
    set rx(n) { this.#chunk[8] = n; }

    get ry( ) { return this.#chunk[9]; }
    set ry(n) { this.#chunk[9] = n; }

    get rz( ) { return this.#chunk[10]; }
    set rz(n) { this.#chunk[10] = n; }

    get depth( ) { return this.#chunk[15] }
    set depth(n) { this.#chunk[15] = n }

    get palette( ) { return this.#chunk[16] }
    set palette(n) { this.#chunk[16] = n }

    setColor( r:number, g:number, b:number, a:number) {
        this.#chunk.set([r, g, b, a], 11);
    }

    getColor( ) {
        return [
            this.#chunk[11],
            this.#chunk[12],
            this.#chunk[13],
            this.#chunk[14]
        ]
    }

    setPosition( x:number, y:number, z:number = 0 ) {
        this.#chunk.set([x, y, z]);
    }

    setOffset( x:number, y:number, z:number = 0 ) {
        this.#chunk.set([x, y, z], 3);
    }

    resize( width:number, height:number ) {
        this.#chunk.set([width, height], 6);
    }

}

export class G2DLine {

    #data:Float16Array;
    #chunks:G2DLineChunk[]

    constructor( length:number ) {
        this.#data = new Float16Array( length * G2DLineChunk.LENGTH );
        this.#chunks = new Array(length).fill(0).map((_,i) => new G2DLineChunk(this.#data, i));
    }

    get length( ) {
        return this.#chunks.length;
    }

    get data( ) {
        return this.#data;
    }

    chunk(i:number) {
        return this.#chunks[i];
    }

}

class G2DLineChunk {

    static LENGTH = 8;
    static BYTE_LENGTH = G2DLineChunk.LENGTH * 2;

    #data:Float16Array;

    constructor( array:Float16Array, index:number ) {
        const start = index * G2DLineChunk.LENGTH;
        const end = start + G2DLineChunk.LENGTH;
        this.#data = array.subarray(start, end);
    }

    get px( ) { return this.#data[0]; }
    set px(n) { this.#data[0] = n; }

    get py( ) { return this.#data[1]; }
    set py(n) { this.#data[1] = n; }

    get vx( ) { return this.#data[2]; }
    set vx(n) { this.#data[2] = n; }

    get vy( ) { return this.#data[3]; }
    set vy(n) { this.#data[3] = n; }

    setColor( color:[number, number, number, number]) {
        this.#data.set(color, 4)
    }

    getColor( ) {
        return[
            this.#data[4],
            this.#data[5],
            this.#data[6],
            this.#data[7],
        ]
    }

}