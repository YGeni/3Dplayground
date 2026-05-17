<template>
  <div v-if="false"><!-- 此组件不渲染任何内容，仅用于管理汽车模型 --></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const props = defineProps({
  scene: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['modelLoaded', 'loadingProgress'])

// 汽车模型引用
const carModel = ref(null)

// 加载汽车模型
const loadCarModel = (progressCallback) => {
  if (!props.scene) {
    console.error('[CarModel] Scene is not provided')
    emit('modelLoaded', null)
    return
  }
  
  const loader = new GLTFLoader()
  
  // 检查GLTFLoader是否正确加载
  if (!loader) {
    console.error('[CarModel] GLTFLoader initialization failed')
    emit('modelLoaded', null)
    return
  }
  
  try {
    loader.load(
      '/models/su7.glb', 
      function (gltf) {
        const car = gltf.scene
        // 保存汽车模型引用
        carModel.value = car
        // 调整汽车模型的位置和缩放
        car.position.set(0, -0.5, 0) // 继续向下移动汽车，使车轮与镜面轮胎刚好贴着
        car.rotation.set(0, Math.PI, 0) // 旋转180度
        car.scale.set(1, 1, 1)
        
        props.scene.add(car)

        // 启用汽车的阴影投射，并设置车窗颜色
        let meshCount = 0
        car.traverse(function (child) {
          if (child.isMesh) {
            meshCount++
            child.castShadow = true
            // 设置车窗颜色
            const windowObjects = ["Object_36", "Object_64", "Object_71", "Object_95", "Object_88"]
            if (windowObjects.includes(child.name)) {
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
        
        // 模型加载完成，更新进度到100%
        if (progressCallback) {
          progressCallback(100)
        }
        emit('modelLoaded', carModel.value)
      }, 
      function (xhr) {
        // 汽车模型加载进度
        const progress = 50 + (xhr.loaded / xhr.total) * 50
        const roundedProgress = Math.min(Math.round(progress), 100)
        if (progressCallback) {
          progressCallback(roundedProgress)
        }
        emit('loadingProgress', roundedProgress)
      },
      function (error) {
        console.error('[CarModel] Error loading car model:', error)
        // 即使加载失败，也设置loading为false，避免一直显示加载界面
        emit('modelLoaded', null)
      }
    )
  } catch (error) {
    console.error('[CarModel] Exception during model loading:', error)
    emit('modelLoaded', null)
  }
}

// 暴露方法
defineExpose({
  carModel,
  loadCarModel
})
</script>

<style scoped>
/* 此组件不渲染任何内容，无需样式 */
</style>