// ---------------------------------------------------------
// 1. WebGL Fluid Background (Shader Logic)
// ---------------------------------------------------------

const canvas = document.getElementById('gl-canvas');
const gl = canvas.getContext('webgl');

// Resize handling
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

// Fragment Shader: Simplex Noise & Color Mixing
// Colors: Dark base, Blue, Magenta/Purple, Green
const fragmentShaderSource = `
    precision mediump float;
    uniform float u_time;
    uniform vec2 u_resolution;

    // Simplex noise (3D)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) { 
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

        // First corner
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;

        // Other corners
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );

        //   x0 = x0 - 0.0 + 0.0 * C.xxx;
        //   x1 = x0 - i1  + 1.0 * C.xxx;
        //   x2 = x0 - i2  + 2.0 * C.xxx;
        //   x3 = x0 - 1.0 + 3.0 * C.xxx;
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
        vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

        // Permutations
        i = mod289(i); 
        vec4 p = permute( permute( permute( 
                  i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

        // Gradients: 7x7 points over a square, mapped onto an octahedron.
        // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
        float n_ = 0.142857142857; // 1.0/7.0
        vec3  ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );

        //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
        //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);

        //Normalise gradients
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        // Mix final noise value
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                      dot(p2,x2), dot(p3,x3) ) );
    }

    // OKLCH to Linear RGB conversion (Approximation)
    // l: 0.0-1.0, c: 0.0-0.4+, h: 0.0-1.0 (0-360 degrees)
    vec3 oklch_to_rgb(vec3 c) {
        float l = c.x;
        float s = c.y;
        float h = c.z * 6.283185307; // 0-1 to radians

        float a = s * cos(h);
        float b = s * sin(h);

        // OKLCH -> LMS
        vec3 lms = vec3(l + 0.3963377774 * a + 0.2158037573 * b,
                        l - 0.1055613458 * a - 0.0638541728 * b,
                        l - 0.0894841775 * a - 1.2914855480 * b);

        // LMS -> Linear RGB (approximate cubic transfer removal)
        lms = lms * lms * lms;

        // Linear RGB projection
        return vec3(
            4.0767416621 * lms.x - 3.3077115913 * lms.y + 0.2309699292 * lms.z,
            -1.2684380046 * lms.x + 2.6097574011 * lms.y - 0.3413193965 * lms.z,
            -0.0041960863 * lms.x - 0.7034186147 * lms.y + 1.7076147010 * lms.z
        );
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        
        // Slow adjustments for "liquid" feel
        float time = u_time * 0.05; 

        // Large, very smooth noise layers (cloud-like) applied
        float n1 = snoise(vec3(uv * 0.8, time * 0.5));
        float n2 = snoise(vec3(uv * 1.5 + vec2(time * 0.2), time * 0.4));
        float n3 = snoise(vec3(uv * 1.5 - vec2(time * 0.1), time * 0.3)); // Increased frequency to break up large green blobs

        // Combined noise for organic flow
        float finalNoise = (n1 + n2 + n3) / 3.0;
        
        // Color Palette (Blue, Orange, White) using OKLCH
        vec3 c_base = vec3(0.0, 0.0, 0.0);           // Dark Base
        
        // Blue: L=0.55, C=0.2, H=260/360=0.72
        vec3 c_blue = oklch_to_rgb(vec3(0.55, 0.2, 0.72));
        
        // Orange: L=0.65, C=0.2, H=50/360=0.14  
        vec3 c_orange = oklch_to_rgb(vec3(0.65, 0.2, 0.14));
        
        // White: L=0.95, C=0.0, H=0.0
        vec3 c_white = oklch_to_rgb(vec3(0.95, 0.0, 0.0));
        
        // Mixing Logic: Very broad, smooth gradients (no sharp "puddles")
        vec3 color = c_base;

        
        // Mix using wide smoothsteps for painterly effect
        color = mix(color, c_orange, smoothstep(-0.8, 0.6, n1));
        color = mix(color, c_blue, smoothstep(-0.6, 0.8, n2));
        color = mix(color, c_white, smoothstep(-0.5, 0.9, n3) * 0.6); // Reduced intensity to prevent overwhelming white
        
        // Add subtle lightness variation
        color += (finalNoise * 0.1);

        gl_FragColor = vec4(color, 1.0);
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    -1, 1,
    1, -1,
    1, 1,
]), gl.STATIC_DRAW);

const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionAttributeLocation);
gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

const timeUniformLocation = gl.getUniformLocation(program, "u_time");
const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

function render(time) {
    gl.uniform1f(timeUniformLocation, time * 0.001);
    gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
}
requestAnimationFrame(render);

// ---------------------------------------------------------
// 2. Application Logic (GSAP, Lenis)
// ---------------------------------------------------------

// Initialize Lenis Smooth Scroll
const lenis = new Lenis({
    lerp: 0.1, // Smoothness intensity
    smoothWheel: true
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Initialize GSAP
gsap.registerPlugin(ScrollTrigger);

// Preloader & Entrance Animation
window.addEventListener("load", () => {

    // Simulate loading progress
    gsap.to(".loader-progress", {
        width: "100%",
        duration: 2,
        ease: "power2.inOut",
        onComplete: () => {
            introAnimation();
        }
    });

});

function introAnimation() {
    const tl = gsap.timeline();

    tl.to(".preloader", {
        yPercent: -100,
        duration: 1.2,
        ease: "power4.inOut"
    })
        .from(".hero .hero-title .line", {
            opacity: 0,
            duration: 1,
            ease: "power2.out"
        }, "-=0.5")
        // Spin 'O' letters - adjusted to start immediately with title
        .from(".hero .spin-letter", {
            rotation: -1440, // 4 full spins (faster)
            duration: 3,
            ease: "power4.out" // Smooth deceleration to 0
        }, "<") // Syncs with start of title animation
        .from(".hero-subtitle", {
            y: 20,
            opacity: 0,
            duration: 1,
            ease: "power3.out"
        }, "-=2.5") // Adjusted overlap because spin takes 3s
        .from("nav", {
            y: -50,
            opacity: 0,
            duration: 1
        }, "-=0.8");

    // Scroll-based Letter Spacing Expansion for Subtitle
    gsap.to(".hero-subtitle", {
        letterSpacing: "40px",
        autoRound: false,
        ease: "none",
        scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom top", // As we scroll past the hero
            scrub: 1.5
        }
    });

    // Logo Interactions (Click & Hover)
    const logo = document.querySelector(".logo");
    if (logo) {
        // Scroll to top on click
        logo.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });

        // Spin on hover
        const logoLetters = logo.querySelectorAll(".spin-letter");
        logo.addEventListener("mouseenter", () => {
            gsap.to(logoLetters, {
                rotation: "+=360",
                duration: 0.8,
                ease: "power2.out",
                overwrite: true
            });
        });
    }
}


// About Section - Premium Redesign Animations
// About Section - Premium Redesign Animations
// 1. Sticky Title Dynamics (Fade + Skew on scroll)
gsap.to(".sticky-title", {
    opacity: 0.3,
    scale: 0.95,
    y: 50, // Slight movement
    scrollTrigger: {
        trigger: ".about-layout",
        start: "top top",
        end: "bottom bottom",
        scrub: 1
    }
});

// 2. Parallax Effect for Content Column (Moves faster/differently)
gsap.fromTo(".about-content",
    { y: 100 },
    {
        y: -100,
        ease: "none",
        scrollTrigger: {
            trigger: ".about",
            start: "top bottom",
            end: "bottom top",
            scrub: 1.5 // Smooth parallax lag
        }
    }
);

// 3. Text Paragraphs Reveal (Staggered fade up)
gsap.utils.toArray(".text-block").forEach(text => {
    gsap.from(text, {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
            trigger: text,
            start: "top 90%",
            end: "top 60%",
            scrub: 1 // Link opacity to scroll for smoothness
        }
    });
});

// 4. Highlight Chips (Scale in)
gsap.utils.toArray(".premium-highlight").forEach(highlight => {
    gsap.from(highlight, {
        scale: 0.9,
        backgroundColor: "rgba(255,255,255,0)",
        duration: 0.5,
        scrollTrigger: {
            trigger: highlight,
            start: "top 85%",
            toggleActions: "play none none reverse"
        }
    });
});

// 4. Signature Reveal
gsap.from(".signature", {
    x: 100,
    opacity: 0,
    duration: 1.5,
    ease: "power4.out",
    scrollTrigger: {
        trigger: ".signature-wrapper",
        start: "top 90%"
    }
});

// Work Section - Horizontal Scroll
if (window.innerWidth > 900) {
    const workSection = document.querySelector(".work-section");
    const workContainer = document.querySelector(".work-container");

    /**
     * Important: We need to calculate the correct scroll distance.
     * Scroll amount = width of container - window width
     */
    function getScrollAmount() {
        return -(workContainer.scrollWidth - window.innerWidth);
    }

    const tween = gsap.to(workContainer, {
        x: getScrollAmount,
        ease: "none"
    });

    ScrollTrigger.create({
        trigger: ".work-section",
        start: "top top",
        end: () => `+=${getScrollAmount() * -1}`, // Scroll based on length
        pin: true,
        animation: tween,
        scrub: 1,
        invalidateOnRefresh: true,
    });
}

// Magnetic Button Effect (Footer)
const magneticBtn = document.querySelector(".magnetic-btn");
if (magneticBtn) {
    magneticBtn.addEventListener("mousemove", (e) => {
        const rect = magneticBtn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        gsap.to(magneticBtn, {
            x: x * 0.4,
            y: y * 1.4,
            duration: 0.5,
            ease: "power3.out"
        });

        gsap.to(magneticBtn.querySelector(".btn-text"), {
            x: x * 0.2, // Text moves less
            y: y * 0.2,
            duration: 0.5,
            ease: "power3.out"
        });
    });

    magneticBtn.addEventListener("mouseleave", () => {
        gsap.to(magneticBtn, {
            x: 0,
            y: 0,
            duration: 1.2,
            ease: "elastic.out(1, 0.3)"
        });

        gsap.to(magneticBtn.querySelector(".btn-text"), {
            x: 0,
            y: 0,
            duration: 1.2,
            ease: "elastic.out(1, 0.3)"
        });
    });
}

// ---------------------------------------------------------
// 3. Services Section Animations
// ---------------------------------------------------------



// Services Header - Keep it Rollin' Style Animation (Letter Spacing)
// Services Header - Keep it Rollin' Style Animation (Letter Spacing)
// Services Header - Hero Style Animation
const servicesHeader = document.querySelector(".services-header");
if (servicesHeader) {
    const tlServices = gsap.timeline({
        scrollTrigger: {
            trigger: ".services-header",
            start: "top 80%", // Trigger earlier
            toggleActions: "play none none reverse"
        }
    });

    // Animation 1 (The Reveal)
    tlServices.from(".services .hero-title .line", {
        opacity: 0,
        duration: 1,
        ease: "power2.out"
    })
        // Animation 2 (The Spin) - Synced with Reveal
        .from(".services .hero-title .spin-letter", {
            rotation: -1440,
            duration: 3,
            ease: "power4.out"
        }, "<");
}

// Cards Stagger Reveal - Optimized for Stability
gsap.from(".service-card", {
    y: 50, // Reduced distance
    opacity: 0,
    duration: 0.8,
    stagger: 0.1, // Faster stagger
    ease: "power2.out",
    clearProps: "all", // CRITICAL: Removes transform after animation to prevent offsets
    scrollTrigger: {
        trigger: ".services-grid",
        start: "top 85%"
    }
});

// 3D Tilt Effect for Cards
const serviceCards = document.querySelectorAll('.service-card');

serviceCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        if (window.innerWidth <= 900) return; // Disable tilt on mobile

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Tilt calculation (Subtler: Reduced multiplier from 5 to 2)
        const rotateX = ((y - centerY) / centerY) * -2;
        const rotateY = ((x - centerX) / centerX) * 2;

        // Apply rotation (Smoother: Increased duration slightly, using power2.out)
        gsap.to(card, {
            rotationX: rotateX,
            rotationY: rotateY,
            transformPerspective: 1000,
            duration: 0.8,
            ease: "power2.out"
        });

        // Move glass shimmer effect
        const glass = card.querySelector('.card-glass');
        if (glass) {
            gsap.to(glass, {
                x: (x - centerX) * 0.4,
                y: (y - centerY) * 0.4,
                duration: 0.5,
                ease: "power1.out"
            });
        }
    });

    card.addEventListener('mouseleave', () => {
        // Reset rotation
        gsap.to(card, {
            rotationX: 0,
            rotationY: 0,
            duration: 0.8,
            ease: "elastic.out(1, 0.5)"
        });

        // Reset glass
        const glass = card.querySelector('.card-glass');
        if (glass) {
            gsap.to(glass, {
                x: 0,
                y: 0,
                duration: 0.8
            });
        }
    });
});

// Mobile Menu Toggle
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');
const mobileLinks = document.querySelectorAll('.mobile-link');

if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('active');

        // Prevent scrolling when menu is open
        if (mobileMenu.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });

    // Close menu when a link is clicked
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
}