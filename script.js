const WHATSAPP_NUMBER = "5553999575359";
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Olá! Gostaria de receber informações sobre a próxima temporada do Socializando."
);

const buildWhatsAppLink = () => {
  const normalized = WHATSAPP_NUMBER.replace(/\D/g, "");
  return normalized && normalized !== ""
    ? `https://wa.me/${normalized}?text=${WHATSAPP_MESSAGE}`
    : "#";
};

const bindWhatsAppLinks = () => {
  const href = buildWhatsAppLink();
  document.querySelectorAll("[data-whatsapp]").forEach((element) => {
    element.setAttribute("href", href);
    if (href === "#") {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        alert("Inserir o número do WhatsApp em script.js antes da publicação.");
      });
    }
  });
};

const setupReveal = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  document.querySelectorAll(".reveal").forEach((element) => {
    if (!element.classList.contains("reveal--immediate")) observer.observe(element);
  });
};

const setupHeader = () => {
  const header = document.querySelector("[data-header]");
  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 18);
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    const bar = document.querySelector(".progress");
    if (bar) bar.style.width = `${progress}%`;

    document.querySelectorAll("[data-parallax]").forEach((shape) => {
      const speed = Number(shape.dataset.parallax || 0);
      const base = shape.dataset.baseTransform && shape.dataset.baseTransform !== "none"
        ? `${shape.dataset.baseTransform} `
        : "";
      shape.style.transform = `${base}translate3d(0, ${window.scrollY * speed}px, 0)`;
    });
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
};

const setupTilt = () => {
  document.querySelectorAll(".tilt-card").forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      if (window.innerWidth < 900) return;
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * 8;
      const rotateX = (0.5 - py) * 8;
      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
};

window.addEventListener("load", () => {
  document.body.classList.add("loaded");
  bindWhatsAppLinks();
  setupReveal();
  setupHeader();
  setupTilt();
  setupGalleryStage();
});


const SOCIALIZANDO_STAGE_CHARACTERS = [
  {
    key: "lumy",
    name: "Lumy",
    skill: "Autoconsciência",
    message: "O que eu estou sentindo agora?",
    accent: "#31cd97",
    movement: "run",
    frames: {
      run: [
        "assets/anim/lumy-run-1.png",
        "assets/anim/lumy-run-2.png",
        "assets/anim/lumy-run-3.png",
        "assets/anim/lumy-run-4.png"
      ],
      jump: "assets/anim/lumy-jump.png",
      special: "assets/anim/lumy-special.png"
    }
  },
  {
    key: "viva",
    name: "Viva",
    skill: "Autogestão",
    message: "Como posso me acalmar?",
    accent: "#ff8a2a",
    movement: "jump",
    frames: {
      run: [
        "assets/anim/viva-run-1.png",
        "assets/anim/viva-run-2.png",
        "assets/anim/viva-run-3.png",
        "assets/anim/viva-run-4.png"
      ],
      jump: "assets/anim/viva-jump.png",
      special: "assets/anim/viva-special.png"
    }
  },
  {
    key: "solly",
    name: "Solly",
    skill: "Consciência social",
    message: "Como será que o outro se sente?",
    accent: "#ffc400",
    movement: "glide",
    frames: {
      run: [
        "assets/anim/solly-run-1.png",
        "assets/anim/solly-run-2.png",
        "assets/anim/solly-run-3.png",
        "assets/anim/solly-run-4.png"
      ],
      jump: "assets/anim/solly-float.png",
      special: "assets/anim/solly-special.png"
    }
  },
  {
    key: "conny",
    name: "Conny",
    skill: "Relacionamento",
    message: "Como posso me aproximar com gentileza?",
    accent: "#ff0b7a",
    movement: "jump",
    frames: {
      run: [
        "assets/anim/conny-run-1.png",
        "assets/anim/conny-run-2.png",
        "assets/anim/conny-run-3.png",
        "assets/anim/conny-run-4.png"
      ],
      jump: "assets/anim/conny-jump.png",
      special: "assets/anim/conny-special.png"
    }
  },
  {
    key: "neo",
    name: "Neo",
    skill: "Decisão responsável",
    message: "Qual é a melhor escolha agora?",
    accent: "#8c52ff",
    movement: "run",
    frames: {
      run: [
        "assets/anim/neo-run-1.png",
        "assets/anim/neo-run-2.png",
        "assets/anim/neo-run-3.png",
        "assets/anim/neo-run-4.png"
      ],
      jump: "assets/anim/neo-jump.png",
      special: "assets/anim/neo-special.png"
    }
  }
];

const setupGalleryStage = () => {
  const arena = document.querySelector('[data-stage]');
  const character = document.querySelector('[data-stage-character]');
  const bubble = document.querySelector('[data-stage-bubble]');
  const nameNode = document.querySelector('[data-stage-name]');
  const skillNode = document.querySelector('[data-stage-skill]');
  const messageNode = document.querySelector('[data-stage-message]');

  if (!arena || !character || !bubble || !nameNode || !skillNode || !messageNode) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let index = 0;
  let rafId = null;
  let holdTimeout = null;

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInCubic = (t) => t * t * t;
  const getRestX = () => Math.max(24, arena.clientWidth * 0.1);
  const getExitX = () => arena.clientWidth + Math.min(220, arena.clientWidth * 0.4);

  const animatePhase = (config) => {
    const restX = getRestX();
    const exitX = getExitX();
    const runFrames = config.frames.run;
    const enterDuration = config.movement === 'jump' ? 1500 : 1320;
    const displayDuration = 2800;
    const exitDuration = 980;
    const startX = -Math.min(220, arena.clientWidth * 0.34);
    const baseBottom = 0;

    bubble.classList.remove('is-visible');
    skillNode.textContent = config.skill;
    nameNode.textContent = config.name;
    messageNode.textContent = config.message;
    bubble.style.setProperty('--stage-accent', config.accent);
    arena.style.setProperty('--stage-accent', config.accent);
    character.alt = `${config.name}, personagem do Socializando`;

    let phase = 'enter';
    let phaseStart = performance.now();

    const frameLoop = (now) => {
      const elapsed = now - phaseStart;
      let x = restX;
      let y = 0;
      let frame = config.frames.special;

      if (phase === 'enter') {
        const progress = Math.min(elapsed / enterDuration, 1);
        const eased = easeOutCubic(progress);
        x = startX + (restX - startX) * eased;
        frame = runFrames[Math.floor((elapsed / 110) % runFrames.length)];

        if (config.movement === 'jump') {
          y = -Math.sin(progress * Math.PI) * 48;
          if (progress > 0.18 && progress < 0.82) frame = config.frames.jump;
        }
        if (config.movement === 'glide') {
          y = -Math.sin(progress * Math.PI) * 18;
          if (progress > 0.34 && progress < 0.74) frame = config.frames.jump;
        }
        if (progress >= 1) {
          phase = 'show';
          phaseStart = now;
          frame = config.frames.special;
          bubble.classList.add('is-visible');
        }
      } else if (phase === 'show') {
        const progress = Math.min(elapsed / displayDuration, 1);
        x = restX;
        y = -Math.sin(progress * Math.PI * 2) * 6;
        frame = config.frames.special;
        if (progress >= 1) {
          phase = 'exit';
          phaseStart = now;
          bubble.classList.remove('is-visible');
        }
      } else if (phase === 'exit') {
        const progress = Math.min(elapsed / exitDuration, 1);
        const eased = easeInCubic(progress);
        x = restX + (exitX - restX) * eased;
        y = 0;
        frame = runFrames[Math.floor((elapsed / 92) % runFrames.length)];
        if (progress >= 1) {
          cancelAnimationFrame(rafId);
          holdTimeout = window.setTimeout(() => {
            index = (index + 1) % SOCIALIZANDO_STAGE_CHARACTERS.length;
            animatePhase(SOCIALIZANDO_STAGE_CHARACTERS[index]);
          }, 220);
          return;
        }
      }

      character.src = frame;
      character.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      rafId = requestAnimationFrame(frameLoop);
    };

    cancelAnimationFrame(rafId);
    clearTimeout(holdTimeout);
    rafId = requestAnimationFrame(frameLoop);
  };

  // Reset positioning on resize between loops.
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      character.style.transform = 'translate3d(-180px, 0, 0)';
    }, 80);
  });

  animatePhase(SOCIALIZANDO_STAGE_CHARACTERS[index]);
};
