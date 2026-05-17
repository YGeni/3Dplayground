<template>
  <div class="performance-test">
    <div class="test-controls">
      <button @click="startTest">开始测试</button>
      <button @click="stopTest">停止测试</button>
      <div class="test-results">
        <h3>测试结果</h3>
        <p>当前帧率: {{ currentFps }} FPS</p>
        <p>平均帧率: {{ averageFps }} FPS</p>
        <p>模型加载时间: {{ modelLoadTime }} ms</p>
        <p>内存占用: {{ memoryUsage }} MB</p>
        <p>当前模式: {{ currentMode }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

// 性能测试相关变量
const currentFps = ref(0)
const averageFps = ref(0)
const modelLoadTime = ref(0)
const memoryUsage = ref(0)
const currentMode = ref('default')

// 性能统计变量
let frameCount = 0
let lastTime = 0
let fpsHistory = []
let animationId = null

// 渲染循环
function renderLoop() {
  // 计算帧率
  const currentTime = performance.now()
  frameCount++
  
  if (currentTime - lastTime >= 1000) {
    currentFps.value = frameCount
    fpsHistory.push(frameCount)
    if (fpsHistory.length > 10) {
      fpsHistory.shift()
    }
    averageFps.value = fpsHistory.reduce((sum, fps) => sum + fps, 0) / fpsHistory.length
    frameCount = 0
    lastTime = currentTime
    
    // 记录内存使用
    if (performance.memory) {
      memoryUsage.value = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)
    }
    
    console.log(`FPS: ${currentFps.value}, Avg FPS: ${averageFps.value}, Memory: ${memoryUsage.value} MB, Mode: ${currentMode.value}`)
  }
  
  animationId = requestAnimationFrame(renderLoop)
}

// 开始测试
function startTest() {
  if (!animationId) {
    lastTime = performance.now()
    frameCount = 0
    fpsHistory = []
    renderLoop()
  }
}

// 停止测试
function stopTest() {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

// 测试不同模式
function testMode(mode) {
  currentMode.value = mode
  console.log(`=== 测试${mode === 'default' ? '默认' : mode === 'wind' ? '风阻' : '雷达'}模式 ===`)
}

// 组件挂载
onMounted(() => {
  // 测试不同模式
  setTimeout(() => {
    testMode('default')
  }, 1000)
  
  setTimeout(() => {
    testMode('wind')
  }, 10000)
  
  setTimeout(() => {
    testMode('radar')
  }, 20000)
  
  // 开始测试
  startTest()
})

// 组件卸载
onUnmounted(() => {
  stopTest()
})
</script>

<style scoped>
.performance-test {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.test-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 20px;
  border-radius: 8px;
  z-index: 1000;
}

.test-controls button {
  margin: 5px;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background: #0077ff;
  color: white;
  cursor: pointer;
}

.test-controls button:hover {
  background: #0055cc;
}

.test-results {
  margin-top: 20px;
}

.test-results h3 {
  margin-top: 0;
}

.test-results p {
  margin: 5px 0;
  font-size: 14px;
}
</style>