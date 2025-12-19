const EPSILON =  0.000001;

const fromTranslation = ( out:Float16Array, x:number, y:number, z:number ) => {
    out.set([
        1, 0, 0, 0,
        0, 1, 0, 0, 
        0, 0, 1, 0,
        x, y, z, 1
    ])
}

const ortho = ( out:Float16Array | Float32Array, left:number, right:number, bottom:number, top:number, near:number, far:number ) => {
    let lr = 1 / (left - right);
    let bt = 1 / (bottom - top);
    let nf = 1 / (near - far);
    // =========================
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
}

const rotateX = ( out:Float16Array, rad:number ) => {
    let s = Math.sin(rad);
    let c = Math.cos(rad);
    out[4]  *= c + out[8] * s;
    out[5]  *= c + out[9] * s;
    out[6]  *= c + out[10] * s;
    out[7]  *= c + out[11] * s;
    out[8]  *= c - out[4] * s;
    out[9]  *= c - out[5] * s;
    out[10] *= c - out[6] * s;
    out[11] *= c - out[7] * s;
}

const rotateY = ( out:Float16Array, rad:number ) => {
    let s = Math.sin(rad);
    let c = Math.cos(rad);
    out[0]  *= c - out[8] * s;
    out[1]  *= c - out[9] * s;
    out[2]  *= c - out[10] * s;
    out[3]  *= c - out[11] * s;
    out[8]  *= s + out[0] * c;
    out[9]  *= s + out[1] * c;
    out[10] *= s + out[2] * c;
    out[11] *= s + out[3] * c;
}

const rotateZ = ( m:Float16Array, rad:number ) => {
    let s = Math.sin(rad);
    let c = Math.cos(rad);
    let [a00, a01, a02, a03, a10, a11, a12, a13] = m;
    m[0] = a00 * c + a10 * s;
    m[1] = a01 * c + a11 * s;
    m[2] = a02 * c + a12 * s;
    m[3] = a03 * c + a13 * s;
    m[4] = a10 * c - a00 * s;
    m[5] = a11 * c - a01 * s;
    m[6] = a12 * c - a02 * s;
    m[7] = a13 * c - a03 * s;
}


const scale= ( out:Float16Array, x:number, y:number, z:number = 1 ) => {
    out[0]  *= x;
    out[1]  *= x;
    out[2]  *= x;
    out[3]  *= x;
    out[4]  *= y;
    out[5]  *= y;
    out[6]  *= y;
    out[7]  *= y;
    out[8]  *= z;
    out[9]  *= z;
    out[10] *= z;
    out[11] *= z;
}

export const mat4 = { fromTranslation, ortho, rotateX, rotateY, rotateZ, scale };