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

export type G2DChunkedBuffer = {
    buffer: WebGLBuffer,
    data:Float16Array,
    chunks:Float16Array[]
}