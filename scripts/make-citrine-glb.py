# Builds public/sun/citrine.glb for the Google 3D map: x = east, y = north,
# z = up, origin at the plot centre (same frame as edem-ii.glb). Geometry is the
# CITRINE SitePlan (lib/complex-sun-plan.ts) turned by the row azimuth from
# complex_sun_settings, so the 3D map and the sun scene show the same thing.
import json, math, struct, sys

ROW_AZ = float(sys.argv[1]); OUT = sys.argv[2]
EAVE, RIDGE, OVER = 6.1, 2.2, 0.3
PITCH, STAG, W, D = 7.68, 0.0, 6.2, 9.14  # ряд прямой, шаг по генплану (10.11.2026)
TILT = math.radians(10)  # каждая вилла повёрнута вокруг своего центра к террасам
PIV = [0.0, 0.0]
plot = [(-1, -7.0), (5*PITCH+W+1, -7.0), (5*PITCH+W+1, D+3), (-1, D+3)]
cx = sum(p[0] for p in plot)/4; cz = sum(p[1] for p in plot)/4
ax = math.radians(ROW_AZ); az = math.radians(ROW_AZ + 90)
def enu(x, z, h):
    dx, dz = x - PIV[0], z - PIV[1]
    x = PIV[0] + dx*math.cos(TILT) - dz*math.sin(TILT); z = PIV[1] + dx*math.sin(TILT) + dz*math.cos(TILT)
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

# Детальная вилла, вариант A (владелец 10.11.2026) — как houseStyle
# 'modern-villa' в components/sun/sun-model.ts: два этажа, второй сдвинут от
# фасада, вальмовая тёмная крыша, остекление в рамах, ящик с зеленью,
# деревянная терраса, садовая стена, бассейн.
FRAME = (0.11, 0.11, 0.12); DECK = (0.55, 0.42, 0.29); PLANTER = (0.73, 0.70, 0.65)
LEAF = (0.25, 0.48, 0.23); YARD = (0.90, 0.88, 0.84); GLASS = (0.10, 0.15, 0.18)
H1, SLAB = 3.1, 0.22
for i in range(6):
    ox, oz = i*PITCH, i*STAG
    PIV[0], PIV[1] = ox + W/2, oz + D/2  # поворот вокруг центра дома
    B = lambda x0, x1, h0, h1, z0, z1, c: boxp(ox+x0, ox+x1, oz+z0, oz+z1, h0, h1, c)
    B(0, W, 0, H1, 0.2, D, WALL)
    B(-0.15, W+0.15, H1, H1+SLAB, -0.6, D+0.15, WALL)
    B(0, W, H1+SLAB, EAVE, 0.6, D, WALL)
    B(0.25, W-0.25, 0.1, H1-0.15, 0.15, 0.22, GLASS)
    for k in range(5):
        x = 0.2 + k*(W-0.4)/4; B(x-0.04, x+0.04, 0.05, H1-0.1, 0.1, 0.24, FRAME)
    B(0.2, W-0.2, H1-0.2, H1-0.1, 0.1, 0.24, FRAME)
    for a, b in ((0.5, W/2-0.4), (W/2+0.4, W-0.5)):
        B(a, b, H1+0.6, EAVE-0.3, 0.55, 0.62, GLASS)
        for x in (a, (a+b)/2, b): B(x-0.04, x+0.04, H1+0.55, EAVE-0.25, 0.52, 0.64, FRAME)
    B(-0.1, W+0.1, H1+SLAB, H1+0.7, -0.6, -0.3, PLANTER)
    for k in range(7):
        x = 0.3 + k*(W-0.6)/6; B(x-0.22, x+0.22, H1+0.7, H1+1.05, -0.62, -0.28, LEAF)
    B(0, W, 0, 0.12, -2.88, 0.2, DECK)
    B(-0.5, -0.32, 0, 1.9, -5.8, D, YARD)
    # вальмовая крыша
    x0, x1, z0, z1 = ox-0.35, ox+W+0.35, oz+0.25, oz+D+0.35
    xm = (x0+x1)/2; ins = (x1-x0)*0.45; y = EAVE; yr = EAVE+RIDGE
    A_, B_, C_, D_ = enu(x0,z0,y), enu(x1,z0,y), enu(x1,z1,y), enu(x0,z1,y)
    R0, R1 = enu(xm,z0+ins,yr), enu(xm,z1-ins,yr)
    tri(A_, B_, R0, ROOF); quad(B_, C_, R1, R0, ROOF); tri(C_, D_, R1, ROOF); quad(D_, A_, R0, R1, ROOF)
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
