<template>
  <div class="device-detector" v-show="visible">
    <!-- 设备类型显示 -->
    <div class="device-info">
      <div class="device-icon">
        <svg v-if="currentDevice === 'desktop'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
        <svg v-else-if="currentDevice === 'tablet'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
          <line x1="12" y1="18" x2="12" y2="18"></line>
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
          <line x1="12" y1="18" x2="12" y2="18"></line>
        </svg>
      </div>
      <div class="device-text">
        <span class="device-label">设备:</span>
        <span class="device-name">{{ deviceName }}</span>
      </div>
    </div>
    
    <!-- 提示信息 -->
    <div class="tips">
      <template v-if="currentDevice === 'desktop'">
        <p>💡 鼠标拖动旋转 • 滚轮缩放 • 长按触发特效</p>
      </template>
      <template v-else-if="currentDevice === 'tablet'">
        <p>💡 触摸拖动旋转 • 双指缩放 • 长按触发特效</p>
      </template>
      <template v-else>
        <p>💡 触摸拖动旋转 • 长按触发特效</p>
      </template>
    </div>
    
    <!-- 关闭按钮 -->
    <button class="close-btn" @click="$emit('close')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  initialDevice: {
    type: String,
    default: 'desktop'
  },
  visible: {
    type: Boolean,
    default: true
  }
})

defineEmits(['close'])

const currentDevice = ref(props.initialDevice)

const deviceName = computed(() => {
  const names = {
    desktop: '桌面电脑',
    tablet: '平板电脑',
    mobile: '智能手机'
  }
  return names[currentDevice.value] || '未知设备'
})

// 自动检测设备类型
onMounted(() => {
  const userAgent = navigator.userAgent
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const screenWidth = window.screen.width
  const screenHeight = window.screen.height
  const minTabletWidth = 768
  const maxPhoneWidth = 767
  
  // 检测iPad（包括iPadOS 13+）
  const isIPad = /iPad/i.test(userAgent) || 
                 (/MacIntel/i.test(userAgent) && hasTouch && screenWidth >= minTabletWidth)
  
  if (isIPad) {
    currentDevice.value = 'tablet'
  }
  // 检测Android平板（不含Mobile标识且屏幕足够大）
  else if (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent) && screenWidth >= minTabletWidth) {
    currentDevice.value = 'tablet'
  }
  // 检测大屏幕触摸设备（可能是平板）
  else if (hasTouch && screenWidth >= minTabletWidth && screenHeight >= minTabletWidth) {
    currentDevice.value = 'tablet'
  }
  // 检测手机（小屏幕触摸设备）
  else if (hasTouch && screenWidth <= maxPhoneWidth) {
    currentDevice.value = 'mobile'
  }
  // 检测传统移动设备
  else if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    currentDevice.value = 'mobile'
  }
  // 默认桌面
  else {
    currentDevice.value = 'desktop'
  }
})
</script>

<style scoped>
.device-detector {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  border-radius: 16px;
  padding: 16px 20px;
  z-index: 1000;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 280px;
}

.device-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.device-icon {
  color: #00d4ff;
}

.device-text {
  display: flex;
  gap: 8px;
  align-items: center;
}

.device-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.device-name {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.mode-switcher {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.mode-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.mode-btn.active {
  background: linear-gradient(135deg, #00d4ff, #0099cc);
  border-color: transparent;
  color: #fff;
}

.tips {
  margin-bottom: 8px;
}

.tips p {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}
</style>
