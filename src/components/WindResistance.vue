<template>
  <div v-if="false" />
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as THREE from 'three'
import { getPerformanceConfig } from '../utils/threeHelpers.js'

// 防抖函数
function debounce(func, delay) {
  let timeoutId
  return function(...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

const props = defineProps({
  scene: {
    type: Object,
    default: null
  },
  carModel: {
    type: Object,
    default: null
  },
  activeSidebarItem: {
    type: String,
    default: ''
  }
})

let isEnabled = false

let windGroup = null
let lineMeshes = []
let lineMaterials = []

let skyDome = null
let hemisphereLight = null
let savedBackground = null

let time = 0

const upDir = new THREE.Vector3(0, 1, 0)
const downDir = new THREE.Vector3(0, -1, 0)

// 风阻配置存储
const windConfig = ref({
  curveCount: 20,
  lineSegments: 60,
  lineThickness: 0.1,
  animationSpeed: 1.0,
  opacity: 0.9
})

// 加载风阻配置
onMounted(() => {
  const savedConfig = localStorage.getItem('windConfig')
  if (savedConfig) {
    windConfig.value = JSON.parse(savedConfig)
  }
})

// 防抖保存
const debouncedSaveWindConfig = debounce(() => {
  localStorage.setItem('windConfig', JSON.stringify(windConfig.value))
}, 300)

// 监听关键属性变化
watch(() => windConfig.value.curveCount, debouncedSaveWindConfig)
watch(() => windConfig.value.lineSegments, debouncedSaveWindConfig)
watch(() => windConfig.value.lineThickness, debouncedSaveWindConfig)
watch(() => windConfig.value.animationSpeed, debouncedSaveWindConfig)
watch(() => windConfig.value.opacity, debouncedSaveWindConfig)

function safeDisposeMaterial(mat) {
  if (!mat) return
  if (Array.isArray(mat)) {
    mat.forEach(m => safeDisposeMaterial(m))
    return
  }
  mat.dispose?.()
}

function safeDisposeGeometry(geo) {
  geo?.dispose?.()
}

function disposeGroup(group) {
  if (!group) return
  group.traverse((child) => {
    if (!child) return
    if (child.geometry) safeDisposeGeometry(child.geometry)
    if (child.material) safeDisposeMaterial(child.material)
  })
}

function pickForwardAxis(boxSize) {
  // 只在 x/z 里选“车头->车尾”的主要方向（多数轿车长度是最大维度之一）
  if (boxSize.x >= boxSize.z) return 'x'
  return 'z'
}

function computeWidthSpanFromRight(box, rightDir) {
  // 用包围盒 8 个角投影到 rightDir 上，得到右侧跨度（相当于宽度 + 溢出）
  const corners = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z)
  ]

  let minProj = Infinity
  let maxProj = -Infinity
  for (const c of corners) {
    const p = c.dot(rightDir)
    minProj = Math.min(minProj, p)
    maxProj = Math.max(maxProj, p)
  }
  return Math.max(0.001, maxProj - minProj)
}

function buildWindCurves(carModel, curveCount) {
  const curves = []

  // 用 local 空间的包围盒生成局部坐标系下的曲线，确保跟随 carModel 旋转
  const box = new THREE.Box3().setFromObject(carModel)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())

  const forwardAxis = pickForwardAxis(size)
  const forwardAxisVec = forwardAxis === 'x'
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 0, 1)

  // HEAD_SIGN 用于修正“哪个端点是车头”（以及由此决定流光推进方向）
  // 恢复原来的方向设置
  const HEAD_SIGN = 1
  const forwardHalf = forwardAxis === 'x' ? size.x / 2 : size.z / 2

  // 调整车头和车尾的位置，让流线从车头前方开始
  const headLocal = center.clone().add(forwardAxisVec.clone().multiplyScalar(forwardHalf * HEAD_SIGN * 1.5)) // 车头前方
  const tailLocal = center.clone().add(forwardAxisVec.clone().multiplyScalar(-forwardHalf * HEAD_SIGN * 1.2)) // 车尾后方

  const forwardVec = tailLocal.clone().sub(headLocal).normalize() // 从车头到车尾方向
  const rightDir = new THREE.Vector3().crossVectors(forwardVec, upDir).normalize()

  const widthSpan = computeWidthSpanFromRight(box, rightDir)
  // 曲线左右偏移范围：过大很容易“跑到车身外侧”，显得不贴合
  const lateralSpan = widthSpan * 0.35

  // 曲线覆盖整个车身高度
  const yBase = center.y

  const len = headLocal.distanceTo(tailLocal)
  const curvature = len * 0.3 // 调整曲率，使流线更加贴合车身
  const lift = size.y * 0.08 // 调整抬升高度，使流线更加贴合车身

  for (let i = 0; i < curveCount; i++) {
    const u = curveCount === 1 ? 0.5 : i / (curveCount - 1)
    const offset = THREE.MathUtils.lerp(-lateralSpan, lateralSpan, u)

    // control points：p1/p2 沿前进方向推进，并叠加左右偏移与上扬，制造“流线”的层次
    const p0 = headLocal.clone().add(rightDir.clone().multiplyScalar(offset)).add(upDir.clone().multiplyScalar(lift * 0.02))
    const p3 = tailLocal.clone().add(rightDir.clone().multiplyScalar(offset)).add(upDir.clone().multiplyScalar(lift * 0.01))

    const p1 = p0.clone()
      .add(forwardVec.clone().multiplyScalar(curvature * 1.3))
      .add(rightDir.clone().multiplyScalar(offset * 0.3))
      .add(upDir.clone().multiplyScalar(lift * 1.8))

    const p2 = p3.clone()
      .add(forwardVec.clone().multiplyScalar(-curvature * 0.7))
      .add(rightDir.clone().multiplyScalar(offset * 0.3))
      .add(upDir.clone().multiplyScalar(lift * 0.5))

    // 调整 y 基准，使流线覆盖整个车身
    p0.y = yBase + (p0.y - yBase) * 0.3
    p1.y = yBase + (p1.y - yBase) * 1.4
    p2.y = yBase + (p2.y - yBase) * 1.0
    p3.y = yBase + (p3.y - yBase) * 0.4

    curves.push(new THREE.CubicBezierCurve3(p0, p1, p2, p3))
  }

  return curves
}

function createLineMaterial({ colorA, colorB, speed, opacity, thickness }) {
  const uniforms = {
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color(colorA) },
    uColorB: { value: new THREE.Color(colorB) },
    uSpeed: { value: speed },
    uOpacity: { value: opacity },
    uTailPow: { value: 0.95 },
    uThickness: { value: thickness },
    uNoiseScale: { value: Math.random() * 0.5 + 0.5 },
    uNoiseStrength: { value: Math.random() * 0.3 + 0.1 }
  }

  const vertexShader = `
    attribute float aT;
    attribute float aThickness;
    varying float vT;
    varying float vThickness;
    void main() {
      vT = aT;
      vThickness = aThickness;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  const fragmentShader = `
    precision highp float;
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uSpeed;
    uniform float uOpacity;
    uniform float uTailPow;
    uniform float uThickness;
    uniform float uNoiseScale;
    uniform float uNoiseStrength;
    varying float vT;
    varying float vThickness;
    
    // 简单的噪声函数
    float noise(float x) {
      return fract(sin(x * 12.9898) * 78.233);
    }
    
    // 平滑噪声
    float smoothNoise(float x) {
      float i = floor(x);
      float f = fract(x);
      float a = noise(i);
      float b = noise(i + 1.0);
      return mix(a, b, f * f * (3.0 - 2.0 * f));
    }
    
    // 2D噪声函数
    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = noise(i.x + i.y * 57.0);
      float b = noise(i.x + 1.0 + i.y * 57.0);
      float c = noise(i.x + (i.y + 1.0) * 57.0);
      float d = noise(i.x + 1.0 + (i.y + 1.0) * 57.0);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
    }

    void main() {
      float t = clamp(vT, 0.0, 1.0);
      float phase = t - uTime * uSpeed;
      float m = fract(phase);

      // 亮斑段落（在参考图那种“有亮点推进”的感觉上做近似）
      float band = smoothstep(0.0, 0.08, m) * (1.0 - smoothstep(0.08, 0.16, m));

      // 车头更亮，车尾保持一定亮度
      float tailFade = pow(1.0 - t, uTailPow) * 0.7 + 0.3;

      // 添加噪声，使线条粗细有变化
      float noiseValue = smoothNoise((t + uTime * 0.5) * uNoiseScale) * uNoiseStrength;
      float thickness = uThickness * (0.8 + noiseValue);

      // 模拟风的流动效果，使线条粗细随位置和时间变化
      float windEffect = smoothstep(0.2, 0.8, t) * 0.5 + 0.5;
      thickness *= windEffect;

      // 随机加粗加细效果 - 更强的随机性
      float randomThickness = 1.0 + sin(t * 15.0 + uTime * 3.0 + noise(vec2(t * 5.0, uTime * 0.5)) * 10.0) * 0.6;
      thickness *= randomThickness;

      // 随机透明度变化，使线条不固定显示
      float randomAlpha = 0.8 + sin(t * 8.0 + uTime * 2.0) * 0.2;

      // 混合基础颜色和白色，使线条更亮
      vec3 baseCol = mix(uColorA, uColorB, t);
      vec3 highlight = vec3(1.0, 1.0, 1.0);
      vec3 finalCol = mix(baseCol, highlight, 0.7);
      vec3 glowCol = finalCol * (0.5 + 1.5 * tailFade) + finalCol * (3.0 * band);

      float alpha = uOpacity * (0.1 + 0.8 * tailFade + 1.2 * band) * thickness * randomAlpha;
      gl_FragColor = vec4(glowCol, alpha);
    }
  `

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    linewidth: 2 // 基础线宽
  })

  return { material, uniforms }
}

function collectCarMeshes(carModel) {
  const meshes = []
  carModel.traverse((child) => {
    if (child && child.isMesh) meshes.push(child)
  })
  return meshes
}

function projectCurveToCarSurface({
  curve,
  carModel,
  carMeshes,
  samples,
  raycastRaycaster,
  rayOriginOffset,
  epsilonUp
}) {
  // 通过“向下射线投射”把曲线采样点贴到车身表面上，避免线穿模进车体。
  // 由于 windGroup 挂在 carModel 上，enable 时投射一次即可，后续旋转会跟随。
  const projected = []
  
  // 获取汽车的包围盒，计算车顶的大致高度
  const box = new THREE.Box3().setFromObject(carModel)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const roofHeight = center.y + size.y * 0.4 // 车顶的大致高度
  
  for (let s = 0; s < samples; s++) {
    const t = s / (samples - 1)
    const localP = curve.getPointAt(t)

    // 直接设置y坐标为车顶高度，确保在车顶上
    const adjustedP = localP.clone()
    adjustedP.y = roofHeight
    
    // 从车顶上方发射射线，确保命中车顶
    const worldP = carModel.localToWorld(adjustedP.clone())
    const rayOrigin = worldP.clone().add(upDir.clone().multiplyScalar(rayOriginOffset * 2)) // 从更高的位置发射
    raycastRaycaster.ray.origin.copy(rayOrigin)
    raycastRaycaster.ray.direction.copy(downDir)

    const hits = raycastRaycaster.intersectObjects(carMeshes, false)
    if (hits && hits.length > 0) {
      // 取第一个命中点，通常是车顶
      const hit = hits[0]
      const hitPoint = hit.point.clone().add(upDir.clone().multiplyScalar(0.15)) // 进一步增加偏移量，使风阻线离车身更远
      projected.push(carModel.worldToLocal(hitPoint))
    } else {
      // 如果没有命中点，使用调整后的点并增加y坐标
      const finalP = adjustedP.clone()
      finalP.y += 0.15 // 进一步增加y坐标，使风阻线离车身更远
      projected.push(finalP)
    }
  }

  // 用 CatmullRom 让曲线经过“已投射”的表面点
  return new THREE.CatmullRomCurve3(projected, false, 'catmullrom', 0.5)
}

function setSkyBackground(scene, carModel) {
  savedBackground = scene.background
  scene.background = null

  hemisphereLight = new THREE.HemisphereLight(
    new THREE.Color(0x2a3f5a),
    new THREE.Color(0x050506),
    0.35
  )
  scene.add(hemisphereLight)

  const domeGeo = new THREE.SphereGeometry(70, 16, 8) // 减少球体细分，提高性能
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: false,
    depthWrite: false,
    uniforms: {
      uTopColor: { value: new THREE.Color(0x0b1220) },
      uBottomColor: { value: new THREE.Color(0x020207) },
      uCenterY: { value: carModel.position.y },
      uHeight: { value: 22.0 }
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform vec3 uTopColor;
      uniform vec3 uBottomColor;
      uniform float uCenterY;
      uniform float uHeight;
      varying vec3 vWorldPos;
      void main() {
        float h = clamp((vWorldPos.y - uCenterY) / uHeight, -1.0, 1.0);
        float t = (h + 1.0) * 0.5;
        vec3 col = mix(uBottomColor, uTopColor, t);

        // 极轻微暗角，让背景更“高级”但不盖住动态流线
        float vignette = pow(1.0 - t * t, 1.4);
        col *= (0.85 + 0.25 * vignette);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
    toneMapped: false
  })

  skyDome = new THREE.Mesh(domeGeo, domeMat)
  skyDome.position.copy(carModel.position)
  skyDome.frustumCulled = false
  scene.add(skyDome)
}

function clearSkyBackground(scene) {
  if (skyDome) {
    skyDome.parent?.remove(skyDome)
    safeDisposeGeometry(skyDome.geometry)
    safeDisposeMaterial(skyDome.material)
    skyDome = null
  }
  if (hemisphereLight) {
    hemisphereLight.parent?.remove(hemisphereLight)
    hemisphereLight = null
  }
  if (scene && savedBackground !== undefined) {
    scene.background = savedBackground
  }
  savedBackground = undefined
}

function enableWindResistance(sceneArg, carModelArg) {
  if (isEnabled) return
  const scene = sceneArg || props.scene
  const carModel = carModelArg || props.carModel
  if (!scene || !carModel) {
    console.warn('[WindResistance] enableWindResistance: missing scene or carModel')
    return
  }

  isEnabled = true
  time = 0

  // background + lighting
  setSkyBackground(scene, carModel)

  // wind group (挂到车身上，保证跟随旋转)
  windGroup = new THREE.Group()
  windGroup.name = 'windGroup'
  carModel.add(windGroup)

  // 进一步减少曲线数量，提高性能
  const curveCount = 6
  // 进一步减少线段密度，提高性能
  const lineSegments = 20

  const curves = buildWindCurves(carModel, curveCount)

  // 把曲线贴到车顶/车身表面（避免穿模）
  // 这里用“向下射线投射”的方式：从曲线点上方射线向下，命中车表面后将曲线点替换为命中点。
  carModel.updateMatrixWorld(true)
  const carMeshes = collectCarMeshes(carModel)
  const raycastRaycaster = new THREE.Raycaster()
  const projectionSamples = 8 // 进一步减少采样点数量，提高射线投射速度
  const rayOriginOffset = Math.max(0.2, (carModel.scale?.y || 1) * 1.0)
  const epsilonUp = 0.004

  // 优化射线投射：只对可见的曲线进行投射
  const projectedCurves = curves.map((curve) =>
    projectCurveToCarSurface({
      curve,
      carModel,
      carMeshes,
      samples: projectionSamples,
      raycastRaycaster,
      rayOriginOffset,
      epsilonUp
    })
  )

  // Line：扁平发光流线的主体视觉
  lineMeshes = []
  lineMaterials = []

  // 蓝白色流线，接近参考图效果
  const tubeColors = [
    [0xffffff, 0xbfeeff]
  ]

  projectedCurves.forEach((curve, idx) => {
    // 右侧（u>0.5）叠加“半透明白色”气流路径
    const u = curveCount === 1 ? 0.5 : idx / (curveCount - 1)
    const isRightSide = u > 0.5

    const neon = tubeColors[idx % tubeColors.length]
    const colorA = isRightSide ? 0xffffff : neon[0]
    const colorB = isRightSide ? 0xbfeeff : neon[1]

    const speed = windConfig.value.animationSpeed + idx * 0.2 // 增加线条动画速度，增强风的流动感
    const opacity = isRightSide ? windConfig.value.opacity : windConfig.value.opacity * 1.3 // 增加透明度，使流线更加明显
    const thickness = windConfig.value.lineThickness + Math.random() * 0.4 // 增加基础粗细，使流线更加明显

    const { material, uniforms } = createLineMaterial({ colorA, colorB, speed, opacity, thickness })

    // 采样出贴合曲线的折线，并用 aT 做着色器的动态亮斑推进
    const pts = curve.getPoints(lineSegments)
    const positions = new Float32Array(pts.length * 3)
    const aT = new Float32Array(pts.length)
    const aThickness = new Float32Array(pts.length)
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]
      positions[i * 3 + 0] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
      aT[i] = i / (pts.length - 1)
      // 添加随机粗细变化
      aThickness[i] = thickness * (0.8 + Math.random() * 0.4)
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setAttribute('aT', new THREE.BufferAttribute(aT, 1))
    geom.setAttribute('aThickness', new THREE.BufferAttribute(aThickness, 1))

    const line = new THREE.Line(geom, material)
    line.frustumCulled = false
    line.renderOrder = 12
    windGroup.add(line)

    lineMeshes.push(line)
    lineMaterials.push(uniforms)
  })
}

function disableWindResistance() {
  if (!isEnabled) return
  isEnabled = false

  if (windGroup) {
    windGroup.parent?.remove(windGroup)
    disposeGroup(windGroup)
    windGroup = null
  }

  lineMeshes = []
  lineMaterials = []

  // background + light cleanup
  const scene = props.scene
  if (scene) clearSkyBackground(scene)
  else savedBackground = undefined
}

function tick(delta) {
  if (!isEnabled) return
  time += delta

  // Line shaders
  for (let i = 0; i < lineMeshes.length; i++) {
    lineMaterials[i].uTime.value = time
  }
}

onUnmounted(() => {
  disableWindResistance()
})

defineExpose({
  enableWindResistance,
  disableWindResistance,
  tick
})
</script>

<style scoped>
/* 该组件通过 Three.js 直接操作场景，不渲染 DOM */
</style>