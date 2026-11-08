# Premium 3D hero and GSAP patterns

Use uploaded 3D logo as source if renderable; never approximate official mark if source is available. Server-render hero H1/value prop/CTA in DOM, reserve scene aspect ratio, lazy-load WebGL client island. Use `@react-three/fiber` + `drei`/Three.js only as needed; GSAP `ScrollTrigger` scoped to mounted scene and correctly killed on cleanup. On no WebGL, slow network or reduced-motion, show 2D logo or poster image with equivalent CTA.

Animation scale: microstates 120–200ms, cards 200–350ms, section transitions 450–750ms. Use transform/opacity. Avoid permanent loops for hidden scenes, aggressive bloom, expensive large textures, high DPR and scene-hidden text. No Lenis smooth scrolling by default. Provide visual storyboard for hero entry, progress, service transitions and finale; do not require motion to understand the business.

Stitch UI is a design proposal; don't claim generated components implement GSAP/Three.js unless code and tests exist.
