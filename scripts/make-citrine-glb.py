# Builds public/sun/citrine.glb for the Google 3D map: x = east, y = north,
# z = up, origin at the plot centre (same frame as edem-ii.glb). Geometry is the
# CITRINE SitePlan (lib/complex-sun-plan.ts) turned by the row azimuth from
# complex_sun_settings, so the 3D map and the sun scene show the same thing.
import json, math, struct, sys

ROW_AZ = float(sys.argv[1]); OUT = sys.argv[2]
EAVE, RIDGE, OVER = 6.1, 2.2, 0.3
PITCH, STAG, W, D = 6.96, 0.0, 6.2, 9.14  # ряд прямой, без лесенки (10.11.2026)
SHEAR = math.tan(math.radians(15))  # дом-параллелограмм к террасам, как в lib/complex-sun-plan.ts
PIV = [0.0, 0.0]
plot = [(-0.5, -6.0), (5*PITCH+W+0.5, 5*STAG-6.0), (5*PITCH+W+0.5, 5*STAG+D+3), (-0.5, D+3)]
cx = sum(p[0] for p in plot)/4; cz = sum(p[1] for p in plot)/4
ax = math.radians(ROW_AZ); az = math.radians(ROW_AZ + 90)
def enu(x, z, h):
    x = x - SHEAR * (z - PIV[1])
    x -= cx; z -= cz
    return (x*math.sin(ax) + z*math.sin(az), x*math.cos(ax) + z*math.cos(az), h)

WALL = (0.93, 0.90, 0.84); ROOF = (0.29, 0.29, 0.31); GLASS = (0.35, 0.45, 0.50); POOL = (0.27, 0.66, 0.74)
pos, nor, col, idx = [], [], [], []
def tri(a, b, c, color):
    ux, uy, uz = (b[i]-a[i] for i in range(3)); vx, vy, vz = (c[i]-a[i] for i in range(3))
    n = (uy*vz-uz*vy, uz*vx-ux*vz, ux*vy-uy*vx); L = math.sqrt(sum(t*t for t in n)) or 1
    n = tuple(t/L for t in n)
    for p in (a, b, c):
        idx.append(len(pos)); pos.append(p); nor.append(n); col.append(color)
def quad(a, b, c, d, color):
    tri(a, b, c, color); tri(a, c, d, color)
def boxp(x0, x1, z0, z1, h0, h1, color):
    P = lambda x, z, h: enu(x, z, h)
    c = [P(x0,z0,h0), P(x1,z0,h0), P(x1,z1,h0), P(x0,z1,h0), P(x0,z0,h1), P(x1,z0,h1), P(x1,z1,h1), P(x0,z1,h1)]
    faces = [(4,5,6,7),(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    for f in faces: quad(*(c[i] for i in f), color)

for i in range(6):
    ox, oz = i*PITCH, i*STAG
    PIV[0], PIV[1] = ox, oz
    boxp(ox, ox+W, oz, oz+D, 0, EAVE, WALL)
    # glazed pool-side facade
    boxp(ox+0.25, ox+W-0.25, oz-0.06, oz, 0.25, EAVE-0.45, GLASS)
    # gable roof, ridge along the house depth (as in sun-model.ts)
    x0, x1, xm = ox-OVER, ox+W+OVER, ox+W/2
    z0, z1 = oz-OVER, oz+D+OVER
    a0, b0, r0 = enu(x0,z0,EAVE), enu(x1,z0,EAVE), enu(xm,z0,EAVE+RIDGE)
    a1, b1, r1 = enu(x0,z1,EAVE), enu(x1,z1,EAVE), enu(xm,z1,EAVE+RIDGE)
    quad(a0, r0, r1, a1, ROOF); quad(r0, b0, b1, r1, ROOF)
    tri(a0, b0, r0, ROOF); tri(b1, a1, r1, ROOF)
    tri(r0, a0, b0, ROOF); tri(r1, b1, a1, ROOF)
    # pool
    boxp(ox+1.27, ox+1.27+4.61, oz-5.1, oz-2.88, 0, 0.12, POOL)

def pack(fmt, arr): return b''.join(struct.pack(fmt, *v) for v in arr)
pb = pack('<3f', pos); nb = pack('<3f', nor); cb = pack('<3f', col); ib = struct.pack(f'<{len(idx)}I', *idx)
blobs = [pb, nb, cb, ib]; offs = []; buf = b''
for bl in blobs:
    offs.append(len(buf)); buf += bl + b'\0' * ((4 - len(bl) % 4) % 4)
mn = [min(p[k] for p in pos) for k in range(3)]; mx = [max(p[k] for p in pos) for k in range(3)]
g = {
    'asset': {'version': '2.0', 'generator': 'balinsky make_glb.py'},
    'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0}],
    'materials': [{'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': 0.8}, 'doubleSided': True}],
    'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'COLOR_0': 2}, 'indices': 3, 'material': 0}]}],
    'buffers': [{'byteLength': len(buf)}],
    'bufferViews': [
        {'buffer': 0, 'byteOffset': offs[0], 'byteLength': len(pb), 'target': 34962},
        {'buffer': 0, 'byteOffset': offs[1], 'byteLength': len(nb), 'target': 34962},
        {'buffer': 0, 'byteOffset': offs[2], 'byteLength': len(cb), 'target': 34962},
        {'buffer': 0, 'byteOffset': offs[3], 'byteLength': len(ib), 'target': 34963},
    ],
    'accessors': [
        {'bufferView': 0, 'componentType': 5126, 'count': len(pos), 'type': 'VEC3', 'min': mn, 'max': mx},
        {'bufferView': 1, 'componentType': 5126, 'count': len(nor), 'type': 'VEC3'},
        {'bufferView': 2, 'componentType': 5126, 'count': len(col), 'type': 'VEC3'},
        {'bufferView': 3, 'componentType': 5125, 'count': len(idx), 'type': 'SCALAR'},
    ],
}
js = json.dumps(g, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(buf))
glb += struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(buf), 0x004E4942) + buf
open(OUT, 'wb').write(glb)
print('ok', len(glb), 'bytes', len(pos), 'verts', 'bounds', [round(v, 1) for v in mn], [round(v, 1) for v in mx])
