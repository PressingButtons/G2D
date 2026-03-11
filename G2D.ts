import { G2DSuite, G2DTextureCache } from "./classes";
import G2DGLSL from "./G2DGLSL";
import { G2DCreateBuffer, G2DCreateBufferWithChunks, G2DGetDrawMode, G2DTransformCircle, G2DTransformLine, G2DTransformRect, G2DTransformTexture } from "./methods";
import { G2DMode, type G2DChunkedBuffer, type G2DDrawable, type G2DGraphic } from "./types";

let gl:WebGL2RenderingContext;
let cache:G2DTextureCache;
// models 
let line:G2DChunkedBuffer;
let rect:WebGLBuffer;
let circle:WebGLBuffer;
let texture:WebGLBuffer;

// supplementary buffers 
let color:G2DChunkedBuffer;
let transform:G2DChunkedBuffer;

let circlePoints = 15;
// suites 
let lineSuite:G2DSuite;
let colorSuite:G2DSuite;
let textureSuite:G2DSuite;

// projection matrix
let projection = new Float32Array(16);

const createBuffers = ( ) => {
    line = G2DCreateBufferWithChunks(gl, 4, 1);
    rect = G2DCreateBuffer(gl, new Float16Array([
        -1, -1, 
         1, -1, 
         1,  1, 
        -1, 1]), gl.STATIC_DRAW);
    // circle 
    const circleData = new Array(circlePoints).fill(0).map((_,i) => [
        Math.cos(2 * i * Math.PI/circlePoints),
        Math.sin(2 * i * Math.PI/circlePoints)
    ]).flat( );
    circle = G2DCreateBuffer(gl, new Float16Array(circleData), gl.STATIC_DRAW );

    texture = G2DCreateBuffer(gl, new Float16Array([
        -1, -1, 0, 0,
         1, -1, 1, 0,
        -1,  1, 0, 1,
         1,  1, 1, 1
    ]), gl.STATIC_DRAW);

    color = G2DCreateBufferWithChunks(gl, 4, 1);
    transform = G2DCreateBufferWithChunks(gl, 18, 1);
}

const createLineSuite = ( ) => {
    lineSuite = new G2DSuite(gl, {
        uniforms: ['u_projection'],
        vertex: G2DGLSL.lineVertex,
        fragment: G2DGLSL.colorFragment,
        models: {
            line: [
                { name: 'a_position', size: 2, stride: 0, offset: 0, buffer: line.buffer},
                { name: 'a_color',  size:4, stride:0, offset:0, divisor: 1, buffer: color.buffer }
            ]
        }
    });
}

const createColorSuite = ( ) => {
    colorSuite = new G2DSuite(gl, {
        uniforms: [ 'u_projection' ],
        vertex: G2DGLSL.colorVertex,
        fragment: G2DGLSL.colorFragment,
        models: {
            rect: [
                { name: 'a_position', size: 2, stride: 0, offset: 0, buffer: rect},
                { name: 'a_transform', stride: 36, offset: 0, buffer: transform.buffer },
                { name: 'a_color',  size:4, stride:0, offset:0, divisor: 1, buffer: color.buffer }
            ],
            circle: [
                { name: 'a_position', size: 2, stride: 0, offset: 0, buffer: circle},
                { name: 'a_transform', stride: 36, offset: 0, buffer: transform.buffer },
                { name: 'a_color',  size:4, stride:0, offset:0, divisor: 1, buffer: color.buffer }
            ]
        }
    });
}

const createTextureSuite = ( ) => {
    textureSuite = new G2DSuite(gl, {
        uniforms: [ 'u_projection', 'u_texture' ],
        vertex: G2DGLSL.textureVertex,
        fragment: G2DGLSL.textureFragment,
        models: {
            rect: [
                { name: 'a_position', size: 2, stride: 8, offset: 0, buffer: texture},
                { name: 'a_texcoord', size: 2, stride: 8, offset: 4, buffer: texture},
                { name: 'a_transform', stride: 36, offset: 0, buffer: transform.buffer },
                { name: 'a_color',  size:4, stride:0, offset:0, divisor: 1, buffer: color.buffer },
                { name: 'a_depth',  size:1, stride:36, offset:32, divisor: 1, buffer: transform.buffer }
            ]
        }
    });
}

const enableFeatures = ( ) => {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

const draw = ( view:[number, number, number], object:G2DDrawable ) => {
    for(const key in object.graphic ) {
        let current = object.graphic[key];
        if( 'origin' in current ) {
            lineSuite.use(gl, 'line');
            lineSuite.setProjection( gl, projection, view );
            G2DTransformLine( gl, object, current, line, color );
            gl.drawArraysInstanced(gl.LINES, 0, 2, 1);
        } else if( 'texture' in current ) {
            textureSuite.use(gl, 'rect');
            textureSuite.setProjection( gl, projection, view );
            G2DTransformTexture( gl, object, current, transform, color );
            cache.use(gl, current.texture.uri, textureSuite.uniforms.u_texture, 0);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 1);
        } else if( 'size' in current) {
            colorSuite.use(gl, 'rect');
            colorSuite.setProjection(gl, projection, view);
            G2DTransformRect(gl, object, current, transform, color);
            const mode = G2DGetDrawMode( gl, current.mode );
            gl.drawArraysInstanced(mode, 0, 4, 1);
        } else if( 'radius' in current ) {
            colorSuite.use(gl, 'circle');
            colorSuite.setProjection(gl, projection, view);
            G2DTransformCircle(gl, object, current, transform, color);
            const mode = G2DGetDrawMode( gl, current.mode );
            gl.drawArraysInstanced(mode, 0, circlePoints, 1);
        }
    }
}

const G2D = {
    init: ( canvas:HTMLCanvasElement | OffscreenCanvas ) => {
        gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
        cache = new G2DTextureCache( );
        createBuffers( );
        enableFeatures( );
        createLineSuite( );
        createColorSuite( );
        createTextureSuite( );
    },

    draw: ( view:[number, number, number], ...objects:(G2DDrawable | G2DDrawable[])[] ) => {
        const drawables = objects.flat( );
        for(const object of drawables)
            draw( view, object );
    }, 

    fill: ( color:[number, number, number, number] ) => {
        gl.clearColor(...color);
        gl.clear(gl.COLOR_BUFFER_BIT);
    },

    loadTexture: ( uri:string, height?:number ) => {
        return cache.load(gl, uri, height);
    }
}

export default G2D;