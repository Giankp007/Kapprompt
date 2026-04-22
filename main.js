// ==================== PARTICLE / STAR CANVAS ====================
const canvas = document.getElementById('particleCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];
  let stars = [];
  let shootingStars = [];
  let mouse = { x: -1000, y: -1000 };

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', () => { resizeCanvas(); initStars(); });
  document.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

  class Star {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 1.8 + 0.2;
      this.twinkleSpeed = Math.random() * 0.02 + 0.005;
      this.twinklePhase = Math.random() * Math.PI * 2;
      this.baseOpacity = Math.random() * 0.5 + 0.15;
      const colors = [
        [255, 255, 255],
        [26, 143, 255],
        [100, 200, 255],
        [180, 220, 255],
        [200, 230, 255],
      ];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }
    draw(time) {
      const twinkle = Math.sin(time * this.twinkleSpeed + this.twinklePhase);
      const opacity = this.baseOpacity + twinkle * 0.35;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color[0]}, ${this.color[1]}, ${this.color[2]}, ${Math.max(0.02, opacity)})`;
      ctx.fill();

      if (this.size > 1.2 && opacity > 0.4) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color[0]}, ${this.color[1]}, ${this.color[2]}, ${opacity * 0.08})`;
        ctx.fill();
      }
    }
  }

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 1.5 + 0.4;
      this.speedX = (Math.random() - 0.5) * 0.25;
      this.speedY = (Math.random() - 0.5) * 0.25;
      this.opacity = Math.random() * 0.35 + 0.1;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 220) {
        this.x += dx * 0.004;
        this.y += dy * 0.004;
        this.opacity = Math.min(0.75, this.opacity + 0.01);
      } else {
        this.opacity = Math.max(0.08, this.opacity - 0.003);
      }
      if (this.x < -10 || this.x > canvas.width + 10 || this.y < -10 || this.y > canvas.height + 10) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(26, 143, 255, ${this.opacity})`;
      ctx.fill();
    }
  }

  class ShootingStar {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height * 0.5;
      this.length = 80 + Math.random() * 100;
      this.angle = Math.PI * (0.15 + Math.random() * 0.2);
      this.speed = 8 + Math.random() * 6;
      this.opacity = 1;
      this.life = 0;
      this.maxLife = 40 + Math.random() * 20;
    }
    update() {
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
      this.life++;
      this.opacity = 1 - (this.life / this.maxLife);
    }
    draw() {
      const endX = this.x + Math.cos(this.angle) * this.length;
      const endY = this.y + Math.sin(this.angle) * this.length;
      const grad = ctx.createLinearGradient(this.x, this.y, endX, endY);
      grad.addColorStop(0, `rgba(255,255,255,${this.opacity * 0.8})`);
      grad.addColorStop(0.5, `rgba(200,220,255,${this.opacity * 0.4})`);
      grad.addColorStop(1, `rgba(26,143,255,0)`);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Head glow
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${this.opacity})`;
      ctx.fill();
    }
  }

  function initStars() {
    stars = [];
    const starCount = Math.min(400, Math.floor(window.innerWidth * 0.3));
    for (let i = 0; i < starCount; i++) stars.push(new Star());
  }
  initStars();

  const particleCount = Math.min(80, Math.floor(window.innerWidth * 0.06));
  for (let i = 0; i < particleCount; i++) particles.push(new Particle());

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(26, 143, 255, ${0.07 * (1 - dist / 140)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  let time = 0;
  function animate() {
    time++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    stars.forEach(s => s.draw(time));
    particles.forEach(p => { p.update(); p.draw(); });
    drawConnections();

    // Spawn shooting stars occasionally
    if (Math.random() < 0.005 && shootingStars.length < 3) {
      shootingStars.push(new ShootingStar());
    }
    shootingStars = shootingStars.filter(s => s.life < s.maxLife);
    shootingStars.forEach(s => { s.update(); s.draw(); });

    requestAnimationFrame(animate);
  }
  animate();
}

// ==================== SHOWCASE CANVAS ====================
const sCanvas = document.getElementById('showcaseCanvas');
if (sCanvas) {
  const sCtx = sCanvas.getContext('2d');
  function resizeShowcase() {
    const rect = sCanvas.parentElement.getBoundingClientRect();
    sCanvas.width = rect.width;
    sCanvas.height = rect.height;
  }
  resizeShowcase();
  window.addEventListener('resize', resizeShowcase);

  let sTime = 0;
  function drawShowcase() {
    sTime += 0.01;
    sCtx.clearRect(0, 0, sCanvas.width, sCanvas.height);

    // Wave grid
    const cols = 24, rows = 18;
    const cellW = sCanvas.width / cols, cellH = sCanvas.height / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const wave = Math.sin(i * 0.25 + sTime) * Math.cos(j * 0.25 + sTime * 0.7);
        const intensity = (wave + 1) / 2;
        sCtx.fillStyle = `rgba(${Math.floor(26 + intensity * 60)}, ${Math.floor(100 + intensity * 143)}, 255, ${intensity * 0.14})`;
        sCtx.fillRect(i * cellW, j * cellH, cellW - 1, cellH - 1);
      }
    }

    // Central glow
    const gradient = sCtx.createRadialGradient(
      sCanvas.width / 2, sCanvas.height / 2, 0,
      sCanvas.width / 2, sCanvas.height / 2, sCanvas.width * 0.45
    );
    gradient.addColorStop(0, 'rgba(26, 143, 255, 0.1)');
    gradient.addColorStop(1, 'transparent');
    sCtx.fillStyle = gradient;
    sCtx.fillRect(0, 0, sCanvas.width, sCanvas.height);

    // Orbiting dots with connections
    const points = [];
    for (let i = 0; i < 12; i++) {
      const angle = sTime * 0.4 + i * (Math.PI * 2 / 12);
      const radius = 80 + Math.sin(sTime + i) * 40;
      const px = sCanvas.width / 2 + Math.cos(angle) * radius;
      const py = sCanvas.height / 2 + Math.sin(angle) * radius;
      points.push({ x: px, y: py });

      sCtx.beginPath();
      sCtx.arc(px, py, 3, 0, Math.PI * 2);
      sCtx.fillStyle = `rgba(77, 168, 255, ${0.5 + Math.sin(sTime + i) * 0.3})`;
      sCtx.fill();

      // Glow
      sCtx.beginPath();
      sCtx.arc(px, py, 8, 0, Math.PI * 2);
      sCtx.fillStyle = `rgba(26, 143, 255, 0.15)`;
      sCtx.fill();
    }

    // Connect nearby points
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          sCtx.beginPath();
          sCtx.moveTo(points[i].x, points[i].y);
          sCtx.lineTo(points[j].x, points[j].y);
          sCtx.strokeStyle = `rgba(26, 143, 255, ${0.3 * (1 - dist / 100)})`;
          sCtx.lineWidth = 0.8;
          sCtx.stroke();
        }
      }
    }

    requestAnimationFrame(drawShowcase);
  }
  drawShowcase();
}

// ==================== PROGRESS BAR ====================
const progressBar = document.getElementById('progressBar');
if (progressBar) {
  window.addEventListener('scroll', () => {
    progressBar.style.width = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) * 100) + '%';
  });
}

// ==================== NAV ====================
let lastScroll = 0;
const mainNav = document.getElementById('mainNav');
if (mainNav) {
  window.addEventListener('scroll', () => {
    const current = window.scrollY;
    if (current > lastScroll && current > 100) mainNav.classList.add('hidden');
    else mainNav.classList.remove('hidden');
    mainNav.classList.toggle('scrolled', current > 50);
    lastScroll = current;
  });
}

// ==================== MOBILE MENU ====================
const mobileToggle = document.getElementById('mobileToggle');
const mobileMenu = document.getElementById('mobileMenu');
if (mobileToggle && mobileMenu) {
  mobileToggle.addEventListener('click', () => mobileMenu.classList.toggle('open'));
  mobileMenu.querySelectorAll('a').forEach(link =>
    link.addEventListener('click', () => mobileMenu.classList.remove('open'))
  );
}

// ==================== SCROLL REVEAL ====================
const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
reveals.forEach(el => revealObserver.observe(el));

// ==================== PARALLAX ====================
const parallaxEls = document.querySelectorAll('[data-parallax]');
window.addEventListener('scroll', () => {
  parallaxEls.forEach(el => {
    const speed = parseFloat(el.dataset.parallax);
    const rect = el.getBoundingClientRect();
    el.style.transform = `translateY(${(rect.top + window.scrollY - window.innerHeight / 2) * speed}px)`;
  });
});

// ==================== COUNTERS ====================
const counters = document.querySelectorAll('[data-count]');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      let current = 0;
      const step = Math.max(1, Math.floor(target / 40));
      const timer = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(timer); }
        el.textContent = current + suffix;
      }, 30);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });
counters.forEach(el => counterObserver.observe(el));

// ==================== SMOOTH SCROLL ====================
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (mobileMenu) mobileMenu.classList.remove('open');
  });
});

// ==================== CONTACT FORM ====================
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = contactForm.querySelector('.form-submit');
    const submitText = submitBtn.querySelector('.submit-text');
    const submitLoading = submitBtn.querySelector('.submit-loading');

    submitText.style.display = 'none';
    submitLoading.style.display = 'inline';
    submitBtn.disabled = true;

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        contactForm.style.display = 'none';
        formSuccess.style.display = 'block';
      } else {
        throw new Error('Submission failed');
      }
    } catch (err) {
      // Fallback: mailto
      const name = contactForm.querySelector('#name').value;
      const email = contactForm.querySelector('#email').value;
      const company = contactForm.querySelector('#company').value;
      const pkg = contactForm.querySelector('#package').value;
      const message = contactForm.querySelector('#message').value;
      const body = encodeURIComponent(`Name: ${name}\nE-Mail: ${email}\nFirma: ${company}\nPaket: ${pkg}\n\n${message}`);
      window.location.href = `mailto:gian@kapprompt.ch?subject=${encodeURIComponent('Anfrage von ' + name)}&body=${body}`;
      submitText.style.display = 'inline';
      submitLoading.style.display = 'none';
      submitBtn.disabled = false;
    }
  });
}
