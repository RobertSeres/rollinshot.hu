// ---------------------------------------------------------
// 1. WebGL Fluid Background (REMOVED - Replaced by Hyperspeed)
// ---------------------------------------------------------

/*
const canvas = document.getElementById('gl-canvas');
... (Old Shader Code Removed) ...
*/


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
// Control Hyperspeed Background (#lights) visibility
// Only visible in Hero section
ScrollTrigger.create({
    trigger: ".hero",
    start: "top top", // When hero starts
    end: "bottom top", // When hero ends
    onLeave: () => gsap.to("#lights", { opacity: 0, duration: 0.5 }), // Fade out when leaving
    onEnterBack: () => gsap.to("#lights", { opacity: 1, duration: 0.5 }), // Fade in when coming back
    onEnter: () => gsap.to("#lights", { opacity: 1, duration: 0.5 }) // Ensure visible on load if at top
});

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
const closeMenu = document.querySelector('.close-menu');

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

    // Close menu when close button is clicked
    if (closeMenu) {
        closeMenu.addEventListener('click', () => {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
}