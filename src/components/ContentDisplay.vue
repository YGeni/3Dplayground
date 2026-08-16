<template>
  <div class="content-display">
    <!-- SU7 模式内容 -->
    <div v-if="activeItem === 'su7'" class="content-section">
      <h1 class="title">XIAOMI SU7MAX</h1>
      <p class="subtitle">C级高性能 生态科技轿车</p>
    </div>

    <!-- 车身模式内容 -->
    <div v-if="activeItem === 'body'" class="content-section">
      <h2 class="section-title">「外观设计」</h2>
      <h3 class="section-subtitle">优雅与速度感并存 经得起时间考验的设计</h3>
      <p class="section-content">
        遵循「符合直觉」的美学设计理念，造就Xiaomi SU7 MAX经典的流畅车身线条。<br>
        3X轮轴比打造修长舒展的车身比例，标配电动尾翼与空气动力学套件，<br>
        让优雅姿态与极致性能相得益彰，每一处设计都为速度而生。
      </p>
    </div>

    <!-- 风阻模式内容 -->
    <div v-if="activeItem === 'wind'" class="content-section">
      <h2 class="section-title">出色的超低风阻系数</h2>
      <h3 class="cd-value">Cd 0.195</h3>
      <p class="section-content">
        风，就是最好的设计师。<br>
        经过1000次以上仿真实验和超过300次油泥模型调整，不断寻找风道、车身曲线的最优解。<br>
        最终达成Cd 0.195超低风阻系数，SU7MAX电动尾翼更可提供最大130kg下压力，<br>
        带来难以想象的低能耗、出色续航与极致高速稳定性。
      </p>
    </div>

    <!-- 雷达模式内容 -->
    <div v-if="activeItem === 'radar'" class="content-section">
      <h2 class="section-title">「智能驾驶」</h2>
      <h3 class="section-subtitle">隆重介绍Xiaomi Pilot更聪明、更安全的智能驾驶系统</h3>
      <p class="section-content">
        搭载两颗NVIDIA DRIVE AGX Thor芯片，综合算力高达700TOPS，<br>
        支持xiaomi HAD端到端辅助驾驶，实现车位到车位、上车就能用的全场景领航能力，<br>
        让每一次出行都更聪明、更安心
      </p>
      
      <div class="radar-info">
        <div class="radar-label">激光雷达×1</div>
        <div class="radar-label">高清摄像头×11</div>
        <div class="radar-label">4D毫米波雷达×3</div>
        <div class="radar-label">超声波雷达×12</div>
      </div>
    </div>

    <!-- 定制模式内容 -->
    <div v-if="activeItem === 'customization'" class="content-section">
      <h2 class="section-title">「个性定制」</h2>
      <h3 class="section-subtitle">按心意挑选细节，打造专属座驾</h3>
      <p class="section-content">
        丰富的颜色选择和个性化配置，让你的Xiaomi SU7 MAX独一无二。<br>
        从车身颜色到内饰细节，每一处都可以根据你的喜好进行定制。
      </p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  activeItem: {
    type: String,
    default: 'su7'
  }
})
</script>

<style scoped>
.content-display {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  pointer-events: none;
  z-index: 5;
  padding-top: 50px;
}

.content-section {
  text-align: center;
  color: white;
  max-width: 800px;
  padding: 0 20px;
}

.title {
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 10px;
}

.subtitle {
  font-size: 18px;
  opacity: 0.8;
}

.section-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #ff6600;
}

.section-subtitle {
  font-size: 20px;
  margin-bottom: 30px;
}

.section-content {
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 30px;
  opacity: 0.9;
}

.cd-value {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #ff6600;
}

.radar-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
  position: absolute;
  left: 20px;
  top: 25%;
  z-index: 1000;
}

.radar-label {
  color: #ff6600;
  font-size: 14px;
  font-weight: bold;
  font-family: Arial;
  padding: 2px 6px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .title {
    font-size: 36px;
  }
  
  .section-title {
    font-size: 20px;
  }
  
  .section-subtitle {
    font-size: 18px;
  }
  
  .section-content {
    font-size: 14px;
  }
  
  .cd-value {
    font-size: 28px;
  }
  
  .radar-info {
    position: relative;
    left: 0;
    top: 0;
    transform: none;
    margin-top: 20px;
    align-items: center;
    gap: 10px;
  }
  
  .radar-label {
    text-align: center;
  }
}
</style>