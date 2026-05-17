<template>
  <div class="color-picker" v-if="!loading && activeSidebarItem !== 'customization'">
    <div 
      v-for="(color, index) in colors" 
      :key="index"
      class="color-option"
      :style="(color.value === 'imageColor' || color.value === 'imageBoth' || color.value === 'imageColor2' || color.value === 'imageBoth2') ? { backgroundImage: `url(${color.textureUrl})`, backgroundSize: 'cover' } : { backgroundColor: color.value }"
      @click="changeCarColor(color.value, color.textureUrl)"
      :class="{ active: selectedColor === color.value }"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'
import * as THREE from 'three'

// 防抖函数
function debounce(func, delay) {
  let timeoutId
  return function(...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  activeSidebarItem: {
    type: String,
    default: 'su7'
  },
  carModel: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['colorChanged'])

// 颜色和纹理选择相关
const colors = ref([
  { value: '#ffffff', name: '白色' },
  { value: '#ff0000', name: '红色' },
  { value: '#0000ff', name: '蓝色' },
  { value: '#00ff00', name: '绿色' },
  { value: '#ffcc00', name: '黄色' },
  { value: '#888888', name: '灰色' },
  { value: '#000000', name: '黑色' },
  { value: '#ff6600', name: '橙色' },
  { value: '#9900ff', name: '紫色' },
  { value: '#00ffff', name: '青色' },
  { value: 'imageBoth', name: '图片颜色+纹理', textureUrl: '/walletpaper/IMG_0821.JPG' },
  { value: 'imageBoth2', name: '图片颜色+纹理2', textureUrl: '/walletpaper/IMG_0644.JPG' }
])
const selectedColor = ref('#ffffff') // 默认选择白色
let textureLoader = new THREE.TextureLoader()
let bodyTexture = null // 保存车身纹理
const imageColorCache = new Map()

// 颜色方案存储
const colorSchemes = ref([])
const currentScheme = ref(null)

// 加载保存的颜色方案
onMounted(() => {
  const savedSchemes = localStorage.getItem('colorSchemes')
  if (savedSchemes) {
    colorSchemes.value = JSON.parse(savedSchemes)
  }
  
  const lastScheme = localStorage.getItem('lastScheme')
  if (lastScheme) {
    currentScheme.value = JSON.parse(lastScheme)
    // 应用上次的颜色方案
    changeCarColor(currentScheme.value.color, currentScheme.value.textureUrl)
  }
})

// 防抖后的保存函数
const debouncedSaveColorScheme = debounce((name, color, textureUrl) => {
  const scheme = {
    id: Date.now(),
    name,
    color,
    textureUrl,
    createdAt: new Date().toISOString()
  }
  colorSchemes.value.push(scheme)
  localStorage.setItem('colorSchemes', JSON.stringify(colorSchemes.value))
  currentScheme.value = scheme
  localStorage.setItem('lastScheme', JSON.stringify(scheme))
}, 300)

// 保存颜色方案
function saveColorScheme(name, color, textureUrl = null) {
  debouncedSaveColorScheme(name, color, textureUrl)
}

// 监听颜色变化
watch(selectedColor, (newColor) => {
  if (newColor) {
    const currentColorData = colors.value.find(c => c.value === newColor)
    if (currentColorData) {
      saveColorScheme('当前方案', newColor, currentColorData.textureUrl)
    }
  }
})

// 从图片中提取主要颜色
const getColorFromImage = (imageUrl) => {
  return new Promise((resolve) => {
    const cached = imageColorCache.get(imageUrl)
    if (cached) {
      resolve(cached)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = function() {
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, 100, 100)
      
      const imageData = ctx.getImageData(0, 0, 100, 100)
      const data = imageData.data
      
      let r = 0, g = 0, b = 0
      let count = 0
      
      // 计算平均颜色
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3]
        if (alpha > 128) { // 只考虑不透明的像素
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count++
        }
      }
      
      if (count > 0) {
        r = Math.round(r / count)
        g = Math.round(g / count)
        b = Math.round(b / count)
      }
      
      // 转换为十六进制颜色
      const hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
      imageColorCache.set(imageUrl, hexColor)
      resolve(hexColor)
    }
    img.src = imageUrl
  })
}

// 改变车身颜色或纹理
const changeCarColor = async (color, textureUrl = null) => {
  selectedColor.value = color
  emit('colorChanged', color)
  
  if (props.carModel) {
    const bodyObjects = ["Object_30"]
    
    if ((color === 'imageColor' || color === 'imageColor2') && textureUrl) {
      // 从图片中提取颜色
      const imageColor = await getColorFromImage(textureUrl)
      
      props.carModel.traverse(function (child) {
        if (child.isMesh && bodyObjects.includes(child.name)) {
          child.material.color.set(imageColor)
          // 移除纹理
          if (child.material.map) {
            child.material.map = null
            child.material.needsUpdate = true
          }
        }
      })
    } else if ((color === 'imageBoth' || color === 'imageBoth2') && textureUrl) {
      // 从图片中提取颜色并应用纹理
      const imageColor = await getColorFromImage(textureUrl)
      
      // 加载纹理
      textureLoader.load(textureUrl, function (texture) {
        if (bodyTexture && bodyTexture !== texture) {
          bodyTexture.dispose?.()
        }
        bodyTexture = texture
        bodyTexture.wrapS = THREE.RepeatWrapping
        bodyTexture.wrapT = THREE.RepeatWrapping
        bodyTexture.repeat.set(1, 1)
        
        props.carModel.traverse(function (child) {
          if (child.isMesh && bodyObjects.includes(child.name)) {
            child.material.color.set(imageColor)
            child.material.map = bodyTexture
            child.material.needsUpdate = true
          }
        })
      })
    } else {
      // 应用纯色
      props.carModel.traverse(function (child) {
        if (child.isMesh && bodyObjects.includes(child.name)) {
          child.material.color.set(color)
          // 移除纹理
          if (child.material.map) {
            child.material.map = null
            child.material.needsUpdate = true
          }
        }
      })
    }
  }
}

onUnmounted(() => {
  if (bodyTexture) {
    bodyTexture.dispose?.()
    bodyTexture = null
  }
})
</script>

<style scoped>
/* 颜色选择器样式 */
.color-picker {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 30px;
  z-index: 10;
  backdrop-filter: blur(10px);
}

.color-option {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: #ffffff;
  transform: scale(1.2);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

/* 平板端适配 (768px - 1024px) */
@media screen and (max-width: 1024px) and (min-width: 768px) {
  .color-picker {
    bottom: 25px;
    gap: 8px;
    padding: 8px 15px;
  }
  
  .color-option {
    width: 26px;
    height: 26px;
  }
}

/* 手机端适配 (< 768px) */
@media screen and (max-width: 767px) {
  .color-picker {
    bottom: 20px;
    gap: 6px;
    padding: 6px 12px;
  }
  
  .color-option {
    width: 22px;
    height: 22px;
  }
  
  .color-option.active {
    transform: scale(1.15);
  }
}

/* 小屏幕手机适配 (< 480px) */
@media screen and (max-width: 480px) {
  .color-picker {
    bottom: 15px;
    gap: 5px;
    padding: 5px 10px;
  }
  
  .color-option {
    width: 20px;
    height: 20px;
  }
}
</style>