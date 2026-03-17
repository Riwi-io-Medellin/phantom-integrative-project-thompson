import {
  getNavbar,
  setupNavbarAuthActions,
  setupNavbarSectionLinks,
} from '../components/navbar.js';

// ─── Main Page Entry Point ────────────────────────────────────────────────────
// HomePage renders the full landing page of the application.
// It accepts an optional initialSectionId to deep-link directly to a specific
// scene on load (e.g. HomePage('prices') scrolls straight to the plans section).
// The page is built as a cinematic full-screen scroll experience where each
// <section> occupies exactly one viewport height and transitions are controlled
// programmatically — not by native browser scroll.

export function HomePage(initialSectionId = null) {
  const app = document.getElementById('app');

  // Resolve the correct hash to push into browser history
  const homeHash = initialSectionId ? `#${initialSectionId}` : '#home';
  window.history.replaceState(null, '', homeHash);

  // ── Remove any page-specific body classes left by previous views ──
  document.body.classList.remove(
    'auth-page',
    'register-mode',
    'profile-page',
    'swaps-page'
  );

  // ── SPA cleanup: remove all event listeners registered by previous views ──
  // This prevents duplicate listeners when the home page is re-rendered
  if (window.__homeCleanup) {
    window.__homeCleanup();
    window.__homeCleanup = null;
  }

  if (window.__homeScrollHandler) {
    window.removeEventListener('scroll', window.__homeScrollHandler);
    window.__homeScrollHandler = null;
  }

  if (window.__swapsCleanup) {
    window.__swapsCleanup();
    window.__swapsCleanup = null;
  }

  // ─── Render HTML ──────────────────────────────────────────────────────────────
  // The landing page is divided into 6 full-screen scenes (sections):
  //   1. hero     — Main headline, description, CTAs and stats
  //   2. why      — Value proposition cards
  //   3. how      — Step-by-step explainer
  //   4. features — Platform feature list
  //   5. prices   — Membership plan cards with checkout redirect
  //   6. cta      — Final call-to-action to create an account

  app.innerHTML = `
    <section class="home">

      <!-- Navbar injected from shared component -->
      ${getNavbar()}

      <!-- ── Scene 1: Hero ── -->
      <!-- Main entry point of the landing page.
           Contains the headline, description, two CTA buttons,
           and three stat counters. Also renders a decorative banner image. -->
      <section class="hero" id="hero">
        <div class="hero-content">
          <h1>Comparte conocimiento, no identidad.</h1>

          <p class="hero-description">
            Únete a una comunidad global donde las personas intercambian habilidades con total privacidad.
            Enseña lo que sabes, aprende lo que te apasiona — con traducción en tiempo real
            para romper cualquier barrera.
          </p>

          <div class="hero-actions">
            <!-- btnStartLearning scrolls to the CTA scene -->
            <button class="btn primary" id="btnStartLearning">Comenzar a aprender</button>
            <!-- btnExploreSkills scrolls to the features scene -->
            <button class="btn secondary" id="btnExploreSkills">Explorar habilidades</button>
          </div>

          <!-- Quick stats shown below the CTA buttons -->
          <div class="hero-stats">
            <div>
              <strong>+1</strong>
              <span>Coincidencia</span>
            </div>
            <div>
              <strong>50+</strong>
              <span>Idiomas</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>Privado</span>
            </div>
          </div>
        </div>

        <!-- Decorative hero banner image -->
        <div class="hero-banner">
          <img class="logo-navbar" src="/assets/homeBanner.png" alt="portada" />
        </div>
      </section>

      <!-- ── Scene 2: Why Learning Swap ── -->
      <!-- Three value proposition cards explaining the core benefits of the platform -->
      <section class="why" id="why">
        <h2>¿Por qué Learning Swap?</h2>
        <p class="section-description">
          Una nueva forma de aprender conectando personas a través del conocimiento compartido.
        </p>

        <div class="why-cards">
          <div class="card">
            <h3>Intercambio de habilidades</h3>
            <p>Comparte lo que sabes y aprende lo que necesitas de personas reales.</p>
          </div>

          <div class="card">
            <h3>Impulsado por la comunidad</h3>
            <p>Aprende en conjunto mediante colaboración, mentoría y retroalimentación.</p>
          </div>

          <div class="card">
            <h3>Enfocado en el crecimiento</h3>
            <p>Desarrolla habilidades prácticas que te ayuden a crecer personal y profesionalmente.</p>
          </div>
        </div>
      </section>

      <!-- ── Scene 3: How It Works ── -->
      <!-- Three-step explainer showing the user journey from profile creation to connection -->
      <section class="how" id="how">
        <h2>Cómo funciona</h2>

        <div class="steps">
          <div class="step">
            <span>1</span>
            <h4>Crea tu perfil</h4>
            <p>Cuéntales a otros qué puedes enseñar y qué quieres aprender.</p>
          </div>

          <div class="step">
            <span>2</span>
            <h4>Ofrece o solicita habilidades</h4>
            <p>Encuentra personas que coincidan con tus objetivos de aprendizaje.</p>
          </div>

          <div class="step">
            <span>3</span>
            <h4>Conecta y aprende</h4>
            <p>Intercambia conocimiento mediante sesiones y colaboración.</p>
          </div>
        </div>
      </section>

      <!-- ── Scene 4: Platform Features ── -->
      <!-- Simple feature list summarizing what the platform offers -->
      <section class="features" id="features">
        <h2>Funciones de la plataforma</h2>

        <ul class="features-list">
          <li>Sistema de coincidencia de habilidades</li>
          <li>Sesiones de aprendizaje y mentoría</li>
          <li>Retroalimentación y reputación</li>
          <li>Interacción con la comunidad</li>
        </ul>
      </section>

      <!-- ── Scene 5: Membership Plans (Prices) ── -->
      <!-- Four plan cards: Free, Emerald, Ruby, Diamond.
           Clicking a paid plan button stores the plan in sessionStorage
           and redirects to the #checkout route.
           The scroll area allows internal scrolling of the cards
           before triggering the next scene transition. -->
      <section class="prices" id="prices">
        <div class="prices-scroll-area" aria-label="Planes de membresía">
          <div class="prices-cards-grid prices-cards-grid--4">

            <!-- Free plan: no checkout redirect, just a registration prompt -->
            <article class="prices-card">
              <div class="prices-card-top">
                <div class="prices-card-icon prices-card-icon--free">
                  <ion-icon name="leaf-outline"></ion-icon>
                </div>
                <h3 class="prices-card-name">Gratis</h3>
                <p class="prices-card-desc">Empieza a conectar sin costo.</p>
              </div>
              <div class="prices-card-price-wrap">
                <span class="prices-amount">$0</span>
                <span class="prices-period">/ mes</span>
              </div>
              <ul class="prices-features">
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> 2 intercambio por mes</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Apoyo de IA limitado</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Quiz semipersonalizado</li>
                <li class="prices-feature--off"><ion-icon name="close-circle-outline"></ion-icon> Salas exclusivas</li>
                <li class="prices-feature--off"><ion-icon name="close-circle-outline"></ion-icon> Soporte prioritario</li>
              </ul>
              <button class="prices-cta-btn prices-cta-btn--ghost" type="button">Registrate para iniciar</button>
            </article>

            <!-- Emerald plan: redirects to checkout with plan=Emerald -->
            <article class="prices-card">
              <div class="prices-card-top">
                <div class="prices-card-icon prices-card-icon--emerald">
                  <ion-icon name="flower-outline"></ion-icon>
                </div>
                <h3 class="prices-card-name">Emerald</h3>
                <p class="prices-card-desc">Da el primer paso hacia más conexiones.</p>
              </div>
              <div class="prices-card-price-wrap">
                <span class="prices-amount">$12.000</span>
                <span class="prices-period">/ mes</span>
              </div>
              <ul class="prices-features">
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> 3 intercambios por mes</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Ayuda de IA ilimitada</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Quiz personalizado</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Historial de aprendizaje</li>
                <li class="prices-feature--off"><ion-icon name="close-circle-outline"></ion-icon> Soporte prioritario</li>
              </ul>
              <!-- data-plan attribute is read by onHomePlanClick to pass the plan to checkout -->
              <button class="prices-cta-btn prices-cta-btn--emerald home-plan-btn" type="button" data-plan="Emerald">Registrate para iniciar</button>
            </article>

            <!-- Ruby plan: featured as most popular -->
            <article class="prices-card prices-card--featured">
              <div class="prices-card-badge">Más popular</div>
              <div class="prices-card-top">
                <div class="prices-card-icon prices-card-icon--ruby">
                  <ion-icon name="rose-outline"></ion-icon>
                </div>
                <h3 class="prices-card-name">Ruby</h3>
                <p class="prices-card-desc">Para quienes quieren crecer más rápido.</p>
              </div>
              <div class="prices-card-price-wrap">
                <span class="prices-amount">$25.000</span>
                <span class="prices-period">/ mes</span>
              </div>
              <ul class="prices-features">
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> 7 intercambios por mes</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Ayuda de IA ilimitada</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Recomendaciones inteligentes</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Grupos privados de aprendizaje</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Insignia de reputación</li>
              </ul>
              <button class="prices-cta-btn prices-cta-btn--primary home-plan-btn" type="button" data-plan="Ruby">Registrate para iniciar</button>
            </article>

            <!-- Diamond plan: top tier with all features -->
            <article class="prices-card prices-card--elite">
              <div class="prices-card-top">
                <div class="prices-card-icon prices-card-icon--elite">
                  <ion-icon name="diamond-outline"></ion-icon>
                </div>
                <h3 class="prices-card-name">Diamond</h3>
                <p class="prices-card-desc">La experiencia completa, sin límites.</p>
              </div>
              <div class="prices-card-price-wrap">
                <span class="prices-amount">$35.000</span>
                <span class="prices-period">/ mes</span>
              </div>
              <ul class="prices-features">
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Matches ilimitados</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Ayuda de IA ilimitada</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Certificado digital</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Soporte prioritario 24/7</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Monetización de contenido</li>
              </ul>
              <button class="prices-cta-btn prices-cta-btn--elite home-plan-btn" type="button" data-plan="Diamond">Registrate para iniciar</button>
            </article>

          </div>
        </div>
      </section>

      <!-- ── Scene 6: Call to Action ── -->
      <!-- Final prompt encouraging users to create an account -->
      <section class="cta" id="cta">
        <h2>¿Listo para empezar a intercambiar conocimiento?</h2>
        <button class="btn primary" id="btnCreateAccount">Crea tu cuenta</button>
      </section>

      <!-- Scroll hint shown on the first load to guide the user -->
      <p class="home-scroll-hint" aria-hidden="true">
        Desliza hacia abajo
        <ion-icon name="chevron-down-outline"></ion-icon>
      </p>

    </main>
  `;

  // ─── Mobile Navigation ────────────────────────────────────────────────────────
  // Toggles the mobile menu open/closed and closes it when a link is tapped

  const navToggle = document.getElementById('navToggle');
  const navMobile = document.getElementById('navMobile');
  const navHeader = document.querySelector('.navbar');
  const scrollSpace = document.getElementById('scroll-space');

  const closeMobileMenu = () => {
    navMobile?.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
  };

  navToggle?.addEventListener('click', () => {
    const isOpen = navMobile?.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(Boolean(isOpen)));
  });

  // Close the mobile menu when any nav link inside it is tapped
  navMobile?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMobileMenu);
  });

  // ─── Auth Navigation Helpers ─────────────────────────────────────────────────
  // Lazy-import the login page and render it in login or register mode

  const goLogin = async () => {
    const { LoginPage } = await import('./login.js');
    LoginPage('login');
  };

  const goSignup = async () => {
    const { LoginPage } = await import('./login.js');
    LoginPage('register');
  };

  // Setup shared navbar auth actions (login/signup button handlers in the navbar component)
  setupNavbarAuthActions();
  setupNavbarSectionLinks();

  // Wire up all login and signup entry points across desktop and mobile navbar
  document.getElementById('btnLogin')?.addEventListener('click', goLogin);
  document.getElementById('btnLoginMobile')?.addEventListener('click', goLogin);
  document.getElementById('btnSignup')?.addEventListener('click', goSignup);
  document.getElementById('btnSignupMobile')?.addEventListener('click', goSignup);
  document.getElementById('btnCreateAccount')?.addEventListener('click', goSignup);

  // ─── Cinematic Scroll Engine ──────────────────────────────────────────────────
  // The home page uses a full-screen scene-based scroll system.
  // Each <section> inside .home occupies exactly 100vh.
  // The scroll-space div is expanded to match the total scene height,
  // which allows the native scroll position to be tracked and mapped to scenes.
  // Scene transitions are throttled with a cooldown timer to prevent rapid skipping.

  const scenes = Array.from(document.querySelectorAll('.home section'));

  // Mark the first scene as active on initial render
  if (scenes.length) scenes[0].classList.add('active');

  // Expand the scroll-space element so the page has native scroll height
  if (scrollSpace) {
    scrollSpace.style.height = `${Math.max(scenes.length, 1) * 100}vh`;
  }

  // Build a map of scene id → index for quick lookup by nav links and deep links
  const sceneIndexById = new Map(
    scenes.map((scene, index) => [scene.id, index])
  );

  // Determine the starting scene: use deep-link section or derive from scroll position
  const requestedScene = initialSectionId
    ? sceneIndexById.get(initialSectionId)
    : undefined;

  let currentScene =
    requestedScene !== undefined
      ? requestedScene
      : Math.max(
          0,
          Math.min(
            scenes.length - 1,
            Math.round(window.scrollY / window.innerHeight)
          )
        );

  // Reference to the prices scroll area — used for internal scroll detection
  const pricesScrollArea = document.querySelector('.prices-scroll-area');

  let isSceneTransitioning = false;
  let sceneTransitionTimer = null;

  // Applies the 'active' class only to the scene at the given index
  const setActiveScene = (index) => {
    scenes.forEach((scene, sceneIndex) => {
      scene.classList.toggle('active', sceneIndex === index);
    });
  };

  // Scrolls the window to a target scene and activates it
  const goToScene = (targetIndex, behavior = 'smooth') => {
    const safeIndex = Math.max(0, Math.min(scenes.length - 1, targetIndex));
    currentScene = safeIndex;
    window.scrollTo({
      top: safeIndex * window.innerHeight,
      behavior,
    });
    setActiveScene(safeIndex);
  };

  // Moves to the next or previous scene with a transition cooldown
  const transitionTo = (direction) => {
    if (isSceneTransitioning || !scenes.length) return;

    const nextScene = Math.max(
      0,
      Math.min(scenes.length - 1, currentScene + direction)
    );

    if (nextScene === currentScene) return;

    isSceneTransitioning = true;
    goToScene(nextScene);

    // Cooldown prevents rapid multi-scene skipping during fast scroll events
    if (sceneTransitionTimer) clearTimeout(sceneTransitionTimer);
    sceneTransitionTimer = setTimeout(() => {
      isSceneTransitioning = false;
    }, 650);
  };

  // ─── Prices Scroll Area Detection ────────────────────────────────────────────
  // When the user is inside the .prices-scroll-area, mouse wheel events scroll
  // the cards container internally instead of triggering a scene transition.
  // The scene transition only fires when the container has reached its scroll limit.

  // Returns the prices scroll container if the wheel event originated inside it
  // and the container has overflow content to scroll, otherwise returns null
  const resolveWheelScrollableContainer = (target) => {
    if (!pricesScrollArea || !(target instanceof Element)) return null;

    const matchedContainer = target.closest('.prices-scroll-area');
    if (!matchedContainer) return null;

    // Only treat as scrollable if there is actual overflow content
    if (pricesScrollArea.scrollHeight <= pricesScrollArea.clientHeight + 1) return null;

    return pricesScrollArea;
  };

  // Returns true if the container can still scroll in the given direction
  const canScrollContainerByDelta = (container, deltaY) => {
    if (!container || !deltaY) return false;

    if (deltaY > 0) {
      return container.scrollTop + container.clientHeight < container.scrollHeight - 1;
    }

    return container.scrollTop > 1;
  };

  // ─── Event Handlers ───────────────────────────────────────────────────────────

  // Sync the active scene state with the native scroll position
  const onScroll = () => {
    const index = Math.min(
      scenes.length - 1,
      Math.max(0, Math.round(window.scrollY / window.innerHeight))
    );

    currentScene = index;

    // Add 'scrolled' class to navbar after the user scrolls past the top
    navHeader?.classList.toggle('scrolled', window.scrollY > 12);

    setActiveScene(index);
  };

  // Intercepts mouse wheel events to control scene transitions
  // If the wheel event is inside a scrollable container, delegates scroll to it
  const onWheel = (event) => {
    if (Math.abs(event.deltaY) < 8) return;

    const scrollableContainer = resolveWheelScrollableContainer(event.target);
    if (canScrollContainerByDelta(scrollableContainer, event.deltaY)) {
      event.preventDefault();
      scrollableContainer.scrollTop += event.deltaY;
      return;
    }

    event.preventDefault();
    transitionTo(event.deltaY > 0 ? 1 : -1);
  };

  // Keyboard navigation: arrow keys, Page Up/Down, and Space trigger scene transitions
  const onKeyDown = (event) => {
    const activeTag = document.activeElement?.tagName;

    // Skip if the user is typing in a form field
    if (
      activeTag === 'INPUT' ||
      activeTag === 'TEXTAREA' ||
      document.activeElement?.isContentEditable
    ) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
      event.preventDefault();
      transitionTo(1);
    }

    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault();
      transitionTo(-1);
    }
  };

  // On window resize, snap to the current scene without animation to reposition correctly
  const onResize = () => {
    goToScene(currentScene, 'auto');
  };

  // Handles clicks on navbar anchor links — maps href to scene index and navigates
  const onNavLinkClick = (event) => {
    const href = event.currentTarget.getAttribute('href');
    if (!href?.startsWith('#')) return;

    const targetId = href.slice(1);
    const targetIndex = sceneIndexById.get(targetId);
    if (targetIndex === undefined) return;

    event.preventDefault();
    closeMobileMenu();
    goToScene(targetIndex);
  };

  // ─── CTA Button Navigation ────────────────────────────────────────────────────

  // "Start learning" scrolls to the CTA scene (last scene)
  document.getElementById('btnStartLearning')?.addEventListener('click', () => {
    const targetIndex = sceneIndexById.get('cta');
    if (targetIndex !== undefined) goToScene(targetIndex);
  });

  // "Explore skills" scrolls to the features scene
  document.getElementById('btnExploreSkills')?.addEventListener('click', () => {
    const targetIndex = sceneIndexById.get('features');
    if (targetIndex !== undefined) goToScene(targetIndex);
  });

  // ─── Plan Card Checkout Redirect ─────────────────────────────────────────────
  // When a paid plan button is clicked on the home page, the selected plan and
  // its price are stored in sessionStorage so the checkout page can preselect them.
  // The user is then redirected to #checkout via hash navigation.

  const planPrices = {
    Emerald: '$12.000',
    Ruby:    '$25.000',
    Diamond: '$35.000',
  };

  const homePlanButtons = Array.from(
    document.querySelectorAll('.home-plan-btn[data-plan]')
  );

  const onHomePlanClick = (event) => {
    const clickedButton = event.currentTarget;
    const plan = clickedButton?.getAttribute('data-plan');
    if (!plan) return;

    // Pass plan details to the checkout page via sessionStorage
    sessionStorage.setItem('checkout-plan',    plan);
    sessionStorage.setItem('checkout-price',   planPrices[plan] || '');
    sessionStorage.setItem('checkout-billing', 'monthly');
    window.location.hash = '#checkout';
  };

  // ─── Register All Event Listeners ────────────────────────────────────────────

  const navLinks = [
    ...document.querySelectorAll('.navbar-links .nav-link'),
    ...document.querySelectorAll('.navbar-mobile .nav-link'),
  ];

  navLinks.forEach((link) => {
    link.addEventListener('click', onNavLinkClick);
  });

  homePlanButtons.forEach((button) => {
    button.addEventListener('click', onHomePlanClick);
  });

  // Wheel event must be non-passive to allow preventDefault inside the handler
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);

  // Store the scroll handler reference so it can be removed on cleanup
  window.__homeScrollHandler = onScroll;
  window.addEventListener('scroll', onScroll);

  // Snap to the correct starting scene on initial render
  goToScene(currentScene, 'auto');

  // Sync the active state immediately on load without waiting for a scroll event
  onScroll();

  // ─── Cleanup Registration ─────────────────────────────────────────────────────
  // Stores a cleanup function on window.__homeCleanup.
  // Called by any other page before it renders to prevent listener leaks.

  window.__homeCleanup = () => {
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onScroll);

    if (sceneTransitionTimer) {
      clearTimeout(sceneTransitionTimer);
      sceneTransitionTimer = null;
    }

    // Remove nav link click handlers
    navLinks.forEach((link) => {
      link.removeEventListener('click', onNavLinkClick);
    });

    // Remove plan button click handlers
    homePlanButtons.forEach((button) => {
      button.removeEventListener('click', onHomePlanClick);
    });
  };
}