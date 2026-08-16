<template>
  <div class="model-test">
    <div ref="containerRef" class="container"></div>
    <div class="log" ref="logRef"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const containerRef = ref(null)
const logRef = ref(null)
let scene, camera, renderer

function log(message) {
  console.log(message