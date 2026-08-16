<template>
  <div class="sidebar-item" :class="{ active: active }" @click="handleClick" @mousedown="handleMouseDown" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
    <span class="text">车身</span>
    <div class="dot"></div>
  </div>
</template>

<script setup>
import { onUnmounted, ref } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  },
  scene: {
    type: Object,
    default: null
  },
  carModel: {
    type: Object,
    default: null
  },
  ground: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['click', 'long-press-start', 'long-press-end'])

// 长按车身的粒子效果
let particleSystem = null
let particleUniforms = null
let particleTime = 0
let isLongPressing = false
let longPressTimer = null
let glowMaterial = null
let savedSceneBackground = null

// 光照效果
let ambientLight = null
let topLight = null
let fillLight = null
let savedAmbientIntensity = null
let savedTopLightIntensity = null

// 上方向量
const upDir = new THREE.Vector3(0, 1, 0)

const handleClick = () => {
  emit('click')
}

// 创建辉光材质
const createGlowMaterial = () => {
  const uniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x00ffff) },
    uGlowStrength: { value: 0.5 }
  }

  const vertexShader = `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  const fragmentShader = `
    precision highp float;
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uGlowStrength;
    varying vec3 vNormal;
    void main() {
      float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
      vec3 glow = uColor * intensity * uGlowStrength;
      gl_FragColor = vec4(glow, 1.0);
    }
  `

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
}

// 创建粒子系统
const createParticleSystem = () => {
  const particleCount = 2000
  const positions = new Float32Array(particleCount * 3)
  const velocities = new Float32Array(particleCount * 3)
  const lifetimes = new Float32Array(particleCount)
  const sizes = new Float32Array(particleCount)

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = 0
    positions[i * 3 + 1] = 0
    positions[i * 3 + 2] = 0

    velocities[i * 3] = (Math.random() - 0.5) * 2
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 2
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 2

    lifetimes[i] = Math.random()
    sizes[i] = Math.random() * 0.05 + 0.01
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
  geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

  const uniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x00ffff) },
    uCarPosition: { value: new THREE.Vector3() }
  }

  const vertexShader = `
    attribute vec3 velocity;
    attribute float lifetime;
    attribute float size;
    uniform float uTime;
    uniform vec3 uCarPosition;
    varying float vLifetime;
    void main() {
      vLifetime = lifetime;
      float t = mod(uTime + lifetime, 1.0);
      vec3 pos = uCarPosition + velocity * t * 2.0;
      gl_PointSize = size * (1.0 - t) * 20.0;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `

  const fragmentShader = `
    precision highp float;
    uniform vec3 uColor;
    varying float vLifetime;
    void main() {
      float t = vLifetime;
      float alpha = 1.0 - t;
      gl_FragColor = vec4(uColor, alpha);
    }
  `

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  return { system: new THREE.Points(geometry, material), uniforms }
}

// 启用粒子效果
const enableParticleEffect = () => {
  if (!props.scene || !props.carModel || particleSystem) return

  // 保存原始背景
  if (!savedSceneBackground) {
    savedSceneBackground = props.scene.background
  }

  // 设置为黑色背景
  props.scene.background = new THREE.Color(0x000000)

  // 隐藏地面
  if (props.ground) {
    props.ground.visible = false
  }

  // 创建粒子系统
  const result = createParticleSystem()
  particleSystem = result.system
  particleUniforms = result.uniforms

  // 创建辉光材质
  glowMaterial = createGlowMaterial()

  // 为汽车模型添加辉光效果
  props.carModel.traverse(function (child) {
    if (child.isMesh) {
      child.userData.originalMaterial = child.material
      child.material = glowMaterial
    }
  })

  // 调整光照效果
  adjustLighting()

  props.scene.add(particleSystem)
  particleTime = 0
  isLongPressing = true
  emit('long-press-start')
}

// 调整光照效果
const adjustLighting = () => {
  if (!props.scene) return

  // 检查并保存现有的环境光
  props.scene.traverse((child) => {
    if (child.isAmbientLight) {
      savedAmbientIntensity = child.intensity
      child.intensity = 0.3 // 降低环境光强度
    }
    if (child.isPointLight && child.position.y > 2) {
      // 假设这是顶部光源
      savedTopLightIntensity = child.intensity
      child.intensity = 0.5 // 降低顶部光源亮度
    }
  })

  // 创建或更新环境光
  if (!ambientLight) {
    ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
    props.scene.add(ambientLight)
  }

  // 创建顶部光源（如果不存在）
  if (!topLight) {
    topLight = new THREE.PointLight(0xffffff, 0.5, 10)
    topLight.position.set(0, 3, 0)
    topLight.castShadow = true
    props.scene.add(topLight)
  }

  // 创建补光光源（突出细节）
  if (!fillLight) {
    fillLight = new THREE.DirectionalLight(0xffffff, 0.4)
    fillLight.position.set(2, 1, 2)
    fillLight.castShadow = true
    props.scene.add(fillLight)
  }
}

// 禁用粒子效果
const disableParticleEffect = () => {
  if (!particleSystem) return

  // 恢复汽车模型的原始材质
  if (props.carModel) {
    props.carModel.traverse(function (child) {
      if (child.isMesh && child.userData.originalMaterial) {
        child.material = child.userData.originalMaterial
        delete child.userData.originalMaterial
      }
    })
  }

  // 移除粒子系统
  if (props.scene) {
    props.scene.remove(particleSystem)
  }

  // 恢复原始光照
  restoreLighting()

  // 恢复原始背景
  if (props.scene && savedSceneBackground) {
    props.scene.background = savedSceneBackground
    savedSceneBackground = null
  }

  // 恢复地面
  if (props.ground) {
    props.ground.visible = true
  }

  // 释放资源
  if (particleSystem.geometry) {
    particleSystem.geometry.dispose()
  }
  if (particleSystem.material) {
    particleSystem.material.dispose()
  }
  if (glowMaterial) {
    glowMaterial.dispose()
  }

  particleSystem = null
  particleUniforms = null
  glowMaterial = null
  isLongPressing = false
  particleTime = 0
  emit('long-press-end')
}

// 恢复原始光照
const restoreLighting = () => {
  if (!props.scene) return

  // 恢复现有的环境光
  props.scene.traverse((child) => {
    if (child.isAmbientLight && savedAmbientIntensity !== null) {
      child.intensity = savedAmbientIntensity
    }
    if (child.isPointLight && child.position.y > 2 && savedTopLightIntensity !== null) {
      child.intensity = savedTopLightIntensity
    }
  })

  // 移除添加的光源
  if (ambientLight && props.scene) {
    props.scene.remove(ambientLight)
    ambientLight = null
  }
  if (topLight && props.scene) {
    props.scene.remove(topLight)
    topLight = null
  }
  if (fillLight && props.scene) {
    props.scene.remove(fillLight)
    fillLight = null
  }

  // 重置保存的光照强度
  savedAmbientIntensity = null
  savedTopLightIntensity = null
}

// 更新粒子效果（需要在动画循环中调用）
const tick = (delta) => {
  if (!isLongPressing || !particleSystem || !particleUniforms || !props.carModel) return
  
  particleTime += delta
  particleUniforms.uTime.value = particleTime
  particleUniforms.uCarPosition.value.copy(props.carModel.position)
}

// 处理鼠标按下事件
const handleMouseDown = () => {
  if (!props.active || !props.carModel) return

  // 启动长按计时器
  longPressTimer = setTimeout(() => {
    enableParticleEffect()
  }, 800) // 800ms长按触发
}

// 处理鼠标松开事件
const handleMouseUp = () => {
  // 清除长按计时器
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }

  // 禁用粒子效果
  if (isLongPressing) {
    disableParticleEffect()
  }
}

// 清理资源
onUnmounted(() => {
  disableParticleEffect()
  if (longPressTimer) {
    clearTimeout(longPressTimer)
  }
})

// 暴露方法给父组件
defineExpose({
  tick,
  handleMouseDown,
  handleMouseUp
})
</script>

<style scoped>
.sidebar-item {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  background-color: transparent;
  margin-right: 0;
  border-radius: 0;
}

.sidebar-item:hover {
  color: #ffffff;
  transform: translateX(-5px);
  background-color: transparent;
}

.sidebar-item.active {
  color: #ffffff;
  font-weight: bold;
  transform: translateX(-5px);
  background-color: transparent;
}

/* 圆点样式 */
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.6);
  transition: all 0.3s ease;
  position: relative;
  right: 0;
}

.sidebar-item.active .dot {
  background-color: #ff6600;
  box-shadow: 0 0 0 4px rgba(255, 102, 0, 0.3);
}

.sidebar-item:hover .dot {
  background-color: #ffffff;
}

/* 文本样式 */
.text {
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  transform: none;
}

/* 移除激活状态的竖线 */
.sidebar-item.active::before {
  display: none;
}
</style>
