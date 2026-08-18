<template>
  <div class="showroom">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <video 
        ref="loadingVideo" 
        class="loading-video" 
        autoplay 
        muted 
        @playing="onVideoPlaying"
        @ended="onVideoEnded"
      >
        <source src="/scene/小米汽车.mp4" type="video/mp4">
        您的浏览器不支持视频标签。
      </video>
    </div>
    <!-- 3D场景 -->
    <div ref="containerRef" class="scene-container" @mousedown="handleMouseDown" @mouseup="handleMouseUp" @mouseleave="handleMouseUp" @touchstart="handleTouchStart" @touchend="handleTouchEnd" @touchcancel="handleTouchEnd" @touchmove="handleTouchMove"></div>
    <!-- 侧边栏组件 -->
    <Sidebar 
      ref="sidebarRef"
      :loading="loading" 
      :active-sidebar-item="activeSidebarItem" 
      :car-model="carModel" 
      :scene="scene"
      :ground="ground"
      @sidebar-change="handleSidebarChange" 
      @rotate-car="handleRotateCar"
      @long-press-start="handleLongPressStart"
      @long-press-end="handleLongPressEnd"
      @su7-long-press-start="handleSU7LongPressStart"
      @su7-long-press-end="handleSU7LongPressEnd"
    />
    <!-- 颜色选择器组件 -->
    <ColorPicker 
      :loading="loading" 
      :active-sidebar-item="activeSidebarItem" 
      :car-model="carModel" 
      @color-changed="handleColorChanged" 
    />
    <!-- 风阻效果组件 -->
    <WindResistance 
      ref="windResistanceRef"
      :scene="scene" 
      :car-model="carModel" 
      :active-sidebar-item="activeSidebarItem" 
    />
    
    <!-- 内容显示组件 -->
    <ContentDisplay 
      :active-item="activeSidebarItem" 
    />
    
    <!-- 设备检测器组件 -->
    <DeviceDetector 
      :initial-device="deviceType"
      :visible="showDeviceDetector"
      @device-change="handleDeviceChange"
      @close="showDeviceDetector = false"
    />
    
    <!-- 定制控制面板 -->
    <div class="customization-controls" v-if="activeSidebarItem === 'customization'">
      <div class="control-item">
        <label>色相</label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          v-model.number="customizationControls.hue"
          @input="applyCustomization"
        >
        <span>{{ Math.round(customizationControls.hue * 360) }}°</span>
      </div>
      <div class="control-item">
        <label>饱和度</label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          v-model.number="customizationControls.saturation"
          @input="applyCustomization"
        >
        <span>{{ Math.round(customizationControls.saturation * 100) }}%</span>
      </div>
      <div class="control-item">
        <label>明度</label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          v-model.number="customizationControls.lightness"
          @input="applyCustomization"
        >
        <span>{{ Math.round(customizationControls.lightness * 100) }}%</span>
      </div>
      <div class="control-item">
        <label>金属度</label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          v-model.number="customizationControls.metalness"
          @input="applyCustomization"
        >
        <span>{{ Math.round(customizationControls.metalness * 100) }}%</span>
      </div>
      <div class="control-item">
        <label>粗糙度</label>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          v-model.number="customizationControls.roughness"
          @input="applyCustomization"
        >
        <span>{{ Math.round(customizationControls.roughness * 100) }}%</span>
      </div>
    </div>
    
    <!-- 色值代码框 -->
    <div class="color-code-box" v-if="activeSidebarItem === 'customization'">
      <div class="color-preview" :style="{ backgroundColor: currentColorHex }"></div>
      <div class="color-value">{{ currentColorHex }}</div>
      <div class="material-values">
        <div>金属度: {{ Math.round(customizationControls.metalness * 100) }}%</div>
        <div>粗糙度: {{ Math.round(customizationControls.roughness * 100) }}%</div>
      </div>
    </div>
    
    <!-- 相机按钮 -->
    <div class="camera-button" v-if="activeSidebarItem === 'customization'" @click="saveScreenshot">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- 相机主体 -->
        <rect x="3" y="6" width="18" height="14" rx="2" stroke="white" stroke-width="1.5" fill="none"/>
        <!-- 相机顶部凸起 -->
        <path d="M8 6V5C8 4.44772 8.44772 4 9 4H15C15.5523 4 16 4.44772 16 5V6" stroke="white" stroke-width="1.5" fill="none"/>
        <!-- 镜头外圈 -->
        <circle cx="12" cy="13" r="4" stroke="white" stroke-width="1.5" fill="none"/>
        <!-- 镜头内圈 -->
        <circle cx="12" cy="13" r="2" stroke="white" stroke-width="1.5" fill="none"/>
        <!-- 闪光灯 -->
        <circle cx="17" cy="9" r="1" fill="white"/>
      </svg>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import * as TWEEN from '@tweenjs/tween.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import ColorPicker from './ColorPicker.vue'
import Sidebar from './Sidebar.vue'
import WindResistance from './WindResistance.vue'
import ContentDisplay from './ContentDisplay.vue'
import DeviceDetector from './DeviceDetector.vue'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { getDeviceType, getPerformanceConfig } from '../utils/threeHelpers.js'

// 设备类型检测
const deviceType = ref(getDeviceType())
const isTablet = computed(() => deviceType.value === 'tablet')
const isDesktop = computed(() => deviceType.value === 'desktop')
const isMobile = computed(() => deviceType.value === 'mobile')

// 性能配置
const performanceConfig = getPerformanceConfig()

// 设备检测器显示状态
const showDeviceDetector = ref(true)

// 处理设备类型切换
const handleDeviceChange = (newDevice) => {
  deviceType.value = newDevice
  if (__DEV__) console.log('[Showroom] Device mode changed to:', newDevice)
  
  // 可以在这里添加设备切换后的逻辑
  // 例如：重新配置渲染器、更新交互方式等
}

const containerRef = ref(null)
const loadingVideo = ref(null)
const windResistanceRef = ref(null)
const sidebarRef = ref(null)
let scene, camera, renderer, controls, labelRenderer, clock
let carModel = null // 保存汽车模型引用
let wheels = [] // 车轮数组
let wheelRotationEnabled = false // 车轮旋转开关

const __DEV__ = import.meta.env.DEV
const getCarModelUrl = () => (__DEV__ ? `/models/su7.glb?v=${Date.now()}` : '/models/su7.glb')

let rafId = null
let animationStopped = false

// 车身“隧道霓虹映射”效果（长按 SU7 时启用）
let tunnelBodyGlowEnabled = false
let tunnelBodyGlowUniforms = []
let tunnelBodyGlowTargets = []

// “穿越隧道”速度线（相机前方/周围的线段）
let tunnelEnabled = false
let tunnelLineMesh = null
let tunnelLineGeometry = null
let tunnelLinePositions = null
let tunnelLineColors = null
let tunnelLineMeta = null // 每条线的 { x, y, zHead, len, speed, hue }
let savedSceneBackgroundForTunnel = null
let savedSceneEnvironmentForTunnel = null
let ground = null

// 雷达页的"环形扫描隧道/波纹"效果
let radarScanEnabled = false
let radarScanGroup = null
let radarRippleData = []
let radarScanTime = 0

function enableTunnelBodyGlow() {
  if (!carModel || tunnelBodyGlowEnabled) return
  tunnelBodyGlowEnabled = true
  tunnelBodyGlowUniforms = []
  tunnelBodyGlowTargets = []

  // 对车身主体做映射（避免车灯/玻璃/轮胎被"染色"）
  const bodyNames = new Set(['Object_30', 'Object_4', 'Object_6', 'Object_8', 'Object_10', 'Object_12', 'Object_14', 'Object_16', 'Object_18', 'Object_20', 'Object_22', 'Object_24', 'Object_26', 'Object_28'])

  carModel.traverse((child) => {
    if (!child?.isMesh) return
    if (!bodyNames.has(child.name)) return
    const mat = child.material
    if (!mat) return

    // 仅对标准/物理材质注入 shader（其他材质跳过，保证不破坏效果）
    if (!('onBeforeCompile' in mat)) return

    // 防止重复注入
    if (child.userData.__tunnelGlowInjected) return

    // 保存原始钩子，便于恢复
    child.userData.__tunnelGlowInjected = true
    child.userData.__tunnelGlowOriginalOnBeforeCompile = mat.onBeforeCompile
    child.userData.__tunnelGlowOriginalCustomProgramCacheKey = mat.customProgramCacheKey

    mat.onBeforeCompile = (shader) => {
      // 先执行原有逻辑（如果有）
      if (typeof child.userData.__tunnelGlowOriginalOnBeforeCompile === 'function') {
        child.userData.__tunnelGlowOriginalOnBeforeCompile(shader)
      }

      shader.uniforms.uTunnelTime = { value: 0 }
      shader.uniforms.uTunnelIntensity = { value: 1.15 }
      shader.uniforms.uTunnelColorA = { value: new THREE.Color(0xff4df0) } // 玫红
      shader.uniforms.uTunnelColorB = { value: new THREE.Color(0x7df0ff) } // 青蓝
      shader.uniforms.uTunnelColorC = { value: new THREE.Color(0xffffff) } // 白

      // 记录 uniforms，避免每帧 traverse
      tunnelBodyGlowUniforms.push(shader.uniforms)
      tunnelBodyGlowTargets.push(child)

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 vTunnelLocalPos;
varying vec3 vTunnelWorldPos;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
vTunnelLocalPos = position;
vTunnelWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;`
        )

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uTunnelTime;
uniform float uTunnelIntensity;
uniform vec3 uTunnelColorA;
uniform vec3 uTunnelColorB;
uniform vec3 uTunnelColorC;
varying vec3 vTunnelLocalPos;
varying vec3 vTunnelWorldPos;

float tunnelBand(float x, float w0, float w1) {
  // 一个软边“亮带”
  float a = smoothstep(0.0, w0, x);
  float b = 1.0 - smoothstep(w0, w1, x);
  return clamp(a * b, 0.0, 1.0);
}`
        )
        // 在 output 前叠加 emissive/glow（不改变原本 PBR，只加“光”）
        .replace(
          '#include <output_fragment>',
          `#include <output_fragment>
// --- tunnel glow overlay ---
// 以车身局部坐标的“长度方向”作为推进轴，制造高速穿越的光带
float axis = abs(vTunnelLocalPos.x) > abs(vTunnelLocalPos.z) ? vTunnelLocalPos.x : vTunnelLocalPos.z;
float t = axis * 0.35 - uTunnelTime * 7.0;
float m = fract(t);

// 组合 3 组不同宽度的亮带，接近参考图那种“霓虹条纹反射”
float b1 = tunnelBand(m, 0.06, 0.16);
float b2 = tunnelBand(fract(t * 1.7 + 0.21), 0.04, 0.11);
float b3 = tunnelBand(fract(t * 2.6 + 0.63), 0.03, 0.08);
float band = max(b1, max(b2 * 0.85, b3 * 0.7));

// 轻微 fresnel：边缘更亮，贴近金属车漆“吃光”的感觉
vec3 V = normalize(cameraPosition - vTunnelWorldPos);
float fres = pow(1.0 - clamp(dot(normalize(normal), V), 0.0, 1.0), 2.0);

vec3 glowCol = mix(uTunnelColorA, uTunnelColorB, m);
glowCol = mix(glowCol, uTunnelColorC, band * 0.35);

// 叠加到 emissive（不改 baseColor），效果更“映射/反射”
totalEmissiveRadiance += glowCol * (band * (0.45 + 0.9 * fres)) * uTunnelIntensity;`
        )
    }

    mat.customProgramCacheKey = () => 'tunnelGlow_v1'
    mat.needsUpdate = true
  })
}

function disableTunnelBodyGlow() {
  if (!carModel || !tunnelBodyGlowEnabled) return
  tunnelBodyGlowEnabled = false

  tunnelBodyGlowTargets.forEach((child) => {
    if (!child?.isMesh) return
    const mat = child.material
    if (!mat) return
    if (!child.userData.__tunnelGlowInjected) return

    mat.onBeforeCompile = child.userData.__tunnelGlowOriginalOnBeforeCompile || mat.onBeforeCompile
    mat.customProgramCacheKey = child.userData.__tunnelGlowOriginalCustomProgramCacheKey || mat.customProgramCacheKey
    mat.needsUpdate = true

    delete child.userData.__tunnelGlowInjected
    delete child.userData.__tunnelGlowOriginalOnBeforeCompile
    delete child.userData.__tunnelGlowOriginalCustomProgramCacheKey
  })

  tunnelBodyGlowUniforms = []
  tunnelBodyGlowTargets = []
}

// 拖拽触发的"运动/速度线"模式（替代默认灰色背景）
let motionEnabled = false
let motionGroup = null
let motionLines = []
let motionLineUniforms = []
let motionTime = 0
let savedSceneBackgroundForMotion = null
let motionSpeed = 0
let isDraggingCar = false
let dragStartX = 0
let dragStartY = 0
let mouseMoveHandler = null
let mouseUpHandler = null
let carStartPos = null
let carForwardLocal = null
let motionForwardSign = 1

// 雷达点位标记
let radarPointsGroup = null
let savedSceneBackgroundForRadar = null
let radarLinesGroup = null

// 浏览历史记录
const viewHistory = ref([])

// 加载状态
const loading = ref(true)
const loadingProgress = ref(0)



// 侧边栏状态
const activeSidebarItem = ref('su7') // 默认选中SU7

// 定制相关变量
const customizationControls = ref({
  hue: 0,
  saturation: 1,
  lightness: 0.5,
  metalness: 0.7,
  roughness: 0.2
})

// 当前颜色的十六进制值
const currentColorHex = computed(() => {
  const { hue, saturation, lightness } = customizationControls.value
  const color = new THREE.Color().setHSL(hue, saturation, lightness)
  return '#' + color.getHexString()
})

// 应用定制设置
const applyCustomization = () => {
  if (!carModel) return
  
  const { hue, saturation, lightness, metalness, roughness } = customizationControls.value
  
  // 转换HSB到RGB
  const color = new THREE.Color().setHSL(hue, saturation, lightness)
  
  carModel.traverse(function (child) {
    if (child.isMesh && child.name === 'Object_30') {
      child.material.color.set(color)
      child.material.metalness = metalness
      child.material.roughness = roughness
      child.material.needsUpdate = true
    }
  })
}

// 根据加载进度调整视频播放速度
const updateVideoPlaybackRate = () => {
  if (loadingVideo.value) {
    // 根据加载进度调整播放速度
    // 加载初期播放速度较慢，随着进度增加逐渐加快
    // 确保视频播放完时模型也加载完
    const progress = loadingProgress.value / 100;
    // 进度越低，播放速度越慢；进度越高，播放速度越快
    const rate = 0.5 + (progress * 1.5);
    loadingVideo.value.playbackRate = rate;
  }
}

// 背景音乐对象
let backgroundMusic = null

// 初始化背景音乐
const initBackgroundMusic = () => {
  if (backgroundMusic) return
  
  console.log('Initializing background music...')
  
  backgroundMusic = new Audio()
  backgroundMusic.src = '/music/MI.ogg'
  backgroundMusic.loop = true
  backgroundMusic.volume = 0.3
  backgroundMusic.muted = true // 初始静音
  
  // 添加事件监听器
  backgroundMusic.addEventListener('loadedmetadata', () => {
    console.log('Audio metadata loaded, duration:', backgroundMusic.duration)
  })
  
  backgroundMusic.addEventListener('canplaythrough', () => {
    console.log('Audio can play through')
    // 音频加载完成后立即尝试静音播放（获取播放权限）
    if (backgroundMusic && backgroundMusic.paused) {
      backgroundMusic.play().then(() => {
        console.log('Background music started muted')
      }).catch(e => {
        console.log('Cannot play muted audio:', e)
      })
    }
  })
  
  backgroundMusic.addEventListener('error', (e) => {
    console.error('Audio error:', e)
    console.error('Error code:', e.target.error?.code)
    console.error('Error message:', e.target.error?.message)
  })
  
  backgroundMusic.addEventListener('loadeddata', () => {
    console.log('Audio data loaded')
  })
  
  // 尝试加载
  backgroundMusic.load()
  console.log('Audio element created and loading...')
}

// 取消静音播放背景音乐
const unmuteBackgroundMusic = () => {
  console.log('Unmuting background music...')
  
  if (!backgroundMusic) {
    initBackgroundMusic()
    // 如果刚创建，需要先播放
    backgroundMusic.play().then(() => {
      backgroundMusic.muted = false
      console.log('Background music unmuted')
    }).catch(e => {
      console.error('Failed to play and unmute:', e)
    })
    return
  }
  
  // 如果已经在播放，直接取消静音
  if (!backgroundMusic.paused) {
    backgroundMusic.muted = false
    console.log('Background music unmuted')
  } else {
    // 如果暂停了，先播放再取消静音
    backgroundMusic.play().then(() => {
      backgroundMusic.muted = false
      console.log('Background music started and unmuted')
    }).catch(e => {
      console.error('Failed to play:', e)
    })
  }
}

// 播放背景音乐
const playBackgroundMusic = () => {
  unmuteBackgroundMusic()
}

// 预加载音频（在视频播放时调用）
const preloadBackgroundMusic = () => {
  console.log('Preloading background music...')
  initBackgroundMusic()
}

// 视频开始播放时预加载音频
const onVideoPlaying = () => {
  preloadBackgroundMusic()
}

// 视频结束处理
const onVideoEnded = () => {
  // 视频结束时，如果模型还未加载完成，隐藏加载界面
  if (loading.value) {
    // 添加一个平滑的过渡效果
    const loadingContainer = document.querySelector('.loading-container')
    if (loadingContainer) {
      loadingContainer.style.opacity = '0'
      setTimeout(() => {
        loading.value = false
        // 模型加载完成后自动取消静音播放音频
        unmuteBackgroundMusic()
      }, 500) // 等待过渡效果完成
    } else {
      loading.value = false
      // 模型加载完成后自动取消静音播放音频
      unmuteBackgroundMusic()
    }
  } else {
    // 如果已经加载完成，直接取消静音
    unmuteBackgroundMusic()
  }
}

// 防抖函数
function debounce(func, delay) {
  let timeoutId
  return function(...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

// 处理颜色变化事件
const handleColorChanged = (color) => {
  // 颜色变化事件处理
}

// 记录视角变化
function saveViewState() {
  if (!controls || !camera) return
  
  const viewState = {
    id: Date.now(),
    position: camera.position.toArray(),
    rotation: camera.rotation.toArray(),
    zoom: controls.getZoom ? controls.getZoom() : 1,
    mode: activeSidebarItem.value,
    timestamp: new Date().toISOString()
  }
  
  viewHistory.value.unshift(viewState)
  // 只保留最近10条记录
  viewHistory.value = viewHistory.value.slice(0, 10)
  localStorage.setItem('viewHistory', JSON.stringify(viewHistory.value))
  localStorage.setItem('lastView', JSON.stringify(viewState))
}

// 防抖保存
const debouncedSaveViewState = debounce(saveViewState, 500)

// 监听模式变化
watch(activeSidebarItem, (newMode) => {
  debouncedSaveViewState()
})

// 监听相机变化
// controls.addEventListener('change', () => {
//   saveViewState()
// })

// 处理侧边栏切换事件
const handleSidebarChange = (item) => {
  activeSidebarItem.value = item
  
  // 移除虚拟矩形盒的三条线和标注
  if (cornerLines) {
    // 移除标签
    if (cornerLines.labels) {
      cornerLines.labels.forEach(label => {
        if (label.parent) label.parent.remove(label)
      })
    }
    // 移除线条组
    if (cornerLines.parent) cornerLines.parent.remove(cornerLines)
    cornerLines = null
  }
  
  // 清除雷达点位（如果不是雷达模式）
  if (item !== 'radar') {
    clearRadarPoints()
    disableRadarScanEffect()
    // 恢复背景
    if (scene && savedSceneBackgroundForRadar) {
      scene.background = savedSceneBackgroundForRadar
      savedSceneBackgroundForRadar = null
    }
  } else {
    // 雷达模式：设置黑色背景
    if (scene) {
      savedSceneBackgroundForRadar = scene.background
      scene.background = new THREE.Color(0x000000)
    }
  }
  
  // 风阻模式切换：wind 启用，其他模式禁用
  if (windResistanceRef.value) {
    if (item === 'wind') {
      if (scene && carModel) {
        // 确保车身朝向正面（车头朝向屏幕外）
        carModel.rotation.set(0, 0, 0)
        // 启用风阻效果
        windResistanceRef.value.enableWindResistance(scene, carModel)
      }
    } else {
      windResistanceRef.value.disableWindResistance()
    }
  }
  
  // 根据不同的侧边栏项调整相机位置
  if (camera && controls) {
    const duration = 1200 // 动画持续时间
    const startTime = Date.now()
    const startPos = camera.position.clone()
    const startTarget = controls.target.clone()
    
    // 根据不同模式设置相机目标位置
    let targetPos, targetLookAt
    
    if (item === 'radar') {
      // 雷达模式：相机在汽车上方，朝下看
      targetPos = new THREE.Vector3(0, 5, 0)
      targetLookAt = new THREE.Vector3(0, 0, 0)
    } else {
      // 其他模式使用默认位置
      targetPos = new THREE.Vector3(0, 0.2, 4)
      targetLookAt = new THREE.Vector3(0, 0, 0)
    }
    
    // 根据不同模式执行相应的功能
    switch (item) {
      case 'su7':
        // 重置汽车位置和旋转
        if (carModel) {
          carModel.rotation.set(0, Math.PI, 0)
        }
        break
      case 'body':
        // 显示虚拟矩形盒的三条线
        setTimeout(() => {
          createCornerLines()
        }, 1000)
        break
      case 'radar':
        // 清除车身标签
        if (cornerLines) {
          if (cornerLines.labels) {
            cornerLines.labels.forEach(label => {
              if (label.parent) label.parent.remove(label)
            })
          }
          if (cornerLines.parent) cornerLines.parent.remove(cornerLines)
          cornerLines = null
        }
        // 车身顺时针旋转90度（车头朝上）
        if (carModel) {
          carModel.rotation.set(0, Math.PI / 2, 0)
        }
        break
      case 'wind':
        // 清除车身标签
        if (cornerLines) {
          if (cornerLines.labels) {
            cornerLines.labels.forEach(label => {
              if (label.parent) label.parent.remove(label)
            })
          }
          if (cornerLines.parent) cornerLines.parent.remove(cornerLines)
          cornerLines = null
        }
        // 风阻页面固定方向：车身朝向正面（车头朝向屏幕外）
        if (carModel) {
          carModel.rotation.set(0, 0, 0)
        }
        break
      case 'customization':
        // 应用默认定制设置，确保车身干净
        applyCustomization()
        break
    }
    
    const animateCamera = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // 使用缓动函数
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      
      // 插值相机位置
      camera.position.lerpVectors(startPos, targetPos, easeProgress)
      controls.target.lerpVectors(startTarget, targetLookAt, easeProgress)
      controls.update()
      
      if (progress < 1) {
        requestAnimationFrame(animateCamera)
      } else {
        // 雷达模式动画完成后创建雷达点位
        if (item === 'radar') {
          setTimeout(() => {
            createRadarPoints()
          }, 200)
        }
      }
    }
    
    animateCamera()
  }
}

// 处理汽车旋转事件
const handleRotateCar = (targetRotation) => {
  if (carModel) {
    const duration = 1000 // 动画持续时间
    const startTime = Date.now()
    const startRotation = carModel.rotation.y
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // 使用缓动函数
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      
      carModel.rotation.y = startRotation + (targetRotation - startRotation) * easeProgress
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    animate()
  }
}

// 创建虚拟矩形盒的三条线
let cornerLines = null
const createCornerLines = () => {
  if (!carModel) return
  
  if (!carModel) return
  
  // 先移除之前的线条和标签
  if (cornerLines) {
    if (cornerLines.labels) {
      cornerLines.labels.forEach(label => {
        if (label.parent) label.parent.remove(label)
      })
    }
    if (cornerLines.parent) cornerLines.parent.remove(cornerLines)
    cornerLines = null
  }
  
  cornerLines = new THREE.Group()
  
  // 直接使用默认尺寸
  const length = 4.997 // 转换为米
  const width = 1.963
  const height = 1.440
  
  // 获取汽车模型的世界位置和旋转
  const carPosition = carModel.position.clone()
  const carRotation = carModel.rotation.clone()
  
  // 创建虚线材质
  const dashedMaterial = new THREE.LineDashedMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    linewidth: 1,
    dashSize: 0.05,
    gapSize: 0.05
  })
  
  // 创建高度线（从地面到车顶）
  const heightLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-length/2, 0, width/2),
      new THREE.Vector3(-length/2, height, width/2)
    ]),
    dashedMaterial
  )
  heightLine.computeLineDistances()
  heightLine.position.copy(carPosition)
  heightLine.rotation.copy(carRotation)
  cornerLines.add(heightLine)
  
  // 创建长度线（从车尾到车头）- 沿车身侧面
  const lengthLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-length/2, 0, width/2),
      new THREE.Vector3(length/2, 0, width/2)
    ]),
    dashedMaterial
  )
  lengthLine.computeLineDistances()
  lengthLine.position.copy(carPosition)
  lengthLine.rotation.copy(carRotation)
  cornerLines.add(lengthLine)
  
  // 创建宽度线（从右侧到左侧）
  const widthLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-length/2, 0, width/2),
      new THREE.Vector3(-length/2, 0, -width/2)
    ]),
    dashedMaterial
  )
  widthLine.computeLineDistances()
  widthLine.position.copy(carPosition)
  widthLine.rotation.copy(carRotation)
  cornerLines.add(widthLine)
  
  // 添加到场景
  scene.add(cornerLines)
  
  // 为高度线添加1440mm标注
  const heightLabel = createLabel('1440mm', new THREE.Vector3(0, 0, 0))
  heightLabel.position.x = carPosition.x - length/2 - 0.3
  heightLabel.position.y = carPosition.y + height/2
  heightLabel.position.z = carPosition.z + width/2
  scene.add(heightLabel)
  
  // 为长度线添加4997mm标注
  const lengthLabel = createLabel('4997mm', new THREE.Vector3(0, 0, 0))
  lengthLabel.position.x = carPosition.x
  lengthLabel.position.y = carPosition.y - 0.2
  lengthLabel.position.z = carPosition.z + width/2
  scene.add(lengthLabel)
  
  // 为宽度线添加1963mm标注
  const widthLabel = createLabel('1963mm', new THREE.Vector3(0, 0, 0))
  widthLabel.position.x = carPosition.x - length/2 - 0.2
  widthLabel.position.y = carPosition.y
  widthLabel.position.z = carPosition.z
  scene.add(widthLabel)
  
  // 保存标签引用，以便后续移除
  cornerLines.labels = [heightLabel, lengthLabel, widthLabel]
}

// 创建雷达点位标记
const createRadarPoints = () => {
  if (!carModel || !scene) return
  
  // 先移除之前的雷达点位
  clearRadarPoints()
  
  radarPointsGroup = new THREE.Group()
  radarPointsGroup.name = 'radarPointsGroup'
  
  // 创建白色点位的材质
  const pointMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1
  })
  
  // 创建点位几何体（小圆球）
  const pointGeometry = new THREE.SphereGeometry(0.03, 16, 16)
  
  // 雷达点位对象名称列表（共27个）
  const radarObjectNames = [
    'Object_34025', 'Object_34027', 'Object_30020', 'Object_34030', 'Object_34031',
    'Object_30021', 'Object_30019', 'Object_30024', 'Object_82003', 'Object_30022',
    'Object_58003', 'Object_44007', 'Object_44008', 'Object_44009', 'Object_30028',
    'Object_30025', 'Object_32011', 'Object_34022', 'Object_34021',
    'Object_34023', 'Object_30026', 'Object_32010', 'Object_30027', 'Object_34024',
    'Object_34026', 'Object_34028', 'Object_32012', 'Object_32013'
  ]
  
  // 记录找到的对象名称
  const foundNames = []
  
  // 遍历汽车模型，查找雷达点位对象
  let foundCount = 0
  carModel.traverse((child) => {
    if (child.isMesh && radarObjectNames.includes(child.name)) {
      const point = new THREE.Mesh(pointGeometry, pointMaterial.clone())
      
      // 获取世界位置
      const worldPosition = new THREE.Vector3()
      child.getWorldPosition(worldPosition)
      
      // 转换为相对于carModel的局部坐标
      carModel.worldToLocal(worldPosition)
      point.position.copy(worldPosition)
      
      point.userData = { 
        type: 'radar', 
        name: child.name,
        originalObject: child.name 
      }
      
      radarPointsGroup.add(point)
      foundCount++
      foundNames.push(child.name)
    }
  })
  
  // 检查哪些点位没找到
  const notFoundNames = radarObjectNames.filter(name => !foundNames.includes(name))
  console.log('[Showroom] Total radar points found:', foundCount, 'out of', radarObjectNames.length)
  if (notFoundNames.length > 0) {
    console.warn('[Showroom] Not found radar points:', notFoundNames)
  }
  
  // 将雷达点位组添加到汽车模型
  carModel.add(radarPointsGroup)
  

}

// 清除雷达点位
const clearRadarPoints = () => {
  if (radarPointsGroup && carModel) {
    carModel.remove(radarPointsGroup)
    // 释放资源
    radarPointsGroup.traverse((child) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) child.material.dispose()
    })
    radarPointsGroup = null
  }
  
  // 清除雷达线条
  if (radarLinesGroup && carModel) {
    carModel.remove(radarLinesGroup)
    // 释放资源
    radarLinesGroup.traverse((child) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) child.material.dispose()
    })
    radarLinesGroup = null
  }
}



// 保存截图（供外部调用）
const saveScreenshot = () => {
  
  // 检查renderer
  if (!renderer) {
    return
  }
  
  try {
    // 渲染场景
    renderer.render(scene, camera)
    
    // 使用renderer.domElement.toDataURL方法生成截图
    const dataURL = renderer.domElement.toDataURL('image/png')
    
    // 直接创建下载链接并触发下载
    const link = document.createElement('a')
    link.download = `car-customization-${Date.now()}.png`
    link.href = dataURL
    link.click()
    
  } catch (error) {
    console.error('❌ Error in saveScreenshot:', error)
    console.error('Error stack:', error.stack)
  }
}

function getCarForwardLocalVector(model) {
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  // 选择“更长的那一维”作为车头-车尾主轴
  if (size.x >= size.z) return new THREE.Vector3(1, 0, 0)
  return new THREE.Vector3(0, 0, 1)
}

function createMotionLineMaterial({ colorA, colorB, speed }) {
  const uniforms = {
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color(colorA) },
    uColorB: { value: new THREE.Color(colorB) },
    uSpeed: { value: speed },
    uOpacity: { value: 0.9 },
    uAmbientLight: { value: new THREE.Color(0.7, 0.7, 0.7) },
    uLightPos: { value: new THREE.Vector3(5, 10, 7) },
    uLightColor: { value: new THREE.Color(1, 1, 1) }
  }

  const vertexShader = `
    attribute float aT;
    varying float vT;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    void main() {
      vT = aT;
      vNormal = normalize(normalMatrix * normal);
      vWorldPos = vec3(modelMatrix * vec4(position, 1.0));
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
    uniform vec3 uLightPos;
    uniform vec3 uLightColor;
    uniform float uLightIntensity;
    uniform vec3 cameraPosition;

    varying float vT;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    void main() {
      float t = clamp(vT, 0.0, 1.0);
      float phase = t - uTime * uSpeed;
      float m = fract(phase);

      float band = smoothstep(0.0, 0.12, m) * (1.0 - smoothstep(0.12, 0.25, m));
      float tailFade = pow(1.0 - t, 0.8);

      vec3 baseCol = mix(uColorA, uColorB, t);
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(uLightPos - vWorldPos);
      // 漫反射（车灯照在车上的明暗）
      float diff = max(dot(normal, lightDir), 0.0);
      // 高光（金属车漆的亮斑）
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
      // 最终颜色 = 自身颜色 + 漫反射 + 高光
      vec3 finalColor = 
        baseCol * (uAmbientLight
        + uLightColor * diff * uLightIntensity
        + uLightColor * spec * 0.5);
      
      // 应用发光效果
      vec3 glowCol = finalColor * (0.25 + 1.6 * band) * (0.45 + 0.55 * tailFade);
      float alpha = uOpacity * (0.08 + 0.9 * band) * (0.35 + 0.65 * tailFade);
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
    toneMapped: false
  })

  return { material, uniforms }
}

function enableMotionDragEffect() {
  if (!scene || !carModel || motionEnabled) return

  motionEnabled = true
  motionTime = 0
  motionSpeed = 0.15

  // 进入速度线模式时，关掉风阻（避免背景/线条冲突）
  windResistanceRef.value?.disableWindResistance()

  savedSceneBackgroundForMotion = scene.background
  scene.background = new THREE.Color(0x000000)
  if (renderer) renderer.setClearColor(0x000000, 1)

  motionGroup = new THREE.Group()
  motionGroup.name = 'motionDragGroup'
  carModel.add(motionGroup)

  const box = new THREE.Box3().setFromObject(carModel)
  const size = box.getSize(new THREE.Vector3())

  const forwardLocal = getCarForwardLocalVector(carModel).multiplyScalar(motionForwardSign)
  carForwardLocal = forwardLocal.clone()

  const forwardLen = Math.max(size.x, size.z) * 0.95
  const lateralSpan = Math.max(size.x, size.z) * 0.26
  const heightSpan = size.y * 0.38

  const lineCount = 44
  const lineSegLen = forwardLen * 1.35

  const colorA = 0xff4df0
  const colorB = 0x7df0ff

  motionLines = []
  motionLineUniforms = []

  const carCenterLocal = carModel.worldToLocal(box.getCenter(new THREE.Vector3()))

  for (let i = 0; i < lineCount; i++) {
    const lateral = (Math.random() - 0.5) * lateralSpan
    const height = (Math.random() - 0.5) * heightSpan
    const backOffset = -(0.2 + Math.random() * 0.6) * forwardLen

    const startLocal = carCenterLocal.clone()
    startLocal.x += lateral
    startLocal.y += height
    startLocal.add(forwardLocal.clone().multiplyScalar(backOffset / forwardLen))

    const endLocal = startLocal.clone().add(forwardLocal.clone().multiplyScalar(lineSegLen / forwardLen))

    const geom = new THREE.BufferGeometry()
    const positions = new Float32Array([
      startLocal.x, startLocal.y, startLocal.z,
      endLocal.x, endLocal.y, endLocal.z
    ])
    const aT = new Float32Array([0, 1])
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setAttribute('aT', new THREE.BufferAttribute(aT, 1))

    const { material, uniforms } = createMotionLineMaterial({
      colorA,
      colorB,
      speed: 1.2 + Math.random() * 0.9
    })

    const line = new THREE.Line(geom, material)
    line.frustumCulled = false
    line.renderOrder = 200
    motionGroup.add(line)

    motionLines.push(line)
    motionLineUniforms.push(uniforms)
  }
}

function disableMotionDragEffect() {
  if (!motionEnabled) return
  motionEnabled = false

  if (motionGroup) {
    carModel.remove(motionGroup)
    motionGroup.traverse((child) => {
      if (child.geometry) child.geometry.dispose?.()
      if (child.material) child.material.dispose?.()
    })
  }
  motionGroup = null
  motionLines = []
  motionLineUniforms = []
  motionSpeed = 0
  carForwardLocal = null

  if (scene) {
    scene.background = savedSceneBackgroundForMotion
    savedSceneBackgroundForMotion = null
  }

  if (renderer) renderer.setClearColor(0x1a1a1a, 1)
}

// 启用时空隧道效果 - “穿越隧道”速度线 + 车身霓虹映射
function enableTunnelEffect() {
  if (!scene || !camera) return
  tunnelEnabled = true

  // 保存当前背景
  if (!savedSceneBackgroundForTunnel) savedSceneBackgroundForTunnel = scene.background
  if (savedSceneEnvironmentForTunnel === null) savedSceneEnvironmentForTunnel = scene.environment

  // 设置黑色背景（更接近参考图）
  scene.background = new THREE.Color(0x000000)
  // 隐藏 HDR 环境反射，让隧道氛围更纯粹
  scene.environment = null

  // 隐藏地面
  if (ground) ground.visible = false

  // 车身霓虹映射
  enableTunnelBodyGlow()

  // 速度线（使用一个 LineSegments，一次 drawcall）
  if (!tunnelLineMesh) {
    const lineCount = 1200 // 再次增加线条数量
    const farZ = -300 // 增加深度
    const nearZ = -2.5
    const spreadX = 60 // 进一步增加扩散范围
    const spreadY = 45 // 进一步增加扩散范围

    tunnelLineGeometry = new THREE.BufferGeometry()
    tunnelLinePositions = new Float32Array(lineCount * 2 * 3)
    tunnelLineColors = new Float32Array(lineCount * 2 * 3)
    tunnelLineMeta = new Array(lineCount)

    const colorA = new THREE.Color(0xffffff) // 白色
    const colorB = new THREE.Color(0x00ffff) // 青色
    const colorC = new THREE.Color(0xff00ff) // 粉色
    const colorD = new THREE.Color(0xffff00) // 黄色
    const colorE = new THREE.Color(0xff0000) // 红色

    for (let i = 0; i < lineCount; i++) {
      const x = (Math.random() - 0.5) * spreadX
      const y = (Math.random() - 0.5) * spreadY
      const len = 30 + Math.random() * 70 // 进一步增加线条长度
      const speed = 100 + Math.random() * 150 // 进一步增加速度
      const hue = Math.random()

      // 在相机局部空间：线段沿 -Z 指向"屏幕里"
      const zHead = farZ - Math.random() * 200

      tunnelLineMeta[i] = { x, y, zHead, len, speed, hue }

      // 两个端点
      const a = i * 6
      tunnelLinePositions[a + 0] = x
      tunnelLinePositions[a + 1] = y
      tunnelLinePositions[a + 2] = zHead
      tunnelLinePositions[a + 3] = x
      tunnelLinePositions[a + 4] = y
      tunnelLinePositions[a + 5] = zHead + len

      let col
      if (hue < 0.2) col = colorA
      else if (hue < 0.4) col = colorB
      else if (hue < 0.6) col = colorC
      else if (hue < 0.8) col = colorD
      else col = colorE
      // 使用颜色的最大亮度值
      tunnelLineColors[a + 0] = col.r
      tunnelLineColors[a + 1] = col.g
      tunnelLineColors[a + 2] = col.b
      tunnelLineColors[a + 3] = col.r
      tunnelLineColors[a + 4] = col.g
      tunnelLineColors[a + 5] = col.b
    }

    tunnelLineGeometry.setAttribute('position', new THREE.BufferAttribute(tunnelLinePositions, 3))
    tunnelLineGeometry.setAttribute('color', new THREE.BufferAttribute(tunnelLineColors, 3))

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1.0, // 增加透明度到1.0，使线条更亮
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 4 // 增加线条宽度到4
    })

    tunnelLineMesh = new THREE.LineSegments(tunnelLineGeometry, mat)
    tunnelLineMesh.frustumCulled = false
    tunnelLineMesh.renderOrder = 999

    // 直接添加到场景中，而不是相机上
    scene.add(tunnelLineMesh)
    tunnelLineMesh.position.set(0, 0, 0)
    tunnelLineMesh.rotation.set(0, Math.PI / 2, 0) // 逆时针旋转90度
  }

  // 每次启用时把线重新散开，避免"接着上次的位置"
  if (tunnelLineMeta && tunnelLinePositions) {
    const farZ = -300
    for (let i = 0; i < tunnelLineMeta.length; i++) {
      tunnelLineMeta[i].zHead = farZ - Math.random() * 200
      const a = i * 6
      tunnelLinePositions[a + 2] = tunnelLineMeta[i].zHead
      tunnelLinePositions[a + 5] = tunnelLineMeta[i].zHead + tunnelLineMeta[i].len
    }
    tunnelLineGeometry.attributes.position.needsUpdate = true
  }
}

// 禁用时空隧道效果
function disableTunnelEffect() {
  if (!tunnelEnabled) return
  tunnelEnabled = false
  
  // 恢复背景
  if (scene && savedSceneBackgroundForTunnel) {
    scene.background = savedSceneBackgroundForTunnel
    savedSceneBackgroundForTunnel = null
  }
  if (scene) {
    scene.environment = savedSceneEnvironmentForTunnel
  }
  savedSceneEnvironmentForTunnel = null

  // 恢复地面
  if (ground) ground.visible = true

  // 关闭车身霓虹映射
  disableTunnelBodyGlow()

  // 移除速度线（从相机 detach，并释放资源）
  if (tunnelLineMesh) {
    tunnelLineMesh.parent?.remove(tunnelLineMesh)
    tunnelLineMesh.geometry?.dispose?.()
    tunnelLineMesh.material?.dispose?.()
    tunnelLineMesh = null
  }
  tunnelLineGeometry = null
  tunnelLinePositions = null
  tunnelLineColors = null
  tunnelLineMeta = null
  
}

function enableRadarScanEffect() {
  if (!scene || !carModel || radarScanEnabled) return
  radarScanEnabled = true
  radarScanTime = 0

  // 创建雷达波纹组
  radarScanGroup = new THREE.Group()
  radarScanGroup.name = 'radarScanGroup'
  scene.add(radarScanGroup)

  // 获取车身包围盒
  const box = new THREE.Box3().setFromObject(carModel)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())

  // 定义雷达发射点（围绕车身的几个关键点，贴近地面）
  const emitterPoints = [
    // 车头
    new THREE.Vector3(center.x, box.min.y + 0.02, center.z - size.z * 0.45),
    // 车尾
    new THREE.Vector3(center.x, box.min.y + 0.02, center.z + size.z * 0.45),
    // 左侧
    new THREE.Vector3(center.x - size.x * 0.45, box.min.y + 0.02, center.z),
    // 右侧
    new THREE.Vector3(center.x + size.x * 0.45, box.min.y + 0.02, center.z),
    // 前左角
    new THREE.Vector3(center.x - size.x * 0.35, box.min.y + 0.02, center.z - size.z * 0.35),
    // 前右角
    new THREE.Vector3(center.x + size.x * 0.35, box.min.y + 0.02, center.z - size.z * 0.35),
    // 后左角
    new THREE.Vector3(center.x - size.x * 0.35, box.min.y + 0.02, center.z + size.z * 0.35),
    // 后右角
    new THREE.Vector3(center.x + size.x * 0.35, box.min.y + 0.02, center.z + size.z * 0.35),
  ]

  // 创建从每个发射点发出的波纹
  radarRippleData = []
  const maxRipples = 8

  emitterPoints.forEach((emitterPos, emitterIndex) => {
    for (let i = 0; i < maxRipples; i++) {
      // 创建圆形线条波纹
      const rippleGeom = new THREE.BufferGeometry()
      const ripplePts = []
      const initialRadius = 0.05
      for (let s = 0; s <= 64; s++) {
        const a = (s / 64) * Math.PI * 2
        ripplePts.push(new THREE.Vector3(
          Math.cos(a) * initialRadius,
          0,
          Math.sin(a) * initialRadius
        ))
      }
      rippleGeom.setFromPoints(ripplePts)
      
      // 根据发射点位置偏移波纹
      const rippleLine = new THREE.Line(rippleGeom, new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }))
      
      rippleLine.position.copy(emitterPos)
      rippleLine.name = `ripple_${emitterIndex}_${i}`
      
      radarScanGroup.add(rippleLine)
      
      // 保存波纹数据用于动画更新
      radarRippleData.push({
        mesh: rippleLine,
        emitterPos: emitterPos.clone(),
        startTime: (i / maxRipples) * 2.0, // 错开时间开始
        duration: 2.5, // 波纹持续时间
        maxRadius: Math.max(size.x, size.z) * 1.8 // 最大扩散半径
      })
    }
  })

  // 添加一个围绕车身的旋转扫描线
  const scanLineGeom = new THREE.BufferGeometry()
  const scanLinePts = []
  const scanRadius = Math.max(size.x, size.z) * 1.2
  for (let s = 0; s <= 100; s++) {
    const a = (s / 100) * Math.PI * 2
    scanLinePts.push(new THREE.Vector3(
      center.x + Math.cos(a) * scanRadius,
      box.min.y + 0.05,
      center.z + Math.sin(a) * scanRadius
    ))
  }
  scanLineGeom.setFromPoints(scanLinePts)
  
  const scanLineMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    linewidth: 2,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  
  const scanLine = new THREE.Line(scanLineGeom, scanLineMat)
  scanLine.name = 'radarScanLine'
  scanLine.renderOrder = 50
  radarScanGroup.add(scanLine)
  
  // 创建扫描扇区
  const sectorGeom = new THREE.BufferGeometry()
  const sectorPts = []
  const sectorAngle = Math.PI * 0.4
  const sectorRadius = Math.max(size.x, size.z) * 1.5
  
  sectorPts.push(new THREE.Vector3(center.x, box.min.y + 0.02, center.z))
  for (let s = 0; s <= 30; s++) {
    const a = (s / 30) * sectorAngle
    sectorPts.push(new THREE.Vector3(
      center.x + Math.cos(a) * sectorRadius,
      box.min.y + 0.02,
      center.z + Math.sin(a) * sectorRadius
    ))
  }
  sectorGeom.setFromPoints(sectorPts)
  
  const sectorMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  
  const sector = new THREE.Mesh(sectorGeom, sectorMat)
  sector.name = 'radarSector'
  sector.renderOrder = 49
  radarScanGroup.add(sector)
}
function disableRadarScanEffect() {
  if (!radarScanEnabled) return
  radarScanEnabled = false
  radarScanTime = 0

  if (radarScanGroup) {
    radarScanGroup.traverse((child) => {
      child.geometry?.dispose?.()
      child.material?.dispose?.()
    })
    radarScanGroup.parent?.remove(radarScanGroup)
    radarScanGroup = null
  }
  radarRippleData = []
}

function handleMouseMoveForMotion(event) {
  if (!isDraggingCar || !carModel) return

  const dx = event.clientX - dragStartX
  const dy = event.clientY - dragStartY

  if (!motionEnabled) {
    const dist = Math.abs(dx) + Math.abs(dy)
    if (dist < 14) return
    enableMotionDragEffect()
  }

  // 水平拖拽映射到速度
  const sign = dx >= 0 ? 1 : -1
  const dragFactor = Math.min(Math.abs(dx) / 260, 1.3)
  motionSpeed = 0.15 + dragFactor * 1.25

  // 更新车的位置（沿 forward 轴的小段位移）
  if (carStartPos && carForwardLocal) {
    const move = motionForwardSign * sign * dragFactor * 0.7
    carModel.position.copy(carStartPos.clone().add(carForwardLocal.clone().multiplyScalar(move)))
    
    // 车轮跟随车身移动而转动
    if (wheels.length > 0) {
      // 计算车轮旋转角度（与移动距离成正比）
      const wheelRotation = sign * dragFactor * 0.5
      wheels.forEach(wheel => {
        // 只旋转前轮（假设Object_100001和Object_100002是前轮）
        if (wheel.name === 'Object_100001' || wheel.name === 'Object_100002') {
          // 限制旋转角度在左右30度范围内
          const maxRotation = Math.PI / 6 // 30度
          wheel.rotation.z = Math.max(-maxRotation, Math.min(maxRotation, wheel.rotation.z + wheelRotation))
        }
      })
    }
  }
}

// 长按相关变量（电脑端和平板端共享）
let mouseLongPressTimer = null
let touchMoveThreshold = 10 // 移动超过这个像素则取消长按
let isLongPressTriggered = false // 标记长按是否已触发

// 鼠标事件处理（电脑端长按，与平板触摸行为一致）

const handleMouseDown = (event) => {
  if (loading.value) return
  if (!carModel) return
  
  // 第一次用户交互时播放背景音乐
  playBackgroundMusic()
  
  // 重置长按标记
  isLongPressTriggered = false

  // 只有在车身按钮的页面下才启用长按效果
  if (activeSidebarItem.value === 'body') {
    // 调用BodyButton的长按处理方法
    if (sidebarRef.value?.bodyButtonRef?.handleMouseDown) {
      sidebarRef.value.bodyButtonRef.handleMouseDown()
    }

    // 设置全局mouseup处理器
    mouseUpHandler = () => {
      // 调用BodyButton的鼠标松开处理方法
      if (sidebarRef.value?.bodyButtonRef?.handleMouseUp) {
        sidebarRef.value.bodyButtonRef.handleMouseUp()
      }

      // 移除事件监听器
      window.removeEventListener('mouseup', mouseUpHandler)
    }

    window.addEventListener('mouseup', mouseUpHandler)
  }

  // SU7和SU7MAX模式下拖动启用车轮旋转和时空隧道效果
  if (activeSidebarItem.value === 'su7' || activeSidebarItem.value === 'su7max') {
    isLongPressTriggered = true
    wheelRotationEnabled = true
    enableTunnelEffect()
    if (__DEV__) console.log('[Showroom] SU7/SU7MAX mouse down triggered animation')

    const su7MouseUpHandler = () => {
      wheelRotationEnabled = false
      disableTunnelEffect()
      window.removeEventListener('mouseup', su7MouseUpHandler)
    }

    window.addEventListener('mouseup', su7MouseUpHandler)
  }

  // 雷达模式下拖动显示雷达扫描效果并隐藏地面
  if (activeSidebarItem.value === 'radar') {
    isLongPressTriggered = true
    enableRadarScanEffect()
    if (ground) ground.visible = false
    if (__DEV__) console.log('[Showroom] Radar mouse down triggered animation')

    const radarMouseUpHandler = () => {
      disableRadarScanEffect()
      if (ground) ground.visible = true
      window.removeEventListener('mouseup', radarMouseUpHandler)
    }

    window.addEventListener('mouseup', radarMouseUpHandler)
  }
}

// 触摸事件处理 - 支持平板等触摸设备
let touchStartPos = null
let touchStartTime = null
let touchLongPressTimer = null
let lastTouchPos = null // 上一帧触摸位置，用于计算速度
let touchVelocity = 0 // 触摸拖动速度
let inertiaAnimationId = null // 惯性动画ID

const handleTouchStart = (event) => {
  if (loading.value) return
  if (!carModel) return
  
  // 第一次用户交互时播放背景音乐
  playBackgroundMusic()
  
  // 记录触摸起始位置
  const touch = event.touches[0]
  touchStartPos = { x: touch.clientX, y: touch.clientY }
  lastTouchPos = { x: touch.clientX, y: touch.clientY }
  isLongPressTriggered = false
  
  // SU7和SU7MAX模式下拖动启用车轮旋转和时空隧道效果
  if (activeSidebarItem.value === 'su7' || activeSidebarItem.value === 'su7max') {
    isLongPressTriggered = true
    wheelRotationEnabled = true
    enableTunnelEffect()
    if (__DEV__) console.log('[Showroom] SU7/SU7MAX touch triggered animation')
  }
  
  // 雷达模式下拖动显示雷达扫描效果并隐藏地面
  if (activeSidebarItem.value === 'radar') {
    isLongPressTriggered = true
    enableRadarScanEffect()
    if (ground) ground.visible = false
    if (__DEV__) console.log('[Showroom] Radar touch triggered animation')
  }
}

const handleTouchMove = (event) => {
  // 更新位置记录
  if (!touchStartPos || !lastTouchPos) return
  const touch = event.touches[0]
  touchStartPos = { x: touch.clientX, y: touch.clientY }
  lastTouchPos = { x: touch.clientX, y: touch.clientY }
}

const handleTouchEnd = (event) => {
  // 停止特效
  if (isLongPressTriggered) {
    wheelRotationEnabled = false
    disableTunnelEffect()
    disableRadarScanEffect()
    if (ground) ground.visible = true
  }
  
  // 重置触摸状态
  touchStartPos = null
  touchStartTime = null
  lastTouchPos = null
}

// 处理鼠标松开事件
const handleMouseUp = (event) => {
  // 由 window 的 mouseup handler 统一处理
}

// 处理长按开始事件
const handleLongPressStart = () => {
  // 隐藏辅助线和标签
  if (cornerLines) {
    if (cornerLines.labels) {
      cornerLines.labels.forEach(label => {
        if (label.parent) label.parent.remove(label)
      })
    }
    if (cornerLines.parent) cornerLines.parent.remove(cornerLines)
    cornerLines = null
  }

  // 雷达页面长按车身时显示雷达扫描效果（根据车身轮廓动态扩散的雷达波）
  if (activeSidebarItem.value === 'radar' && carModel && scene) {
    enableRadarScanEffect()
    // 隐藏地面
    if (ground) ground.visible = false
  }
}

// 处理长按结束事件
const handleLongPressEnd = () => {
  // 显示辅助线和标签
  if (activeSidebarItem.value === 'body' && carModel) {
    createCornerLines()
  }

  // 雷达页面恢复地面
  if (activeSidebarItem.value === 'radar') {
    if (ground) ground.visible = true
    disableRadarScanEffect()
  }
}

// 创建雷达侧边线条
const createRadarSideLines = () => {
  console.log('[Showroom] createRadarSideLines called')
  if (!carModel) {
    console.log('[Showroom] carModel is null')
    return
  }
  
  if (!radarPointsGroup) {
    console.log('[Showroom] radarPointsGroup is null, trying to create it')
    createRadarPoints()
    if (!radarPointsGroup) {
      console.log('[Showroom] still no radarPointsGroup')
      return
    }
  }
  
  // 清除之前的线条
  if (radarLinesGroup) {
    carModel.remove(radarLinesGroup)
    radarLinesGroup = null
  }
  
  radarLinesGroup = new THREE.Group()
  radarLinesGroup.name = 'radarLinesGroup'
  
  // 收集雷达点位的位置
  const radarPositions = []
  radarPointsGroup.traverse((child) => {
    if (child.userData.type === 'radar') {
      radarPositions.push(child.position.clone())
    }
  })
  
  console.log('[Showroom] Radar positions collected:', radarPositions.length)
  if (radarPositions.length < 2) {
    console.log('[Showroom] Not enough radar positions:', radarPositions.length)
    return
  }
  
  // 按x坐标排序，找到车身两侧的点位
  radarPositions.sort((a, b) => a.x - b.x)
  
  // 左侧点位（x值较小）
  const leftPoints = radarPositions.filter(p => p.x < 0)
  // 右侧点位（x值较大）
  const rightPoints = radarPositions.filter(p => p.x > 0)
  
  console.log('[Showroom] Left points:', leftPoints.length)
  console.log('[Showroom] Right points:', rightPoints.length)
  
  // 按z坐标排序，确保线条从前往后连接
  leftPoints.sort((a, b) => b.z - a.z) // 左侧从前往后
  rightPoints.sort((a, b) => b.z - a.z) // 右侧从前往后
  
  // 创建线条材质
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    transparent: false,
    opacity: 1.0
  })
  
  // 创建左侧线条
  if (leftPoints.length > 1) {
    console.log('[Showroom] Creating left line with', leftPoints.length, 'points')
    const leftGeometry = new THREE.BufferGeometry().setFromPoints(leftPoints)
    const leftLine = new THREE.Line(leftGeometry, lineMaterial.clone())
    radarLinesGroup.add(leftLine)
  }
  
  // 创建右侧线条
  if (rightPoints.length > 1) {
    console.log('[Showroom] Creating right line with', rightPoints.length, 'points')
    const rightGeometry = new THREE.BufferGeometry().setFromPoints(rightPoints)
    const rightLine = new THREE.Line(rightGeometry, lineMaterial.clone())
    radarLinesGroup.add(rightLine)
  }
  
  // 将线条组添加到汽车模型
  console.log('[Showroom] Adding radarLinesGroup to carModel')
  carModel.add(radarLinesGroup)
  console.log('[Showroom] Radar lines created successfully')
}

// 处理SU7长按开始事件
const handleSU7LongPressStart = () => {
  // 熄灭所有灯光
  if (scene) {
    scene.traverse((child) => {
      if (child.isLight) {
        // 保存所有灯光的原始强度
        child.userData.originalIntensity = child.intensity
        child.intensity = 0
      }
    })
  }
}

// 处理SU7长按结束事件
const handleSU7LongPressEnd = () => {
  // 点亮所有灯光
  if (scene) {
    scene.traverse((child) => {
      if (child.isLight && child.userData.originalIntensity !== undefined) {
        // 恢复所有灯光的原始强度
        child.intensity = child.userData.originalIntensity
        delete child.userData.originalIntensity
      }
    })
  }
}

// 旋转汽车动画
const rotateCar = (targetRotation) => {
  if (!carModel) return
  
  const duration = 1000 // 动画持续时间
  const startTime = Date.now()
  const startRotation = carModel.rotation.y
  
  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // 使用缓动函数
    const easeProgress = 1 - Math.pow(1 - progress, 3)
    
    carModel.rotation.y = startRotation + (targetRotation - startRotation) * easeProgress
    
    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }
  
  animate()
}

// 创建文本标签
const createLabel = (text, position) => {
  const div = document.createElement('div')
  div.className = 'dimension-label'
  div.textContent = text
  div.style.color = '#ffffff'
  div.style.fontSize = '12px'
  div.style.fontFamily = 'Arial'
  div.style.padding = '2px 6px'
  div.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
  div.style.borderRadius = '4px'
  div.style.textAlign = 'center'
  
  const label = new CSS2DObject(div)
  label.position.copy(position)
  return label
}



// 调试函数
const logError = (message, error) => {
  console.error(`[Showroom] ${message}:`, error)
}

// 检查文件是否存在
const checkFileExists = (url) => {
  fetch(url, { method: 'HEAD' })
    .then(response => {
      console.log(`[Showroom] File ${url} exists: ${response.ok}`)
    })
    .catch(error => {
      logError(`Failed to check file ${url}`, error)
    })
}

onMounted(() => {
  if (__DEV__) console.log('[Showroom] onMounted called')

  if (__DEV__) console.log('[Showroom] Calling initThree')
  initThree()
  if (__DEV__) console.log('[Showroom] Calling animate')
  animate()
  if (__DEV__) console.log('[Showroom] onMounted completed')
})

onUnmounted(() => {
  animationStopped = true
  if (rafId != null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  // 确保隧道相关的材质注入/几何体都被恢复与释放
  disableTunnelEffect()
  if (renderer) {
    renderer.dispose()
  }
  if (controls) {
    controls.dispose()
  }
  window.removeEventListener('resize', handleResize)
})

// 性能测试相关变量
let performanceFrameCount = 0
let performanceLastTime = 0
let performanceFpsHistory = []
let currentFps = 0
let averageFps = 0
let memoryUsage = 0
let modelLoadStartTime = 0
let modelLoadTime = 0

function initThree() {
  if (__DEV__) console.log('[Showroom] Initializing Three.js scene')
  
  // 检测设备性能，根据性能调整反射质量
  const isHighPerformance = () => {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return false
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (!debugInfo) return true
    
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    const isMobile = /Mobile|Android|iOS|iPhone|iPad/.test(navigator.userAgent)
    
    // 简单的性能检测逻辑
    return !isMobile && renderer && (
      renderer.includes('NVIDIA') || 
      renderer.includes('AMD') || 
      renderer.includes('Intel(R) Iris') ||
      renderer.includes('Intel(R) UHD Graphics 630')
    )
  }
  
  const performanceLevel = isHighPerformance() ? 'high' : 'low'
  if (__DEV__) console.log('[Showroom] Performance level:', performanceLevel)
  
  // 创建场景
  scene = new THREE.Scene()
  if (__DEV__) console.log('[Showroom] Scene created')

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.set(0, 0.2, 4) // 调整镜头位置，使汽车完整显示在画面中，拉近镜头
  if (__DEV__) console.log('[Showroom] Camera created at position:', camera.position)

  // 用于驱动粒子/流光动画的 delta
  clock = new THREE.Clock()

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: performanceLevel === 'high', alpha: true })
  // 抗锯齿优化：根据设备性能设置合理的像素比
  const pixelRatio = Math.min(window.devicePixelRatio, performanceLevel === 'high' ? 1.5 : 1.0)
  renderer.setPixelRatio(pixelRatio)
  // 保持抗锯齿启用，提供更好的视觉效果
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setClearColor(0x1a1a1a, 1) // 设置背景颜色为深灰色，而不是黑色
  // 禁用阴影以提高性能
  renderer.shadowMap.enabled = false // 禁用阴影映射
  if (__DEV__) {
    console.log('[Showroom] Renderer created with pixel ratio:', pixelRatio, 'antialias:', performanceLevel === 'high')
    console.log('[Showroom] Renderer size:', window.innerWidth, 'x', window.innerHeight)
  }
  
  if (containerRef.value) {
    containerRef.value.appendChild(renderer.domElement)
    if (__DEV__) {
      console.log('[Showroom] Renderer DOM element added to container')
      console.log('[Showroom] Container size:', containerRef.value.offsetWidth, 'x', containerRef.value.offsetHeight)
    }
  } else {
    console.error('[Showroom] containerRef is null')
  }
  
  // 创建CSS2DRenderer用于显示标签
  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(window.innerWidth, window.innerHeight)
  labelRenderer.domElement.style.position = 'absolute'
  labelRenderer.domElement.style.top = '0'
  labelRenderer.domElement.style.pointerEvents = 'none'
  if (containerRef.value) {
    containerRef.value.appendChild(labelRenderer.domElement)
  }

  // 添加轨道控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.maxPolarAngle = Math.PI * 0.55 // 限制最大极角，防止视角过低看到车底盘
  
  // 限制相机位置，确保不能低于地面平面
  controls.minPolarAngle = Math.PI * 0.3 // 限制最小极角
  controls.minDistance = 2 // 限制最小距离
  controls.maxDistance = 10 // 限制最大距离
  
  // 监听相机变化
  controls.addEventListener('change', () => {
    debouncedSaveViewState()
  })

  // 加载HDR背景
  if (__DEV__) console.log('[Showroom] Starting to load HDR background')
  
  // 加载HDR
  const loader = new HDRLoader()
  
  loader.load(
    '/scene/su7.hdr',
    function (texture) {
      if (__DEV__) console.log('[Showroom] HDR loaded successfully')
      
      // 设置纹理映射
      texture.mapping = THREE.EquirectangularReflectionMapping
      
      // 设置环境贴图
      scene.background = texture
      scene.environment = texture
      if (__DEV__) console.log('[Showroom] HDR set as background and environment')
      
      // HDR加载完成，更新进度到50%
      loadingProgress.value = 50
      updateVideoPlaybackRate()
      
      // 直接加载汽车模型
      if (__DEV__) console.log('[Showroom] Starting to load car model directly')
      modelLoadStartTime = performance.now()
      const loader = new GLTFLoader()
      
      try {
        // 设置超时时间为30秒
        const timeout = setTimeout(() => {
          console.error('[Showroom] Car model loading timed out after 30 seconds')
          loading.value = false
        }, 60000)
        
        loader.load(
          getCarModelUrl(),
          function (gltf) {
            clearTimeout(timeout)
            modelLoadTime = performance.now() - modelLoadStartTime
            if (__DEV__) {
              console.log('[Showroom] Car model loaded successfully in', modelLoadTime.toFixed(2), 'ms')
              console.log('[性能测试] 模型加载耗时:', modelLoadTime.toFixed(2), 'ms')
              console.log('[Showroom] GLTF scene:', gltf.scene)
              console.log('[Showroom] GLTF children count:', gltf.scene.children.length)
            }
            
            const car = gltf.scene
            // 保存汽车模型引用
            carModel = car
            // 调整汽车模型的位置和缩放
            car.position.set(0, -0.5, 0) // 继续向下移动汽车，使车轮与镜面轮胎刚好贴着
            car.rotation.set(0, Math.PI, 0) // 旋转180度
            car.scale.set(1, 1, 1)
            
            if (__DEV__) {
              console.log('[Showroom] Car position:', car.position)
              console.log('[Showroom] Car rotation:', car.rotation)
              console.log('[Showroom] Car scale:', car.scale)
            }
            
            scene.add(car)
            if (__DEV__) {
              console.log('[Showroom] Car added to scene')
              console.log('[Showroom] Scene children count after adding car:', scene.children.length)
            }

            // 启用汽车的阴影投射，并设置车窗颜色
            let meshCount = 0
            car.traverse(function (child) {
              if (child.isMesh) {
                meshCount++
                child.castShadow = true
                // 设置车窗颜色
                const windowObjects = ["Object_36", "Object_64", "Object_71", "Object_95", "Object_88"]
                if (windowObjects.includes(child.name)) {
                  if (__DEV__) console.log('Setting color for window object:', child.name)
                  // 设置为相对黑一点的颜色
                  child.material.color.setRGB(20/255, 23/255, 24/255)
                  // 确保材质不透明，以便颜色显示正确
                  if (child.material.transparent) {
                    child.material.transparent = false
                    child.material.opacity = 1
                  }
                }
              }
            })
            
            if (__DEV__) console.log('[Showroom] Total meshes in car model:', meshCount)
            
            // 获取车轮组
            const wheelNames = ['Object_100001', 'Object_100002', 'Object_100003', 'Object_100004']
            wheels = wheelNames.map(name => car.getObjectByName(name)).filter(w => w)
            if (__DEV__) console.log('[Showroom] 找到的车轮组:', wheels.length)
            

            
            // 模型加载完成，更新进度到100%
            loadingProgress.value = 100
            updateVideoPlaybackRate()
            if (__DEV__) console.log('[Showroom] Load progress updated: 100%')
            
            // 模型加载完成，设置loading为false
            loading.value = false
            if (__DEV__) console.log('[Showroom] Car model loaded, setting loading to false')
          }, 
          function (xhr) {
            // 汽车模型加载进度
            const progress = 50 + (xhr.loaded / xhr.total) * 50
            const roundedProgress = Math.min(Math.round(progress), 100)
            loadingProgress.value = roundedProgress
            updateVideoPlaybackRate()
            if (__DEV__) console.log(`[Showroom] Car model loading progress: ${roundedProgress}%`)
          },
          function (error) {
            clearTimeout(timeout)
            console.error('[Showroom] Error loading car model:', error)
            console.error('[Showroom] Error details:', error.message)
            console.error('[Showroom] Error stack:', error.stack)
            // 即使加载失败，也设置loading为false，避免一直显示加载界面
            loading.value = false
            if (__DEV__) console.log('[Showroom] Car model loading failed, setting loading to false')
          }
        )
      } catch (error) {
        console.error('[Showroom] Exception during model loading:', error)
        loading.value = false
      }
    },
    function (xhr) {
      const progress = (xhr.loaded / xhr.total) * 50
      loadingProgress.value = Math.min(Math.round(progress), 50)
      updateVideoPlaybackRate()
    },
    function (error) {
      console.error('[Showroom] Error loading HDR:', error)
      // 即使HDR加载失败，也继续加载汽车模型
      loadingProgress.value = 50
      updateVideoPlaybackRate()
      
      // 直接加载汽车模型
      if (__DEV__) console.log('[Showroom] Starting to load car model directly after HDR error')
      modelLoadStartTime = performance.now()
      const loader = new GLTFLoader()
      
      try {
        // 设置超时时间为30秒
        const timeout = setTimeout(() => {
          console.error('[Showroom] Car model loading timed out after 30 seconds')
          loading.value = false
        }, 30000)
        
        loader.load(
          getCarModelUrl(),
          function (gltf) {
            clearTimeout(timeout)
            modelLoadTime = performance.now() - modelLoadStartTime
            if (__DEV__) {
              console.log('[Showroom] Car model loaded successfully in', modelLoadTime.toFixed(2), 'ms')
              console.log('[性能测试] 模型加载耗时:', modelLoadTime.toFixed(2), 'ms')
              console.log('[Showroom] GLTF scene:', gltf.scene)
              console.log('[Showroom] GLTF children count:', gltf.scene.children.length)
            }
            
            const car = gltf.scene
            // 保存汽车模型引用
            carModel = car
            // 调整汽车模型的位置和缩放
            car.position.set(0, -0.5, 0) // 继续向下移动汽车，使车轮与镜面轮胎刚好贴着
            car.rotation.set(0, Math.PI, 0) // 旋转180度
            car.scale.set(1, 1, 1)
            
            if (__DEV__) {
              console.log('[Showroom] Car position:', car.position)
              console.log('[Showroom] Car rotation:', car.rotation)
              console.log('[Showroom] Car scale:', car.scale)
            }
            
            scene.add(car)
            if (__DEV__) {
              console.log('[Showroom] Car added to scene')
              console.log('[Showroom] Scene children count after adding car:', scene.children.length)
            }

            // 启用汽车的阴影投射，并设置车窗颜色
            let meshCount = 0
            car.traverse(function (child) {
              if (child.isMesh) {
                meshCount++
                child.castShadow = true
                // 设置车窗颜色
                const windowObjects = ["Object_36", "Object_64", "Object_71", "Object_95", "Object_88"]
                if (windowObjects.includes(child.name)) {
                  if (__DEV__) console.log('Setting color for window object:', child.name)
                  // 设置为相对黑一点的颜色
                  child.material.color.setRGB(20/255, 23/255, 24/255)
                  // 确保材质不透明，以便颜色显示正确
                  if (child.material.transparent) {
                    child.material.transparent = false
                    child.material.opacity = 1
                  }
                }
              }
            })
            
            if (__DEV__) console.log('[Showroom] Total meshes in car model:', meshCount)
            
            // 模型加载完成，更新进度到100%
            loadingProgress.value = 100
            updateVideoPlaybackRate()
            if (__DEV__) console.log('[Showroom] Load progress updated: 100%')
            
            // 模型加载完成，设置loading为false
            loading.value = false
            if (__DEV__) console.log('[Showroom] Car model loaded, setting loading to false')
          }, 
          function (xhr) {
            // 汽车模型加载进度
            const progress = 50 + (xhr.loaded / xhr.total) * 50
            const roundedProgress = Math.min(Math.round(progress), 100)
            loadingProgress.value = roundedProgress
            updateVideoPlaybackRate()
            if (__DEV__) console.log(`[Showroom] Car model loading progress: ${roundedProgress}%`)
          },
          function (error) {
            clearTimeout(timeout)
            console.error('[Showroom] Error loading car model:', error)
            console.error('[Showroom] Error details:', error.message)
            console.error('[Showroom] Error stack:', error.stack)
            // 即使加载失败，也设置loading为false，避免一直显示加载界面
            loading.value = false
            if (__DEV__) console.log('[Showroom] Car model loading failed, setting loading to false')
          }
        )
      } catch (error) {
        console.error('[Showroom] Exception during model loading:', error)
        loading.value = false
      }
    }
  )

  // 添加环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)
  if (__DEV__) console.log('[Showroom] Ambient light added')



  // 添加平行光
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
  directionalLight.position.set(1, 5, 3)
  directionalLight.castShadow = true // 启用平行光的阴影投射
  directionalLight.shadow.mapSize.width = 2048 // 增加阴影贴图分辨率
  directionalLight.shadow.mapSize.height = 2048
  scene.add(directionalLight)
  if (__DEV__) console.log('[Showroom] Directional light added')

  // 创建地面（使用Reflector实现倒影效果）
  const groundSize = 20
  const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize)
  
  // 根据性能级别设置反射纹理分辨率
  const getReflectionResolution = () => {
    const baseWidth = window.innerWidth
    const baseHeight = window.innerHeight
    
    switch (performanceLevel) {
      case 'high':
        return { width: baseWidth * 0.75, height: baseHeight * 0.75 }
      case 'low':
      default:
        return { width: baseWidth * 0.5, height: baseHeight * 0.5 }
    }
  }
  
  const reflectionResolution = getReflectionResolution()

  ground = new Reflector(groundGeometry, {
    color: new THREE.Color(20/255, 20/255, 20/255), // 深灰色，接近参考图片中的地面颜色
    textureWidth: reflectionResolution.width,
    textureHeight: reflectionResolution.height,
    clipBias: 0.003, // 减少反射裁剪问题
    recursion: 1 // 减少反射递归次数
  })
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.5
  ground.receiveShadow = false // 禁用地面接收阴影以提高性能
  scene.add(ground)
  if (__DEV__) console.log('[Showroom] Ground reflector created with resolution:', reflectionResolution)

  // 响应窗口大小变化
  window.addEventListener('resize', handleResize)
  
  // 加载上次的视角
  // 暂时注释掉本地存储视角的加载，确保每次都使用默认视角
  // const lastView = localStorage.getItem('lastView')
  // if (lastView && camera && controls) {
  //   const viewState = JSON.parse(lastView)
  //   camera.position.fromArray(viewState.position)
  //   camera.rotation.fromArray(viewState.rotation)
  //   if (controls.setZoom) {
  //     controls.setZoom(viewState.zoom)
  //   }
  //   controls.update()
  // }
}

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  // 更新labelRenderer大小
  if (labelRenderer) {
    labelRenderer.setSize(window.innerWidth, window.innerHeight)
  }
}

function animate() {
  if (animationStopped) return
  rafId = requestAnimationFrame(animate)
  
  // 性能测试：计算帧率和内存使用
  const currentTime = performance.now()
  performanceFrameCount++
  
  if (currentTime - performanceLastTime >= 1000) {
    currentFps = performanceFrameCount
    performanceFpsHistory.push(currentFps)
    if (performanceFpsHistory.length > 10) {
      performanceFpsHistory.shift()
    }
    averageFps = performanceFpsHistory.reduce((sum, fps) => sum + fps, 0) / performanceFpsHistory.length
    performanceFrameCount = 0
    performanceLastTime = currentTime
    
    // 记录内存使用
    if (performance.memory) {
      memoryUsage = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)
    }
    
    // 输出性能数据
    const currentMode = activeSidebarItem.value
    if (__DEV__) {
      console.log(`[性能测试] FPS: ${currentFps}, Avg FPS: ${averageFps.toFixed(1)}, Memory: ${memoryUsage} MB, Mode: ${currentMode}, LoadTime: ${modelLoadTime.toFixed(2)}ms`)
    }
  }
  
  controls.update()

  const delta = clock ? clock.getDelta() : 0
  const deltaSeconds = delta // 已经是秒为单位
  
  if (windResistanceRef.value?.tick) {
    windResistanceRef.value.tick(deltaSeconds)
  }
  
  if (motionEnabled && motionLineUniforms.length > 0) {
    motionTime += deltaSeconds * (0.5 + motionSpeed * 1.6)
    for (let i = 0; i < motionLineUniforms.length; i++) {
      motionLineUniforms[i].uTime.value = motionTime
    }
    motionSpeed *= 0.96
  }

  // 更新BodyButton的粒子效果
  if (sidebarRef.value?.bodyButtonRef?.tick) {
    sidebarRef.value.bodyButtonRef.tick(deltaSeconds)
  }

  // 更新 Tween.js
  TWEEN.update()
  
  // 车轮旋转 - 长按时启用
  if (wheelRotationEnabled && wheels.length > 0) {
    const rotationSpeed = deltaSeconds * 60 // 每秒旋转2圈
    wheels.forEach(wheel => {
      wheel.rotation.x += rotationSpeed
    })
  }
  
  // 更新"穿越隧道"速度线（相机空间）
  if (tunnelEnabled && tunnelLineMesh && tunnelLineGeometry && tunnelLineMeta && tunnelLinePositions) {
    const farZ = -300
    const nearZ = -2.5
    const dt = deltaSeconds
    for (let i = 0; i < tunnelLineMeta.length; i++) {
      const d = tunnelLineMeta[i]
      d.zHead += d.speed * dt
      if (d.zHead > nearZ) {
        d.zHead = farZ - Math.random() * 200
      }
      const a = i * 6
      tunnelLinePositions[a + 2] = d.zHead
      tunnelLinePositions[a + 5] = d.zHead + d.len
    }
    tunnelLineGeometry.attributes.position.needsUpdate = true
  }

  // 更新车身霓虹映射时间
  if (tunnelEnabled && tunnelBodyGlowUniforms.length > 0) {
    for (let i = 0; i < tunnelBodyGlowUniforms.length; i++) {
      tunnelBodyGlowUniforms[i].uTunnelTime.value += deltaSeconds
    }
  }

  // 雷达扫描动画：波纹扩散 + 扫描线旋转
  if (radarScanEnabled && radarScanGroup && radarRippleData) {
    radarScanTime += deltaSeconds

    // 更新每个波纹的状态
    radarRippleData.forEach(data => {
      const elapsed = radarScanTime - data.startTime
      
      if (elapsed > 0 && elapsed < data.duration) {
        const progress = elapsed / data.duration
        
        // 波纹从内向外扩散
        const currentRadius = progress * data.maxRadius
        
        // 更新波纹大小（仅在X-Z平面缩放，平行于地面）
        data.mesh.scale.set(currentRadius * 2, 1, currentRadius * 2)
        
        // 波纹透明度随距离衰减（更亮更明显）
        data.mesh.material.opacity = Math.max(0, 1 - progress * 0.8) * 1.2
      } else if (elapsed >= data.duration) {
        // 重置波纹（圆形，保持Y轴为1）
        data.mesh.scale.set(0.2, 1, 0.2)
        data.mesh.material.opacity = 0
        // 重新开始计时
        data.startTime = radarScanTime + Math.random() * 0.5
      }
    })

    // 旋转扫描线
    const scanLine = radarScanGroup.getObjectByName('radarScanLine')
    if (scanLine) {
      scanLine.rotation.y += deltaSeconds * 1.5
    }

    // 旋转扫描扇区
    const sector = radarScanGroup.getObjectByName('radarSector')
    if (sector) {
      sector.rotation.y += deltaSeconds * 1.5
      // 轻微呼吸效果
      sector.material.opacity = 0.1 + 0.05 * Math.sin(radarScanTime * 3)
    }
  }
  

  
  renderer.render(scene, camera)
  
  // 渲染标签
  if (labelRenderer) {
    labelRenderer.render(scene, camera)
  }
}
</script>

<style scoped>
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}

.showroom {
  width: 100%;
  height: 100vh;
  position: relative;
  background-color: #1a1a1a;
  overflow: hidden;
  display: block;
}

.loading-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #000;
  z-index: 100;
  transition: opacity 0.5s ease;
  opacity: 1;
}

.loading-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scene-container {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
  display: block;
}

/* 截图弹窗样式 */
.screenshot-popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(5px);
  pointer-events: auto;
}

.popup-content {
  background: rgba(0, 0, 0, 0.9);
  border-radius: 15px;
  max-width: 80%;
  max-height: 80%;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.popup-header h3 {
  color: white;
  margin: 0;
  font-size: 18px;
}

.close-button {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.3s ease;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.popup-body {
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 60vh;
  overflow: auto;
}

.screenshot-image {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.popup-footer {
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: center;
}

.save-button {
  background: #ff6600;
  color: white;
  border: none;
  padding: 10px 30px;
  border-radius: 25px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 10px rgba(255, 102, 0, 0.3);
}

.save-button:hover {
  background: #ff8533;
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(255, 102, 0, 0.4);
}

/* 定制控制面板样式 */
.customization-controls {
  position: absolute;
  left: 50px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 25px;
  padding: 20px;
  background: transparent;
  z-index: 10;
  min-width: 250px;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
  position: relative;
}

.control-item:hover,
.control-item:active {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 10px rgba(255, 102, 0, 0.3);
}

.control-item label {
  color: white;
  font-size: 16px;
  width: 80px;
  text-align: left;
  transition: color 0.3s ease;
}

.control-item:hover label {
  color: #ff6600;
}

.control-item input[type="range"] {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  position: relative;
  transition: all 0.3s ease;
}

/* 色相滑块特殊样式 */
.control-item:nth-child(1) input[type="range"] {
  background: linear-gradient(to right, red, yellow, green, cyan, blue, magenta, red);
  height: 6px;
}

/* 饱和度滑块特殊样式 */
.control-item:nth-child(2) input[type="range"] {
  background: linear-gradient(to right, #ccc, #ff6600);
  height: 6px;
}

/* 明度滑块特殊样式 */
.control-item:nth-child(3) input[type="range"] {
  background: linear-gradient(to right, #000, #fff);
  height: 6px;
}

/* 金属度滑块特殊样式 */
.control-item:nth-child(4) input[type="range"] {
  background: linear-gradient(to right, #ccc, #f0f0f0);
  height: 6px;
}

/* 粗糙度滑块特殊样式 */
.control-item:nth-child(5) input[type="range"] {
  background: linear-gradient(to right, #f0f0f0, #ccc);
  height: 6px;
}

.control-item input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(255, 255, 255, 0.5);
  transition: all 0.2s ease;
}

.control-item input[type="range"]::-webkit-slider-thumb:hover,
.control-item input[type="range"]::-webkit-slider-thumb:active {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(255, 102, 0, 0.5), 0 0 0 3px rgba(255, 255, 255, 0.8);
}

.control-item input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(255, 255, 255, 0.5);
  transition: all 0.2s ease;
}

.control-item input[type="range"]::-moz-range-thumb:hover,
.control-item input[type="range"]::-moz-range-thumb:active {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(255, 102, 0, 0.5), 0 0 0 3px rgba(255, 255, 255, 0.8);
}

.control-item span {
  display: none;
}

/* 色值代码框 */
.color-code-box {
  position: absolute;
  top: 30px;
  right: 30px;
  background: rgba(0, 0, 0, 0.7);
  padding: 15px;
  border-radius: 10px;
  backdrop-filter: blur(10px);
  z-index: 10;
  min-width: 150px;
  text-align: center;
}

.color-preview {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  margin: 0 auto 10px;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.color-value {
  color: white;
  font-size: 14px;
  font-family: monospace;
  margin-bottom: 5px;
}

.material-values {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  font-family: monospace;
  line-height: 1.4;
}

/* 相机按钮样式 */
.camera-button {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  width: 70px;
  height: 50px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.camera-button:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateX(-50%) scale(1.05);
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.camera-button svg {
  stroke: white;
  width: 28px;
  height: 28px;
}

/* 尺寸辅助线样式 */
.dimension-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}

/* ========== 响应式适配 ========== */

/* 平板端适配 (768px - 1024px) */
@media screen and (max-width: 1024px) and (min-width: 768px) {
  /* 定制控制面板调整 */
  .customization-controls {
    left: 30px;
    min-width: 200px;
    padding: 15px;
    gap: 15px;
  }
  
  .control-item {
    gap: 10px;
    padding: 6px 10px;
  }
  
  .control-item label {
    font-size: 14px;
    width: 60px;
  }
  
  .control-item input[type="range"]::-webkit-slider-thumb {
    width: 16px;
    height: 16px;
  }
  
  .control-item input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
  }
  
  /* 相机按钮调整 */
  .camera-button {
    width: 60px;
    height: 45px;
    bottom: 20px;
  }
  
  .camera-button svg {
    width: 24px;
    height: 24px;
  }
  
  /* 色值代码框调整 */
  .color-code-box {
    top: 20px;
    right: 20px;
    padding: 12px;
    min-width: 120px;
  }
  
  .color-preview {
    width: 80px;
    height: 80px;
  }
}

/* 手机端适配 (< 768px) */
@media screen and (max-width: 767px) {
  /* 隐藏定制控制面板 */
  .customization-controls {
    display: none;
  }
  
  /* 隐藏色值代码框 */
  .color-code-box {
    display: none;
  }
  
  /* 相机按钮调整 */
  .camera-button {
    width: 55px;
    height: 40px;
    bottom: 15px;
  }
  
  .camera-button svg {
    width: 22px;
    height: 22px;
  }
  
  /* 弹窗调整 */
  .popup-overlay {
    padding: 15px;
  }
  
  .popup-content {
    max-width: 100%;
    max-height: 80vh;
    padding: 15px;
  }
  
  .popup-header h3 {
    font-size: 16px;
  }
  
  .popup-body {
    padding: 15px;
    max-height: 50vh;
  }
  
  .popup-footer {
    padding: 15px;
  }
  
  .save-button {
    padding: 8px 25px;
    font-size: 14px;
  }
  
  /* 截图弹窗调整 */
  .screenshot-popup {
    padding: 10px;
  }
  
  .screenshot-content {
    max-width: 100%;
    max-height: 70vh;
  }
  
  /* 按钮尺寸调整 */
  .close-button {
    width: 25px;
    height: 25px;
    font-size: 20px;
  }
}

/* 小屏幕手机适配 (< 480px) */
@media screen and (max-width: 480px) {
  .camera-button {
    width: 50px;
    height: 38px;
  }
  
  .camera-button svg {
    width: 20px;
    height: 20px;
  }
  
  .popup-content {
    padding: 10px;
  }
  
  .popup-body {
    padding: 10px;
  }
  
  .save-button {
    padding: 6px 20px;
    font-size: 13px;
  }
}
</style>
