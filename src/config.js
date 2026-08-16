// 汽车模型路径配置
export const CAR_MODEL_PATH = '/models/su7.glb';

// 相机预设视角
export const CAMERA_PRESETS = {
  front: {
    position: [8, 1.5, 0],
    target: [0, 0.5, 0],
    name: '前视'
  },
  side: {
    position: [0, 1.5, 8],
    target: [0, 0.5, 0],
    name: '侧视'
  },
  threeQuarter: {
    position: [5, 2, 5],
    target: [0, 0.5, 0],
    name: '45°视角'
  },
  top: {
    position: [0, 15, 0],
    target: [0, 1, 0],
    name: '顶视'
  }
};

// 预设车身颜色
export const CAR_COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  red: '#FF0000',
  blue: '#0000FF',
  silver: '#C0C0C0',
  yellow: '#FFFF00'
};

// 风阻等级
export const DRAG_LEVELS = {
  low: {
    value: 0.25,
    name: '低风阻'
  },
  medium: {
    value: 0.35,
    name: '中风阻'
  },
  high: {
    value: 0.45,
    name: '高风阻'
  }
};
