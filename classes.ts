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