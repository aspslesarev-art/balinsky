'use client'

// Трёхмерная сцена инсоляции: спутниковая подложка (север вверху),
// модель комплекса и реальное положение солнца на выбранные дату и время.
//
// Компонент тяжёлый (тянет three.js), поэтому подключается только через
// dynamic import и только когда пользователь открыл просмотр.

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import { plotCenter, type SitePlan } from '@/lib/complex-sun-plan'
import {
  formatDayOfYear,
  formatHours,
  localDayStartUtc,
  solarPosition,
  sunVector,
} from '@/lib/solar'
import { buildComplexModel, type ComplexModel, type ModelHeights } from './sun-model'

const DEG = Math.PI / 180
const SUN_DISTANCE = 160
const SHADOW_EXTENT = 42
const MIN_MINUTES = 300
const MAX_MINUTES = 1140

/** Ручная подгонка посадки: всё в метрах, восток и юг положительные. */
export type Placement = {
  rowAzimuth: number
  modelScale: number
  offsetX: number
  offsetZ: number
  basemapOffsetX: number
  basemapOffsetZ: number
  basemapScale: number
}

export type SunSceneProps = {
  plan: SitePlan
  latitude: number
  longitude: number
  placement: Placement
  heights: ModelHeights
}

type SceneContext = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  sunLight: THREE.DirectionalLight
  skyLight: THREE.HemisphereLight
  sunMarker: THREE.Mesh
  basemap: THREE.Mesh
  basemapBase: { x: number; z: number }
  model: ComplexModel | null
}

export function SunScene({ plan, latitude, longitude, placement, heights }: SunSceneProps) {
  const { rowAzimuth } = placement
  const mountRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<SceneContext | null>(null)

  const [dayOfYear, setDayOfYear] = useState(172)
  const [minutes, setMinutes] = useState(720)
  const [playing, setPlaying] = useState(false)
  const [topView, setTopView] = useState(false)

  const stateRef = useRef({ dayOfYear, minutes, playing, latitude, longitude })
  stateRef.current = { dayOfYear, minutes, playing, latitude, longitude }

  const year = new Date().getUTCFullYear()

  // ── создание сцены (один раз) ──────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.5, 3000)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI / 2 - 0.02
    controls.minDistance = 12
    controls.maxDistance = 320
    controls.target.set(0, 3, 0)

    const sunLight = new THREE.DirectionalLight(0xfff2dd, 3)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.set(2048, 2048)
    sunLight.shadow.camera.left = -SHADOW_EXTENT
    sunLight.shadow.camera.right = SHADOW_EXTENT
    sunLight.shadow.camera.top = SHADOW_EXTENT
    sunLight.shadow.camera.bottom = -SHADOW_EXTENT
    sunLight.shadow.camera.near = 40
    sunLight.shadow.camera.far = 320
    sunLight.shadow.bias = -0.0004
    sunLight.shadow.normalBias = 0.04
    scene.add(sunLight, sunLight.target)

    const skyLight = new THREE.HemisphereLight(0xbdd6ff, 0x5a5346, 0.9)
    scene.add(skyLight)

    const backdrop = new THREE.Mesh(
      new THREE.CircleGeometry(900, 48),
      new THREE.MeshStandardMaterial({ color: 0x54604a, roughness: 1 }),
    )
    backdrop.rotation.x = -Math.PI / 2
    backdrop.position.y = -0.06
    scene.add(backdrop)

    const span = plan.basemap.sizePx * plan.basemap.metersPerPixel
    const texture = new THREE.TextureLoader().load(plan.basemap.url)
    texture.colorSpace = THREE.SRGBColorSpace
    const basemap = new THREE.Mesh(
      new THREE.PlaneGeometry(span, span),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }),
    )
    basemap.rotation.x = -Math.PI / 2
    const basemapBase = {
      x: (plan.basemap.sizePx / 2 - plan.basemap.anchorPx.x) * plan.basemap.metersPerPixel,
      z: (plan.basemap.sizePx / 2 - plan.basemap.anchorPx.y) * plan.basemap.metersPerPixel,
    }
    basemap.position.set(basemapBase.x, -0.02, basemapBase.z)
    basemap.receiveShadow = true
    scene.add(basemap)

    addCompass(scene)

    const sunMarker = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0xffd27a }),
    )
    scene.add(sunMarker)

    sceneRef.current = {
      renderer,
      scene,
      camera,
      controls,
      sunLight,
      skyLight,
      sunMarker,
      basemap,
      basemapBase,
      model: null,
    }

    const onResize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    const observer = new ResizeObserver(onResize)
    observer.observe(mount)

    let frame = 0
    let last = performance.now()

    const animate = (now: number) => {
      frame = requestAnimationFrame(animate)
      const delta = now - last
      last = now

      const current = stateRef.current
      if (current.playing) {
        const next = current.minutes + delta * 0.12
        setMinutes(next > MAX_MINUTES ? MIN_MINUTES : next)
      }

      const dayStart = localDayStartUtc(year, current.dayOfYear, plan.utcOffsetHours)
      const at = new Date(dayStart.valueOf() + current.minutes * 60000)
      const position = solarPosition(at, current.latitude, current.longitude)
      const v = sunVector(position)
      const direction = new THREE.Vector3(v.x, v.y, v.z)

      sunLight.position.copy(direction).multiplyScalar(SUN_DISTANCE)
      sunLight.target.position.set(0, 0, 0)
      sunMarker.position.copy(direction).multiplyScalar(SUN_DISTANCE * 0.8)
      sunMarker.visible = position.altitude > -2

      const day = Math.max(0, Math.sin(position.altitude * DEG))
      sunLight.intensity = 3.4 * day
      sunLight.castShadow = position.altitude > 1
      skyLight.intensity = 0.35 + 0.75 * day
      scene.background = new THREE.Color(0x0b1018).lerp(
        new THREE.Color(0x9dc4e8),
        Math.min(1, day * 1.6),
      )

      controls.update()
      renderer.render(scene, camera)
    }
    frame = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      sceneRef.current?.model?.dispose()
      texture.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      sceneRef.current = null
    }
    // Сцена строится под конкретный план; смена плана = новый компонент.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan])

  // ── модель: пересобираем при смене высот, разворачиваем по азимуту ─────────
  useEffect(() => {
    const ctx = sceneRef.current
    if (!ctx) return

    if (ctx.model) {
      ctx.scene.remove(ctx.model.group)
      ctx.model.dispose()
    }
    ctx.model = buildComplexModel(plan, heights)
    ctx.scene.add(ctx.model.group)
    placeModel(ctx.model, plan, placement)
  }, [plan, heights, placement])

  // ── подложка: сдвиг и масштаб относительно начала координат ───────────────
  useEffect(() => {
    const ctx = sceneRef.current
    if (!ctx) return
    const { basemapScale, basemapOffsetX, basemapOffsetZ } = placement
    ctx.basemap.scale.set(basemapScale, basemapScale, 1)
    ctx.basemap.position.set(
      ctx.basemapBase.x * basemapScale + basemapOffsetX,
      -0.02,
      ctx.basemapBase.z * basemapScale + basemapOffsetZ,
    )
  }, [placement])

  // ── камера: облёт со стороны дворов либо взгляд строго сверху ─────────────
  useEffect(() => {
    const ctx = sceneRef.current
    if (!ctx) return
    if (topView) lookFromAbove(ctx.camera, ctx.controls)
    else frameCourtyards(ctx.camera, ctx.controls, rowAzimuth)
  }, [rowAzimuth, topView])

  return (
    <div className="flex h-full w-full flex-col bg-[#0e1116]">
      <div ref={mountRef} className="min-h-0 flex-1" />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 bg-[#12161c] px-4 py-3">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span className="flex justify-between text-[11px] uppercase tracking-wide text-white/50">
            Дата
            <b className="text-[13px] normal-case tracking-normal text-white">
              {formatDayOfYear(dayOfYear, year)}
            </b>
          </span>
          <input
            type="range"
            min={1}
            max={365}
            value={dayOfYear}
            onChange={(e) => setDayOfYear(Number(e.target.value))}
            className="accent-amber-400"
            aria-label="Дата"
          />
        </label>

        <label className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span className="flex justify-between text-[11px] uppercase tracking-wide text-white/50">
            Время
            <b className="text-[13px] normal-case tracking-normal text-white">
              {formatHours(minutes / 60)}
            </b>
          </span>
          <input
            type="range"
            min={MIN_MINUTES}
            max={MAX_MINUTES}
            step={5}
            value={Math.round(minutes)}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="accent-amber-400"
            aria-label="Время"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white hover:bg-white/10"
          >
            {playing ? '❚❚ Пауза' : '▶ Прогнать день'}
          </button>
          <button
            type="button"
            onClick={() => setTopView((v) => !v)}
            aria-pressed={topView}
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              topView
                ? 'border-transparent bg-amber-400 font-semibold text-[#191308]'
                : 'border-white/15 text-white hover:bg-white/10'
            }`}
          >
            Вид сверху
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Разворот модели: локальная ось +X смотрит по заданному азимуту, центр
 * участка садится в начало координат, затем применяются масштаб и сдвиг.
 */
function placeModel(model: ComplexModel, plan: SitePlan, placement: Placement) {
  const theta = (90 - placement.rowAzimuth) * DEG
  model.group.rotation.y = theta
  model.group.scale.setScalar(placement.modelScale)

  const center = plotCenter(plan)
  const rotated = new THREE.Vector3(center.x, 0, center.z).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    theta,
  )
  model.group.position.set(
    -rotated.x * placement.modelScale + placement.offsetX,
    0,
    -rotated.z * placement.modelScale + placement.offsetZ,
  )
  model.group.updateMatrixWorld(true)
}

/** Взгляд строго сверху — в плане тень читается однозначнее всего. */
function lookFromAbove(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
  camera.position.set(0, 86, 0.01)
  controls.target.set(0, 0, 0)
  controls.update()
}

/** Камера встаёт со стороны дворов с бассейнами, а не глухого тыла. */
function frameCourtyards(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  rowAzimuth: number,
) {
  const theta = (90 - rowAzimuth) * DEG
  const outward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), theta)
  camera.position.copy(outward).multiplyScalar(52).add(new THREE.Vector3(0, 38, 0))
  controls.target.set(0, 3, 0)
  controls.update()
}

function addCompass(scene: THREE.Scene) {
  const radius = 46
  const marks: [string, number, number, string][] = [
    ['С', 0, -radius, '#ff9a3c'],
    ['Ю', 0, radius, '#ffffff'],
    ['В', radius, 0, '#ffffff'],
    ['З', -radius, 0, '#ffffff'],
  ]

  marks.forEach(([text, x, z, color]) => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = color
    ctx.font = 'bold 76px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 64, 68)

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        depthTest: false,
        transparent: true,
      }),
    )
    sprite.scale.set(6, 6, 1)
    sprite.position.set(x, 2.5, z)
    sprite.renderOrder = 10
    scene.add(sprite)
  })
}
