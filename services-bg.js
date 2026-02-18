import * as THREE from 'three';

const canvas = document.getElementById('services-canvas');

if (canvas) {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Vertex Shader
    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `;

    // Fragment Shader
    const fragmentShader = `
        uniform float time;
        uniform vec2 resolution;
        varying vec2 vUv;

        // Simplex 2D noise
        vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

        float snoise(vec2 v){
            const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                    -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod(i, 289.0);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ;
            m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            
            // Slow movement
            float t = time * 0.1; 
            
            // Create fluid-like distortion
            float n1 = snoise(uv * 1.5 + vec2(t * 0.1, t * 0.2));
            float n2 = snoise(uv * 1.0 - vec2(t * 0.15, t * 0.05) + n1 * 0.5);
            
            // Colors
            vec3 colorOrange = vec3(1.0, 0.4, 0.0); // Orange
            vec3 colorBlue = vec3(0.0, 0.3, 0.8);   // Blue
            vec3 colorWhite = vec3(0.95, 0.95, 1.0);  // White
            
            // Mix colors based on noise
            vec3 color = mix(colorBlue, colorOrange, smoothstep(-0.4, 0.4, n2));
            color = mix(color, colorWhite, smoothstep(0.4, 0.9, n1 * n2 + 0.2)); // Add white hints
            
            // Output
            gl_FragColor = vec4(color, 1.0); 
        }
    `;

    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 1.0 },
            resolution: { value: new THREE.Vector2(canvas.clientWidth, canvas.clientHeight) }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(plane);

    const animate = (time) => {
        requestAnimationFrame(animate);
        material.uniforms.time.value = time * 0.001;
        renderer.render(scene, camera);
    };
    animate(0);

    // Resize handler
    window.addEventListener('resize', () => {
        const width = canvas.parentElement.clientWidth; // Use parent width
        const height = canvas.parentElement.clientHeight; // Use parent height
        canvas.width = width;
        canvas.height = height;
        renderer.setSize(width, height);
        material.uniforms.resolution.value.set(width, height);
    });

    // Trigger initial resize
    window.dispatchEvent(new Event('resize'));
}
