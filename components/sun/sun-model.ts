// Построение 3D-модели комплекса из планового обмера.
// Оси плана: X — вдоль ряда секций, Z — вглубь участка (0 = дворовый фасад,
// −Z = двор с бассейном, +Z = задний двор). Всё в метрах.

import * as THREE from 'three'
import { frontBoundaryZ, type SitePlan } from '@/lib/complex-sun-plan'

export type ModelHeights = {
  eaveHeight: number
  ridgeRise: number
  yardWall: number
}

const WALL_THICKNESS = 0.15
const OVERHANG = 0.35

const COLORS = {
  wall: 0xf1ede5,
  roof: 0x3f4348,
  glazing: 0x16242c,
  yardWall: 0xe6e1d7,
  pool: 0x1f8e9c,
  poolRim: 0x30343a,
  ground: 0x7d8f5e,
}

export type ComplexModel = {
  group: THREE.Group
  /** Всё, что отбрасывает тень. */
  casters: THREE.Group
  dispose: () => void
}

function standard(color: number, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra })
}

type BoxSpec = {
  width: number
  height: number
  depth: number
  x: number
  y: number
  z: number
}

function box(material: THREE.Material, spec: BoxSpec) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(spec.width, spec.height, spec.depth), material)
  mesh.position.set(spec.x, spec.y, spec.z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function wallAlongEdge(
  material: THREE.Material,
  [x1, z1]: [number, number],
  [x2, z2]: [number, number],
  height: number,
) {
  const mesh = box(material, {
    width: Math.hypot(x2 - x1, z2 - z1),
    height,
    depth: WALL_THICKNESS,
    x: (x1 + x2) / 2,
    y: height / 2,
    z: (z1 + z2) / 2,
  })
  mesh.rotation.y = -Math.atan2(z2 - z1, x2 - x1)
  return mesh
}

/** Двускатная крыша секции: конёк идёт вдоль глубины виллы. */
function gableRoof(
  material: THREE.Material,
  unit: { x0: number; x1: number },
  plan: SitePlan,
  heights: ModelHeights,
) {
  const eave = heights.eaveHeight
  const ridge = eave + heights.ridgeRise

  const shape = new THREE.Shape()
  shape.moveTo(unit.x0 - OVERHANG, eave)
  shape.lineTo(unit.x1 + OVERHANG, eave)
  shape.lineTo(unit.x1 + OVERHANG, eave + 0.15)
  shape.lineTo((unit.x0 + unit.x1) / 2, ridge)
  shape.lineTo(unit.x0 - OVERHANG, eave + 0.15)
  shape.closePath()

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: plan.buildingDepth + 2 * OVERHANG,
    bevelEnabled: false,
  })
  geometry.translate(0, 0, -OVERHANG)

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function buildingBlock(
  materials: Record<string, THREE.Material>,
  plan: SitePlan,
  heights: ModelHeights,
  roof: 'pitched' | 'flat' = 'pitched',
) {
  const group = new THREE.Group()
  const eave = heights.eaveHeight

  plan.units.forEach((unit) => {
    const width = unit.x1 - unit.x0
    const center = (unit.x0 + unit.x1) / 2

    group.add(
      box(materials.wall, {
        width,
        height: eave,
        depth: plan.buildingDepth,
        x: center,
        y: eave / 2,
        z: plan.buildingDepth / 2,
      }),
    )

    // остекление дворового фасада — сплошное в два этажа
    group.add(
      box(materials.glazing, {
        width: width - 0.5,
        height: eave - 0.7,
        depth: 0.12,
        x: center,
        y: (eave - 0.7) / 2 + 0.25,
        z: -0.02,
      }),
    )

    // Плоская кровля — это просто верх стенового объёма, скаты не нужны.
    if (roof === 'pitched') group.add(gableRoof(materials.roof, unit, plan, heights))
  })

  return group
}

/** Глухие стены между дворами и по периметру участка. */
function yardWalls(
  materials: Record<string, THREE.Material>,
  plan: SitePlan,
  heights: ModelHeights,
) {
  const group = new THREE.Group()
  const height = heights.yardWall
  if (height <= 0) return group

  const dividerX = [plan.units[0].x0]
  plan.units.slice(0, -1).forEach((unit, i) => dividerX.push((unit.x1 + plan.units[i + 1].x0) / 2))
  dividerX.push(plan.units[plan.units.length - 1].x1)

  dividerX.forEach((x) => {
    const zEnd = frontBoundaryZ(plan, x)
    group.add(
      box(materials.yardWall, {
        width: WALL_THICKNESS,
        height,
        depth: Math.abs(zEnd),
        x,
        y: height / 2,
        z: zEnd / 2,
      }),
    )
  })

  plan.plot.forEach((point, i) => {
    group.add(
      wallAlongEdge(materials.yardWall, point, plan.plot[(i + 1) % plan.plot.length], height),
    )
  })

  return group
}

function poolMeshes(materials: Record<string, THREE.Material>, plan: SitePlan) {
  const group = new THREE.Group()

  plan.pools.forEach((pool) => {
    const length = Math.abs(pool.zFar - pool.zNear)
    const centerX = pool.x + pool.width / 2
    const centerZ = (pool.zNear + pool.zFar) / 2

    const rim = box(materials.poolRim, {
      width: pool.width + 0.5,
      height: 0.3,
      depth: length + 0.5,
      x: centerX,
      y: -0.15,
      z: centerZ,
    })
    rim.castShadow = false

    const water = new THREE.Mesh(new THREE.PlaneGeometry(pool.width, length), materials.pool)
    water.rotation.x = -Math.PI / 2
    water.position.set(centerX, 0.02, centerZ)
    water.receiveShadow = true
    // Бассейн, развёрнутый вместе со своим домом: поворот вокруг угла дома.
    if (pool.azimuth && pool.pivot) {
      const holder = new THREE.Group()
      holder.position.set(pool.pivot.x, 0, pool.pivot.z)
      rim.position.x -= pool.pivot.x; rim.position.z -= pool.pivot.z
      water.position.x -= pool.pivot.x; water.position.z -= pool.pivot.z
      holder.rotation.y = -(pool.azimuth * Math.PI) / 180
      holder.add(rim, water)
      group.add(holder)
    } else {
      group.add(rim, water)
    }
  })

  return group
}

/**
 * Скос группы в её локальных осях: x' = x − k·z (сторона бассейна, −Z,
 * уезжает в +X). Поворот и сдвиг группы сохраняются — матрица собирается
 * вручную, потому что у Object3D нет скоса среди свойств.
 */
function applyShear(obj: THREE.Object3D, k: number) {
  obj.updateMatrix()
  const shear = new THREE.Matrix4().set(
    1, 0, -k, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  )
  obj.matrix.multiply(shear)
  obj.matrixAutoUpdate = false
}

/**
 * Детальная вилла (houseStyle 'modern-villa'), локальные оси корпуса:
 * x 0..width, z 0 = стеклянный фасад к бассейну, +z — к входу.
 * Первый этаж 3.1 м, перекрытие с балконом-навесом, второй этаж сдвинут
 * от фасада на 0.6 м, вальмовая крыша. Высоты подгоняются под eaveHeight.
 */
function modernVilla(
  materials: Record<string, THREE.Material>,
  width: number,
  depth: number,
  heights: ModelHeights,
) {
  const g = new THREE.Group()
  const add = (m: THREE.Material, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, shadow = true) => {
    const mesh = box(m, { width: x1 - x0, height: y1 - y0, depth: z1 - z0, x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2 })
    mesh.castShadow = shadow
    g.add(mesh)
    return mesh
  }
  const eave = heights.eaveHeight
  const h1 = Math.min(3.1, eave * 0.5)
  const slab = 0.22
  const top = eave

  add(materials.wall, 0, width, 0, h1, 0.2, depth)                        // первый этаж
  add(materials.wall, -0.15, width + 0.15, h1, h1 + slab, -0.6, depth + 0.15) // перекрытие + навес
  add(materials.wall, 0, width, h1 + slab, top, 0.6, depth)               // второй этаж
  // остекление первого этажа с рамами
  add(materials.glazing, 0.25, width - 0.25, 0.1, h1 - 0.15, 0.15, 0.22, false)
  for (let i = 0; i <= 4; i++) {
    const x = 0.2 + (i * (width - 0.4)) / 4
    add(materials.frame, x - 0.04, x + 0.04, 0.05, h1 - 0.1, 0.1, 0.24, false)
  }
  add(materials.frame, 0.2, width - 0.2, h1 - 0.2, h1 - 0.1, 0.1, 0.24, false)
  // окна второго этажа
  for (const [a, b] of [[0.5, width / 2 - 0.4], [width / 2 + 0.4, width - 0.5]]) {
    add(materials.glazing, a, b, h1 + 0.6, top - 0.3, 0.55, 0.62, false)
    for (const x of [a, (a + b) / 2, b]) add(materials.frame, x - 0.04, x + 0.04, h1 + 0.55, top - 0.25, 0.52, 0.64, false)
  }
  // ящик с зеленью по краю балкона
  add(materials.planter, -0.1, width + 0.1, h1 + slab, h1 + 0.7, -0.6, -0.3)
  const leafGeo = new THREE.IcosahedronGeometry(0.25, 1)
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(leafGeo, materials.leaf)
    leaf.position.set(0.3 + i * ((width - 0.6) / 6), h1 + 0.85, -0.45)
    leaf.castShadow = true
    g.add(leaf)
  }
  // деревянная терраса у фасада
  add(materials.deck, 0, width, 0, 0.12, -2.88, 0.2, false)
  // садовая стена между соседними двориками (с запада)
  add(materials.yardWall, -0.5, -0.32, 0, Math.max(1.6, heights.yardWall), -5.8, depth)
  // вальмовая крыша
  const x0 = -0.35, x1 = width + 0.35, z0 = 0.25, z1 = depth + 0.35, y = top, rise = heights.ridgeRise
  const xm = (x0 + x1) / 2, inset = (x1 - x0) * 0.45
  const A = [x0, y, z0], B = [x1, y, z0], C = [x1, y, z1], D = [x0, y, z1]
  const R0 = [xm, y + rise, z0 + inset], R1 = [xm, y + rise, z1 - inset]
  const tris = [A, R0, B, B, R0, R1, B, R1, C, C, R1, D, D, R1, R0, D, R0, A]
  const roofGeo = new THREE.BufferGeometry()
  roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3))
  roofGeo.computeVertexNormals()
  const roof = new THREE.Mesh(roofGeo, materials.roofDouble)
  roof.castShadow = true
  roof.receiveShadow = true
  g.add(roof)
  return g
}

/** Плоская отмостка участка — на неё ложатся тени. */
function plotPad(materials: Record<string, THREE.Material>, plan: SitePlan) {
  const shape = new THREE.Shape()
  plan.plot.forEach(([x, z], i) => (i ? shape.lineTo(x, z) : shape.moveTo(x, z)))
  shape.closePath()

  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), materials.ground)
  mesh.rotation.x = Math.PI / 2
  mesh.position.y = 0.01
  mesh.receiveShadow = true
  return mesh
}

export function buildComplexModel(plan: SitePlan, heights: ModelHeights): ComplexModel {
  const materials: Record<string, THREE.Material> = {
    wall: standard(COLORS.wall),
    roof: standard(COLORS.roof, { roughness: 0.7 }),
    glazing: standard(COLORS.glazing, { roughness: 0.15, metalness: 0.6 }),
    yardWall: standard(COLORS.yardWall),
    pool: standard(COLORS.pool, { roughness: 0.12, metalness: 0.35 }),
    poolRim: standard(COLORS.poolRim),
    ground: standard(COLORS.ground, { roughness: 1 }),
    // детали 'modern-villa'
    frame: standard(0x1c1d1f),
    planter: standard(0xb9b2a6),
    leaf: standard(0x3f7a3a),
    deck: standard(0x8b6a4b),
    roofDouble: standard(COLORS.roof, { roughness: 0.6, side: THREE.DoubleSide }),
  }

  const group = new THREE.Group()
  const casters = new THREE.Group()

  if (plan.blocks?.length) {
    // Многокорпусный участок: тот же построитель ряда вызывается на каждый
    // корпус со своими секциями и глубиной, затем ряд ставится на место и
    // разворачивается. Дворовые стены и бассейны — принадлежность одного
    // прямого ряда, у таких планов их нет.
    for (const block of plan.blocks) {
      const row = plan.houseStyle === 'modern-villa'
        ? modernVilla(materials, (block.units[0]?.x1 ?? 6) - (block.units[0]?.x0 ?? 0), block.depth, { ...heights, eaveHeight: block.eaveHeight ?? heights.eaveHeight })
        : buildingBlock(
          materials,
          { ...plan, units: block.units, buildingDepth: block.depth },
          { ...heights, eaveHeight: block.eaveHeight ?? heights.eaveHeight },
          block.roof,
        )
      row.rotation.y = -(block.azimuth * Math.PI) / 180
      row.position.set(block.origin.x, 0, block.origin.z)
      if (block.shear) applyShear(row, block.shear)
      casters.add(row)
    }
  } else {
    casters.add(buildingBlock(materials, plan, heights))
    casters.add(yardWalls(materials, plan, heights))
  }

  group.add(plotPad(materials, plan), poolMeshes(materials, plan), casters)

  const dispose = () => {
    group.traverse((node) => {
      if (node instanceof THREE.Mesh) node.geometry.dispose()
    })
    Object.values(materials).forEach((material) => material.dispose())
  }

  return { group, casters, dispose }
}
