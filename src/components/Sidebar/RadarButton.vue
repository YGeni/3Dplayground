<template>
  <div class="sidebar-item" :class="{ active: active }" @click="handleClick" @mousedown="handleMouseDown" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
    <span class="text">雷达</span>
    <div class="dot"></div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click', 'long-press-start', 'long-press-end'])

let longPressTimer = null

const handleMouseDown = () => {
  longPressTimer = setTimeout(() => {
    emit('long-press-start')
  }, 500)
}

const handleMouseUp = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  emit('long-press-end')
}

const handleClick = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  emit('click')
}

// 监听鼠标松开事件
window.addEventListener('mouseup', handleMouseUp)
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