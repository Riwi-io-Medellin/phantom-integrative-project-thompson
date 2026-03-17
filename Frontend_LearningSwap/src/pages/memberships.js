import { getCurrentUser, isAuthenticated } from '../utils/auth.js';

// ─── Main Page Function ───────────────────────────────────────────────────────

export async function MembershipsPage() {
  const app = document.getElementById('app');

  // ── Auth guard: redirect to home if not logged in ──
  if (!isAuthenticated()) {
    const { HomePage } = await import('./home.js');
    HomePage();
    return;
  }

  // ── Cleanup any previous page listeners ──
  if (window.__swapsCleanup) {
    window.__swapsCleanup();
    window.__swapsCleanup = null;
  }
  if (window.__homeCleanup) {
    window.__homeCleanup();
    window.__homeCleanup = null;
  }

  // ── Page setup: classes, scroll, history ──
  document.body.classList.remove('auth-page', 'register-mode', 'profile-page');
  document.body.classList.add('swaps-page');
  document.body.style.overflow = '';
  window.scrollTo({ top: 0, behavior: 'auto' });
  window.history.replaceState(null, '', '#memberships');

  // ── Get current user info ──
  const user = getCurrentUser();
  const profileLabel = user?.first_name || user?.name || 'Viajero';

  // ─── Render HTML ─────────────────────────────────────────────────────────────

  app.innerHTML = `
    <main class="swaps-dashboard">
      <div class="dashboard-container">

        <!-- ── Sidebar navigation ── -->
        <aside class="sidebar">
          <button class="logo logo-button" type="button" data-nav-home aria-label="Ir al inicio">
            <img class="logo-dashboard" src="/assets/logos/logo.png" alt="logo learning swap" />
            <h2>Learning Swap</h2>
          </button>

          <nav class="nav-menu" aria-label="Navegación principal">
            <ul>
              <li>
                <button class="nav-menu-link" type="button" data-nav-home>
                  <ion-icon name="home-outline"></ion-icon>
                  <span>Home</span>
                </button>
              </li>
              <li>
                <button class="nav-menu-link" type="button" data-nav-profile>
                  <ion-icon name="person-circle-outline"></ion-icon>
                  <span>Profile</span>
                </button>
              </li>
              <li>
                <button class="nav-menu-link" type="button" data-nav-chats>
                  <ion-icon name="chatbubbles-outline"></ion-icon>
                  <span>Chats</span>
                </button>
              </li>
              <li>
                <button class="nav-menu-link" type="button" data-nav-matches>
                  <ion-icon name="people-circle-outline"></ion-icon>
                  <span>Matches</span>
                </button>
              </li>
              <li>
                <!-- Active state applied to current page -->
                <button class="nav-menu-link is-active" type="button" data-nav-memberships aria-current="page">
                  <ion-icon name="diamond-outline"></ion-icon>
                  <span>Membresías</span>
                </button>
              </li>
            </ul>
          </nav>

          <!-- Sidebar info card -->
          <div class="card-information">
            <p>learning swap information</p>
            <p>
              Desbloquea todo el potencial de Learning Swap con una membresía.
              Conecta con más personas, accede a salas exclusivas y mucho más.
            </p>
            <p>¡Elige el plan que mejor se adapte a ti!</p>
          </div>
        </aside>

        <!-- ── Main content area ── -->
        <section class="main-content">

          <!-- Top bar: search + user actions -->
          <header class="top-bar">
            <label class="search-bar" aria-label="search bar">
              <ion-icon name="search-outline"></ion-icon>
              <input type="text" placeholder="search..." />
            </label>

            <div class="user-actions">
              <span class="membership" aria-hidden="true"></span>
              <button class="icon-action" type="button" aria-label="Idioma">
                <ion-icon name="earth-outline"></ion-icon>
              </button>
              <button class="icon-action" type="button" data-nav-profile aria-label="Ir al perfil">
                <ion-icon name="person-circle-outline"></ion-icon>
              </button>
              <span class="user-chip">${escapeHtml(profileLabel)}</span>
            </div>
          </header>

          <!-- Hero banner with greeting and 3D slot -->
          <div class="prices-hero">
            <div class="prices-hero-copy">
              <p class="prices-hero-greeting">¡Hola, ${escapeHtml(profileLabel)}! </p>
              <h2 class="prices-hero-title">Escoge tu membresía</h2>
              <p class="prices-hero-sub">
                Lleva tu experiencia al siguiente nivel. Más matches, más chats, más aprendizaje.
              </p>
            </div>

            <!-- Reserved slot for a 3D model (e.g. Spline) -->
            <div class="prices-3d-slot" aria-hidden="true">
              <div class="prices-3d-glow"></div>
              <div class="prices-3d-ring prices-3d-ring--outer"></div>
              <div class="prices-3d-ring prices-3d-ring--inner"></div>
              <ion-icon name="diamond-outline" class="prices-3d-icon"></ion-icon>
            </div>
          </div>

          <!-- Billing toggle: monthly / annual -->
          <div class="prices-billing-toggle">
            <span class="prices-billing-opt prices-billing-opt--active" id="opt-monthly">Mensual</span>
            <button class="prices-toggle-btn" id="billing-toggle" type="button" aria-pressed="false" aria-label="Cambiar a anual">
              <span class="prices-toggle-thumb"></span>
            </button>
            <span class="prices-billing-opt" id="opt-annual">
              Anual <span class="prices-save-badge">–20%</span>
            </span>
          </div>

          <!-- ── Membership plan cards ── -->
          <div class="prices-cards-grid prices-cards-grid--4">

            <!-- Free plan -->
            <article class="prices-card">
              <div class="prices-card-top">
                <div class="prices-card-icon prices-card-icon--free">
                  <ion-icon name="leaf-outline"></ion-icon>
                </div>
                <h3 class="prices-card-name">Gratis</h3>
                <p class="prices-card-desc">Empieza a conectar sin costo.</p>
              </div>
              <div class="prices-card-price-wrap">
                <span class="prices-amount" data-monthly="0" data-annual="0">$0</span>
                <span class="prices-period">/ mes</span>
              </div>
              <ul class="prices-features">
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Hasta 2 matches</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Chat básico</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Feed de perfiles</li>
                <li class="prices-feature--off"><ion-icon name="close-circle-outline"></ion-icon> Salas exclusivas</li>
                <li class="prices-feature--off"><ion-icon name="close-circle-outline"></ion-icon> Soporte prioritario</li>
              </ul>
              <!-- No checkout redirect for free plan -->
              <button class="prices-cta-btn prices-cta-btn--ghost" type="button">Plan actual</button>
            </article>

            <!-- Emerald plan -->
            <article class="prices-card">
              <div class="prices-card-top">
                <div class="prices-card-icon prices-card-icon--emerald">
                  <ion-icon name="flower-outline"></ion-icon>
                </div>
                <h3 class="prices-card-name">Emerald</h3>
                <p class="prices-card-desc">Da el primer paso hacia más conexiones.</p>
              </div>
              <div class="prices-card-price-wrap">
                <!-- data-monthly and data-annual drive the toggle logic -->
                <span class="prices-amount" data-monthly="12000" data-annual="9600">$12.000</span>
                <span class="prices-period">/ mes</span>
              </div>
              <ul class="prices-features">
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Hasta 5 matches</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Chat avanzado</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Feed priorizado</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Salas exclusivas</li>
                <li class="prices-feature--off"><ion-icon name="close-circle-outline"></ion-icon> Soporte prioritario</li>
              </ul>
              <!-- data-plan and data-price are read on click to pass to checkout -->
              <button class="prices-cta-btn prices-cta-btn--emerald" type="button" data-plan="Emerald" data-price="$12.000">Obtener Emerald</button>
            </article>

            <!-- Ruby plan (featured / most popular) -->
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
                <span class="prices-amount" data-monthly="25000" data-annual="20000">$25.000</span>
                <span class="prices-period">/ mes</span>
              </div>
              <ul class="prices-features">
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Hasta 7 matches</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Chat avanzado</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Feed priorizado</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Salas exclusivas</li>
                <li class="prices-feature--off"><ion-icon name="close-circle-outline"></ion-icon> Soporte prioritario</li>
              </ul>
              <button class="prices-cta-btn prices-cta-btn--primary" type="button" data-plan="Ruby" data-price="$25.000">Obtener Ruby</button>
            </article>

            <!-- Diamond plan (top tier) -->
            <article class="prices-card prices-card--elite">
              <div class="prices-card-top">
                <div class="prices-card-icon prices-card-icon--elite">
                  <ion-icon name="diamond-outline"></ion-icon>
                </div>
                <h3 class="prices-card-name">Diamond</h3>
                <p class="prices-card-desc">La experiencia completa, sin límites.</p>
              </div>
              <div class="prices-card-price-wrap">
                <span class="prices-amount" data-monthly="35000" data-annual="28000">$35.000</span>
                <span class="prices-period">/ mes</span>
              </div>
              <ul class="prices-features">
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Matches ilimitados</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Todo lo de Ruby</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Soporte prioritario 24/7</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Perfil destacado</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Estadísticas avanzadas</li>
                <li><ion-icon name="checkmark-circle-outline"></ion-icon> Badge exclusivo</li>
              </ul>
              <button class="prices-cta-btn prices-cta-btn--elite" type="button" data-plan="Diamond" data-price="$35.000">Obtener Diamond</button>
            </article>

          </div>

          <!-- Footer disclaimer -->
          <p class="prices-footer-note">
            Todos los planes incluyen acceso seguro y pueden cancelarse en cualquier momento.
          </p>

        </section>
      </div>
    </main>
  `;

  // ─── Interactions Setup ───────────────────────────────────────────────────────

  const cleanups = [];

  // ── Helper: register click navigation for a selector → hash ──
  const registerNav = (selector, hash) => {
    document.querySelectorAll(selector).forEach((el) => {
      const handler = () => { window.location.hash = hash; };
      el.addEventListener('click', handler);
      cleanups.push(() => el.removeEventListener('click', handler));
    });
  };

  // ── Register all sidebar and top-bar navigation links ──
  registerNav('[data-nav-home]',        '#home');
  registerNav('[data-nav-profile]',     '#profile');
  registerNav('[data-nav-matches]',     '#swaps');
  registerNav('[data-nav-chats]',       '#chats');
  registerNav('[data-nav-memberships]', '#memberships');

  // ─── Billing Toggle Logic ─────────────────────────────────────────────────────

  const toggleBtn  = document.getElementById('billing-toggle');
  const optMonthly = document.getElementById('opt-monthly');
  const optAnnual  = document.getElementById('opt-annual');

  // Tracks whether annual billing is currently active
  let isAnnual = false;

  const updatePrices = () => {
    // Update displayed price text for each plan card
    document.querySelectorAll('.prices-amount').forEach((el) => {
      const value = isAnnual ? el.getAttribute('data-annual') : el.getAttribute('data-monthly');
      const num = parseFloat(value);
      el.textContent = num === 0 ? '$0' : '$' + num.toLocaleString('es-CO');
    });

    // Toggle active label styles
    optMonthly.classList.toggle('prices-billing-opt--active', !isAnnual);
    optAnnual.classList.toggle('prices-billing-opt--active',  isAnnual);
    toggleBtn.setAttribute('aria-pressed', isAnnual ? 'true' : 'false');
    toggleBtn.classList.toggle('prices-toggle-btn--on', isAnnual);

    // Sync data-price on each CTA button so checkout receives the correct amount
    document.querySelectorAll('.prices-cta-btn[data-plan]').forEach((btn) => {
      const card = btn.closest('.prices-card');
      const amountEl = card?.querySelector('.prices-amount');
      if (!amountEl) return;
      const raw = isAnnual
        ? amountEl.getAttribute('data-annual')
        : amountEl.getAttribute('data-monthly');
      const num = parseFloat(raw);
      btn.setAttribute('data-price', num === 0 ? '$0' : '$' + num.toLocaleString('es-CO'));
    });
  };

  // Toggle billing mode and refresh prices on each click
  const onToggle = () => { isAnnual = !isAnnual; updatePrices(); };
  toggleBtn.addEventListener('click', onToggle);
  cleanups.push(() => toggleBtn.removeEventListener('click', onToggle));

  // ─── Plan CTA Buttons → Checkout ─────────────────────────────────────────────

  document.querySelectorAll('.prices-cta-btn[data-plan]').forEach((btn) => {
    const handler = () => {
      // Pass selected plan, price and billing mode to the checkout page via sessionStorage
      const plan  = btn.getAttribute('data-plan');
      const price = btn.getAttribute('data-price');
      sessionStorage.setItem('checkout-plan',    plan);
      sessionStorage.setItem('checkout-price',   price);
      sessionStorage.setItem('checkout-billing', isAnnual ? 'annual' : 'monthly');
      window.location.hash = '#checkout';
    };
    btn.addEventListener('click', handler);
    cleanups.push(() => btn.removeEventListener('click', handler));
  });

  // ─── Cleanup Registration ─────────────────────────────────────────────────────

  // Called by the router when navigating away from this page
  window.__swapsCleanup = () => {
    cleanups.forEach((fn) => fn?.());
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

// Escapes HTML special characters to prevent XSS
function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}