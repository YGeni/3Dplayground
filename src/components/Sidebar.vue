<template>
  <div class="sidebar" v-if="!loading">
    <SU7Button 
      :active="activeSidebarItem === 'su7'" 
      @click="showSU7"
      @long-press-start="onSU7LongPressStart"
      @long-press-end="onSU7LongPressEnd"
    />
    <BodyButton 
      ref="bodyButtonRef"
      :active="activeSidebarItem === 'body'" 
      :scene="scene"
      :car-model="carModel"
      :ground="ground"
      @click="showBody"
      @long-press-start="onBodyLongPressStart"
      @long-press-end="onBodyLongPressEnd"
    />
    <RadarButton 
      :active="activeSidebarItem === 'radar'" 
      @click="showRadar"
      @long-press-start="onRadarLongPressStart"
      @long-press-end="onRadarLongPressEnd"
    />
    <WindResistanceButton 
      :active="activeSidebarItem === 'wind'" 
      @click="showWindResistance"
    />
    <CustomizationButton 
      :active="activeSidebarItem === 'customization'" 
      @click="showCustomization"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SU7Button from './Sidebar/SU7Button.vue'
import BodyButton from './Sidebar/BodyButton.vue'
import RadarButton from './Sidebar/RadarButton.vue'
import WindResistanceButton from './Sidebar/WindResistanceButton.vue'
import CustomizationButton from './Sidebar/CustomizationButton.vue'

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
  },
  scene: {
    type: Object,
    default: null
  },
  ground: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['sidebarChange', 'rotateCar', 'longPressStart', 'longPressEnd', 'su7LongPressStart', 'su7LongPressEnd'])

// BodyButton组件引用
const bodyButtonRef = ref(null)

// 处理BodyButton长按开始
const onBodyLongPressStart = () => {
  // 传递长按开始事件给父组件
  emit('longPressStart')
}

// 处理BodyButton长按结束
const onBodyLongPressEnd = () => {
  // 传递长按结束事件给父组件
  emit('longPressEnd')
}

// 处理SU7Button长按开始
const onSU7LongPressStart = () => {
  // 传递长按开始事件给父组件
  emit('su7LongPressStart')
}

// 处理SU7Button长按结束
const onSU7LongPressEnd = () => {
  // 传递长按结束事件给父组件
  emit('su7LongPressEnd')
}

// 处理RadarButton长按开始
const onRadarLongPressStart = () => {
  // 传递长按开始事件给父组件
  emit('longPressStart')
}

// 处理RadarButton长按结束
const onRadarLongPressEnd = () => {
  // 传递长按结束事件给父组件
  emit('longPressEnd')
}

// 暴露组件引用给父组件
defineExpose({
  bodyButtonRef
})

// 侧边栏方法
const showSU7 = () => {
  emit('sidebarChange', 'su7')
}

const showBody = () => {
  emit('sidebarChange', 'body')
  // 旋转汽车，向逆时针旋转75度，然后再旋转180度
  emit('rotateCar', Math.PI * 0.9167 + Math.PI) // 165度 + 180度 = 345度
}

const showRadar = () => {
  emit('sidebarChange', 'radar')
}

const showCustomization = () => {
  emit('sidebarChange', 'customization')
  // 旋转汽车，使车头朝向右前方60度
  emit('rotateCar', -Math.PI / 3)
}

const showWindResistance = () => {
  emit('sidebarChange', 'wind')
  // 旋转汽车，顺时针旋转135度
  emit('rotateCar', -Math.PI * 0.75) // 135度转换为弧度
}
</script>

<style scoped>
/* 侧边栏样式 */
.sidebar {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 30px;
  z-index: 10;
  padding-right: 0;
}

/* 平板端适配 (768px - 1024px) */
@media screen and (max-width: 1024px) and (min-width: 768px) {
  .sidebar {
    right: 15px;
    gap: 25px;
  }
}

/* 手机端适配 (< 768px) */
@media screen and (max-width: 767px) {
  .sidebar {
    right: 10px;
    gap: 20px;
  }
}

/* 小屏幕手机适配 (< 480px) */
@media screen and (max-width: 480px) {
  .sidebar {
    right: 8px;
    gap: 15px;
  }
}
</style>