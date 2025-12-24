export enum G2DEnum {
    RECTANGLE = 100,
    CIRCLE = 101,
    TEXTURE = 102,
    LINES = 110,
    SOLID = 111,
    DRAW_RECTANGLE = 120,
    DRAW_CIRCLE = 121,
    DRAW_TEXTURE = 122,
    FILL = 130,
}

export type G2DGraphicLayer = {
    scale:number;
    x:number, y:number, z:number;
    rx:number, ry:number, rz:number;
    color: Float16Array
}
