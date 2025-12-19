export enum G2DEnum {
    RECTANGLE = 100,
    CIRCLE = 101,
    SOLID_RECTANGLE = 110,
    LINED_RECTANGLE = 111,
    TEXTURE = 112,
    DRAW_RECTANGLE = 120,
    DRAW_CIRCLE = 121,
    DRAW_TEXTURE = 122,
    FILL = 130
}

export type G2DGraphicLayer = {
    scale:number;
    x:number, y:number, z:number;
    rx:number, ry:number, rz:number;
    color: Float16Array
}

export type G2DShaderOptions = {
    source: { vertex:string, fragment:string },
    buffer: { transform: WebGLBuffer, color: WebGLBuffer }
    uniforms:string[];
    forms:{[key:number]: G2DFormData }
}

type G2DFormData = {
    model:WebGLBuffer,
    texcoord?:WebGLBuffer;
    depth?:WebGLBuffer;
    palette?:WebGLBuffer;
}