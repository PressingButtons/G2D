export enum G2DMode  {
    SOLID = 100,
    LINES = 101,
    TEXTURE = 102
}

export type G2DVertexConfiguration = {
    program: WebGLProgram,
    attributes: (G2DAttribute | G2DMatrixAttribute)[];
}

export type G2DMatrixAttribute = {
    name:string;
    stride:number;
    offset:number;
    buffer:WebGLBuffer;
}

export type G2DAttribute = G2DMatrixAttribute & {
    size:number;
    divisor?:number
}

export type G2DSuiteConfiguration = {
    vertex:string,
    fragment:string,
    uniforms:string[];
    models: {
        [key:string]: (G2DAttribute | G2DMatrixAttribute)[]
    }
}

export type G2DLine = {
    origin: { x:number, y:number };
    vector: { x:number, y:number };
    color: [number, number, number, number];
}

export type G2DRect = {
    position: {x:number, y:number, z:number};
    rotation: {x:number, y:number, z:number};
    size: { width:number, height: number };
    mode: G2DMode;
    color: [number, number, number, number];
}

export type G2DCircle = {
    position: {x:number, y:number, z:number};
    radius: number;
    mode: G2DMode;
    color: [number, number, number, number];
}

export type G2DTexture = G2DRect & {
    texture: { uri:string, index: number },
    palette?: { uri:string, index: number }
}

export type G2DGraphic = G2DLine | G2DRect | G2DCircle | G2DTexture;

export type G2DDrawable = {
    position: {x:number, y:number, z?: number };
    graphic: {[key:string]: G2DGraphic};
}

export type G2DChunkedBuffer = {
    buffer: WebGLBuffer,
    data:Float16Array,
    chunks:Float16Array[]
}