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

    group.add(gableRoof(materials.roof, unit, plan, heights))
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
    group.add(rim)

    const water = new THREE.Mesh(new THREE.PlaneGeometry(pool.width, length), materials.pool)
    water.rotation.x = -Math.PI / 2
    water.position.set(centerX, 0.02, centerZ)
    water.receiveShadow = true
    group.add(water)
  })

  return group
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
  }

  const group = new THREE.Group()
  const casters = new THREE.Group()

  if (plan.blocks?.length) {
    // Многокорпусный участок: тот же построитель ряда вызывается на каждый
    // корпус со своими секциями и глубиной, затем ряд ставится на место и
    // разворачивается. Дворовые стены и бассейны — принадлежность одного
    // прямого ряда, у таких планов их нет.
    for (const block of plan.blocks) {
      const row = buildingBlock(
        materials,
        { ...plan, units: block.units, buildingDepth: block.depth },
        { ...heights, eaveHeight: block.eaveHeight ?? heights.eaveHeight },
      )
      row.rotation.y = -(block.azimuth * Math.PI) / 180
      row.position.set(block.origin.x, 0, block.origin.z)
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
