import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

// 加载 HDR 环境贴图（使用官方推荐的 HDRLoader）
export async function loadHDRI(path, renderer, scene) {
  const loader = new HDRLoader();
  
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
        resolve(texture);
      },
      undefined,
      (error) => {
        console.error('Failed to load HDRI:', error);
        reject(error);
      }
    );
  });
}

// Raycaster 检测
export function raycastFromMouse(mouse, camera, scene) {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);
  return intersects;
}

// 创建 CubeCamera 用于局部反射
export function createCubeCamera(size = 256) {
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(size);
  const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
  return cubeCamera;
}

// 平滑相机过渡
export function smoothCameraTransition(camera, controls, targetPosition, targetTarget, duration = 1000) {
  const startPosition = camera.position.clone();
  const startTarget = controls.target.clone();
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用缓动函数
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      camera.position.lerpVectors(startPosition, new THREE.Vector3(...targetPosition), easedProgress);
      controls.target.lerpVectors(startTarget, new THREE.Vector3(...targetTarget), easedProgress);
      controls.update();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }
    
    animate();
  });
}

// 检查是否为移动设备（手机）
export function isMobile() {
  return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && 
         !/iPad/i.test(navigator.userAgent);
}

// 检查是否为平板电脑
export function isTablet() {
  return /iPad/i.test(navigator.userAgent) || 
         (/Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent));
}

// 检查是否为桌面设备
export function isDesktop() {
  return !isMobile() && !isTablet();
}

// 获取设备类型
export function getDeviceType() {
  if (isTablet()) return 'tablet';
  if (isMobile()) return 'mobile';
  return 'desktop';
}

// 性能适配配置
export function getPerformanceConfig() {
  const deviceType = getDeviceType();
  return {
    deviceType,
    isTablet: deviceType === 'tablet',
    isMobile: deviceType === 'mobile',
    isDesktop: deviceType === 'desktop',
    bloomEnabled: deviceType !== 'mobile', // 手机禁用bloom
    cubeCameraResolution: deviceType === 'mobile' ? 64 : (deviceType === 'tablet' ? 128 : 256),
    particlesCount: deviceType === 'mobile' ? 300 : (deviceType === 'tablet' ? 600 : 1000),
    envMapResolution: deviceType === 'mobile' ? 128 : (deviceType === 'tablet' ? 256 : 512),
    shadowMapEnabled: deviceType !== 'mobile', // 手机禁用阴影
    antialias: deviceType !== 'mobile' // 手机禁用抗锯齿
  };
}
