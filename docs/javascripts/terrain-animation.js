import * as ThreeJS from 'https://cdn.skypack.dev/three@0.136.0';

function initTerrainAnimation() {
  const container = document.getElementById('animation-container');
  if (!container) return;

  // Clean up
  container.innerHTML = '';

  // 1. Scene Setup
  const scene = new ThreeJS.Scene();

  // Camera: eye-level looking across the terrain (not top-down)
  const camera = new ThreeJS.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 10, 40);   // lower + farther back
  camera.lookAt(0, 6, 0);           // aim slightly above the ground/horizon

  const renderer = new ThreeJS.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // 2. Terrain Geometry
  const width = 80;
  const depth = 80;
  const geometry = new ThreeJS.PlaneGeometry(width, depth, 50, 50);

  // 3. Material
  const material = new ThreeJS.MeshBasicMaterial({
    color: 0x999999,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
    side: ThreeJS.DoubleSide
  });

  // --- THEME DETECTION LOGIC ---
  function updateThemeColor() {
      // Zensical/MkDocs uses 'data-md-color-scheme' on the body. 
      const scheme = document.body.getAttribute('data-md-color-scheme');
      
      // Check if dark mode is active (slate or dark)
      const isDark = scheme === 'slate' || scheme === 'dark';

      if (isDark) {
          // Dark Mode: Lighter Grey lines (0xaaaaaa)
          material.color.setHex(0x8e9da3); 
          material.opacity = 0.05;
      } else {
          // Light Mode: Darker Grey lines (0x444444)b2cad4 for visibility
          material.color.setHex(0x0c335c); 
          material.opacity = 0.025; 
      }
  }

  // Run immediately to set initial color
  updateThemeColor();

  // Watch for theme changes (Dynamic updates without reload)
  const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-md-color-scheme') {
              updateThemeColor();
          }
      });
  });
  
  observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-md-color-scheme']
  });
  // -----------------------------

  const terrain = new ThreeJS.Mesh(geometry, material);

  // Rotate 90 deg to lie flat on the "floor"
  terrain.rotation.x = -Math.PI / 2;

  // Push the terrain forward so the camera isn't centered on the middle
  // (helps the "looking out over it" perspective)
  terrain.position.z = -25;

  scene.add(terrain);

  // 4. Animation Variables
  const clock = new ThreeJS.Clock();

  function animate() {
    // IMPORTANT: Stop animation if the container is no longer on the page
    if (!document.body.contains(container)) return;
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    const positionAttribute = geometry.attributes.position;
    const vertex = new ThreeJS.Vector3();

    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);

      const wave1 = Math.sin(vertex.x * 0.2 + time * 0.25);
      const wave2 = Math.cos(vertex.y * 0.3 + time * 0.6);
      const wave3 = Math.sin((vertex.x + vertex.y) * 0.5 + time * 0.1);

      const height = (wave1 * 2) + (wave2 * 1.5) + (wave3 * 0.5);

      positionAttribute.setZ(i, height);
    }

    positionAttribute.needsUpdate = true;

    // Gentle slow rotation for dynamism (keep subtle so it stays "eye level")
    terrain.rotation.z = Math.sin(time * 0.1) * 0.03;

    renderer.render(scene, camera);
  }

  animate();

  // Handle Resize
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}

export { initTerrainAnimation as init };