/**
 * Login Page Component
 * Renders the login / register forms and connects to the real API.
 */

import {
  getNavbar,
  setupNavbarAuthActions,
  setupNavbarBurger,
  setupNavbarSectionLinks,
} from '../components/navbar.js';
import {
  clearError,
  escapeHtml,
  normalizeSkill,
} from './login/helpers.js';
import {
  handleLoginRequest,
  handleRegisterRequest,
  handleSkillsSubmitRequest,
} from './login/auth-handlers.js';
import { initializeAuthToggle, setupAuthNavbar } from './login/ui.js';

// ─── Register State Factory ───────────────────────────────────────────────────
// Creates a fresh registration state object used across the two-step register flow.
// Step 1: account info (name, email, password, phone)
// Step 2: skill selection (what the user wants to learn and teach)
// This factory is called on every LoginPage render to prevent stale state
// from a previous session leaking into a new form render.

const createRegisterState = () => ({
  step: 1,         // Current step of the multi-step register form (1 or 2)
  userId: null,    // Set after a successful step-1 API call, used in step 2
  learnSkills: [], // Skills the user wants to learn
  teachSkills: [], // Skills the user can teach
  email: '',       // Captured from step 1 for reuse if needed
  password: '',    // Captured from step 1 for reuse if needed
});

// Module-level state reset on each page render
let registerState = createRegisterState();

// ─── Main Page Entry Point ────────────────────────────────────────────────────
// LoginPage renders the combined login and register form panel.
// It accepts a `mode` parameter ('login' | 'register') to control
// which panel is shown on initial render.
// The page uses a CSS toggle class on .container to animate between the two forms.

export function LoginPage(mode = 'login') {
  const app = document.getElementById('app');

  // ── Cleanup listeners from any previously rendered view ──
  if (window.__homeCleanup) {
    window.__homeCleanup();
    window.__homeCleanup = null;
  }

  if (window.__homeScrollHandler) {
    window.removeEventListener('scroll', window.__homeScrollHandler);
    window.__homeScrollHandler = null;
  }

  // Reset the register state every time the page is mounted
  registerState = createRegisterState();

  // ── Apply auth-specific body classes ──
  document.body.classList.remove('register-mode');
  document.body.classList.add('auth-page');
  window.scrollTo({ top: 0, behavior: 'auto' });

  // ─── Render HTML ──────────────────────────────────────────────────────────────
  // The auth page layout consists of three panels inside a shared .container:
  //   1. Login form (.sign-in)        — email + password fields
  //   2. Register form (.sign-up)     — two-step form with account info and skills
  //   3. Welcome panel (.container-welcome) — toggle buttons that switch between forms
  // The CSS class 'toggle' on .container animates the panel transition.

  const template = `
    ${getNavbar()}
    <div class="auth-wrapper">
        <div class="container">

            <!-- ── Login Form ── -->
            <!-- Handles email/password authentication via the API -->
            <div class="container-form">
                <form class="sign-in" id="form-sign-in">
                  <h2>Iniciar sesión</h2>

                    <!-- Decorative icons (not functional social login) -->
                    <div class="social-networks">
                        <ion-icon name="accessibility-outline"></ion-icon>
                        <ion-icon name="swap-horizontal-outline"></ion-icon>
                    </div>

                    <span>usa tu correo y contraseña</span>

                    <!-- Email input -->
                    <div class="container-input">
                        <ion-icon name="mail-outline"></ion-icon>
                        <input type="email" id="login-email" placeholder="youremail@gmail.com" required>
                    </div>

                    <!-- Password input -->
                    <div class="container-input">
                        <ion-icon name="lock-closed-outline"></ion-icon>
                        <input type="password" id="login-password" placeholder="•••••••" required>
                    </div>

                    <!-- Error message container, filled by handleLoginRequest on failure -->
                    <div class="form-error" id="login-error"></div>

                    <button type="submit" class="button-logIn">Iniciar sesión</button>
                </form>
            </div>

            <!-- ── Register Form ── -->
            <!-- Two-step multi-part form:
                 Step 1: Basic account info (name, email, password, phone)
                 Step 2: Skill selection (learn and teach chips) -->
            <div class="container-form">
                <form class="sign-up" id="form-sign-up">
                  <h2>Registrarse</h2>

                    <div class="social-networks">
                        <ion-icon name="accessibility-outline"></ion-icon>
                        <ion-icon name="swap-horizontal-outline"></ion-icon>
                    </div>

                    <span>completa tus datos y luego agrega tus habilidades.</span>

                    <!-- ── Step 1: Account Information ── -->
                    <!-- Active by default. Shown when registerState.step === 1 -->
                    <div class="register-step register-step--active" id="register-step-account">
                      <div class="register-step-header">
                        <span class="register-step-badge">Paso 1</span>
                        <p>Crea tu cuenta con tu información básica.</p>
                      </div>
                      <div class="register-fields-grid">
                        <div class="container-input">
                            <ion-icon name="person-circle-outline"></ion-icon>
                            <input type="text" id="register-firstname" placeholder="Nombre" required>
                        </div>
                        <div class="container-input">
                            <ion-icon name="person-circle-outline"></ion-icon>
                            <input type="text" id="register-lastname" placeholder="Apellido" required>
                        </div>
                        <div class="container-input">
                            <ion-icon name="mail-outline"></ion-icon>
                            <input type="email" id="register-email" placeholder="youremail@gmail.com" required>
                        </div>
                        <div class="container-input">
                            <ion-icon name="lock-closed-outline"></ion-icon>
                            <input type="password" id="register-password" placeholder="••••••••" required>
                        </div>
                        <div class="container-input">
                            <ion-icon name="call-outline"></ion-icon>
                            <input type="tel" id="register-phone" placeholder="Tu número de teléfono" required>
                        </div>
                      </div>
                    </div>

                    <!-- ── Step 2: Skill Selection ── -->
                    <!-- Hidden until step 1 is completed and the API call succeeds -->
                    <div class="register-step" id="register-step-skills">
                      <div class="register-step-header">
                        <span class="register-step-badge">Paso 2</span>
                        <p>Agrega las habilidades que quieres aprender y enseñar.</p>
                      </div>

                      <div class="register-skills-grid">

                        <!-- Learn skills: chips added via input or Enter key -->
                        <div class="skill-group">
                          <label for="register-learn-skill">Quiero aprender</label>
                          <div class="skill-input-row">
                            <div class="container-input container-input--skill">
                                <ion-icon name="book-outline"></ion-icon>
                                <input type="text" id="register-learn-skill" placeholder="Ej: Inglés">
                            </div>
                            <button type="button" class="button-skill-add" data-skill-target="learn">Agregar</button>
                          </div>
                          <!-- Dynamic chip list rendered by renderSkillTags('learn') -->
                          <div class="skills-chip-list" id="register-learn-list"></div>
                        </div>

                        <!-- Teach skills: same pattern as learn skills -->
                        <div class="skill-group">
                          <label for="register-teach-skill">Puedo enseñar</label>
                          <div class="skill-input-row">
                            <div class="container-input container-input--skill">
                                <ion-icon name="bulb-outline"></ion-icon>
                                <input type="text" id="register-teach-skill" placeholder="Ej: Programación">
                            </div>
                            <button type="button" class="button-skill-add button-skill-add--teach" data-skill-target="teach">Agregar</button>
                          </div>
                          <div class="skills-chip-list" id="register-teach-list"></div>
                        </div>
                      </div>

                      <p class="register-step-note">Presiona Enter o usa el botón agregar para guardar cada habilidad.</p>
                    </div>

                    <!-- Shared error message for both steps -->
                    <div class="form-error" id="register-error"></div>

                    <!-- Step navigation buttons:
                         - register-next: visible in step 1, triggers API call to create account
                         - register-back: visible in step 2, returns to step 1
                         - register-submit: visible in step 2, saves skills and completes registration -->
                    <div class="register-actions">
                      <button type="button" class="button-register button-register-secondary" id="register-back" hidden>Volver</button>
                      <button type="button" class="button-register" id="register-next">Continuar</button>
                      <button type="submit" class="button-register" id="register-submit" hidden>Guardar habilidades</button>
                    </div>
                </form>
            </div>

            <!-- ── Welcome / Toggle Panel ── -->
            <!-- Contains the buttons that switch between the login and register forms.
                 The .welcome-sign-up panel shows when the login form is active,
                 and .welcome-sign-in shows when the register form is active. -->
            <div class="container-welcome">
                <div class="welcome-sign-up welcome">
                  <h3>¡Bienvenido de nuevo!</h3>
                  <p>te damos la bienvenida al nuevo mundo que te espera, ingresa tu información personal</p>
                  <button type="button" class="button-signup" id="btn-sign-up">Registrarse</button>
                </div>
                <div class="welcome-sign-in welcome">
                  <h3>¡Bienvenido!</h3>
                  <p>qué bueno verte de nuevo, inicia sesión con tu información personal</p>
                  <button type="button" class="button-star" id="btn-sign-in">Iniciar sesión</button>
                </div>
            </div>
        </div>
    </div>
    `;

  app.innerHTML = template;

  // ── If caller requested register mode, activate the toggle immediately ──
  // Adds the CSS 'toggle' class that animates the panel to show the register form
  if (mode === 'register') {
    const container = document.querySelector('.container');
    if (container) container.classList.add('toggle');
    document.body.classList.add('register-mode');
  }

  // ─── Initialize All Interactions ─────────────────────────────────────────────

  // Setup navbar logo and link behavior specific to the auth page
  setupAuthNavbar();
  setupNavbarBurger();
  setupNavbarAuthActions();
  setupNavbarSectionLinks();

  // Initialize the toggle animation between login and register panels
  initializeAuthToggle();

  // Attach form submission and skill input handlers
  setupFormHandlers();
}

// ─── Form Handlers Setup ──────────────────────────────────────────────────────
// Attaches all event listeners to the login form, register form,
// step navigation buttons, and skill inputs.

function setupFormHandlers() {
  const loginForm    = document.getElementById('form-sign-in');
  const registerForm = document.getElementById('form-sign-up');
  const nextBtn      = document.getElementById('register-next');
  const backBtn      = document.getElementById('register-back');

  // ── Login form submit: calls the login API handler ──
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleLoginRequest();
    });
  }

  // ── Register form submit (step 2): captures any pending skill input,
  //    then saves skills to the API via handleSkillsSubmitRequest ──
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      capturePendingSkillsFromInputs();
      await handleSkillsSubmitRequest(registerState);
    });
  }

  // ── "Continue" button (step 1 → step 2): validates fields and calls
  //    handleRegisterRequest which creates the account via the API ──
  nextBtn?.addEventListener('click', async () => {
    await handleRegisterRequest(registerState, showRegisterStep);
  });

  // ── "Back" button (step 2 → step 1): resets to the account info step ──
  backBtn?.addEventListener('click', () => {
    showRegisterStep(1);
  });

  // Setup skill input interactions and render initial empty state
  setupSkillInputs();
  renderSkillTags('learn');
  renderSkillTags('teach');
}

// ─── Skill Input Setup ────────────────────────────────────────────────────────
// Enables skill inputs (ensuring they are not disabled from a previous render),
// registers click handlers for the add buttons,
// and registers Enter key handlers for quick skill addition.

function setupSkillInputs() {
  const learnInput = document.getElementById('register-learn-skill');
  const teachInput = document.getElementById('register-teach-skill');

  // Ensure inputs are interactive
  [learnInput, teachInput].forEach((input) => {
    if (!input) return;
    input.disabled = false;
    input.readOnly = false;
  });

  // Clicking the wrapper focuses the inner input
  document.querySelectorAll('.container-input--skill').forEach((wrapper) => {
    wrapper.addEventListener('click', () => {
      const input = wrapper.querySelector('input');
      input?.focus();
    });
  });

  // "Add" button click: reads data-skill-target to determine learn or teach
  document.querySelectorAll('[data-skill-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.skillTarget;
      addSkill(target);
    });
  });

  // Enter key in learn input adds the skill without submitting the form
  learnInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addSkill('learn');
    }
  });

  // Enter key in teach input adds the skill without submitting the form
  teachInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addSkill('teach');
    }
  });
}

// ─── Add Skill ────────────────────────────────────────────────────────────────
// Reads the value from the corresponding input, normalizes it,
// checks for duplicates, pushes it to the registerState array,
// re-renders the chip list, and clears the input.

function addSkill(target) {
  const input = document.getElementById(
    target === 'learn' ? 'register-learn-skill' : 'register-teach-skill'
  );
  const value = normalizeSkill(input?.value || '');

  if (!value) return;

  const key = target === 'learn' ? 'learnSkills' : 'teachSkills';

  // Prevent duplicate entries (case-insensitive comparison)
  const alreadyExists = registerState[key].some(
    (skill) => skill.toLowerCase() === value.toLowerCase()
  );

  if (!alreadyExists) {
    registerState[key].push(value);
    renderSkillTags(target);
  }

  input.value = '';
  input.focus();
}

// ─── Capture Pending Skills ───────────────────────────────────────────────────
// Before submitting step 2, this function reads any text still typed
// in the skill inputs (not yet added via button or Enter) and adds them.
// This prevents the user from losing a skill they typed but forgot to confirm.

function capturePendingSkillsFromInputs() {
  ['learn', 'teach'].forEach((target) => {
    const input = document.getElementById(
      target === 'learn' ? 'register-learn-skill' : 'register-teach-skill'
    );

    if (!input) return;

    const pendingValue = normalizeSkill(input.value || '');
    if (!pendingValue) return;

    addSkill(target);
  });
}

// ─── Remove Skill ─────────────────────────────────────────────────────────────
// Removes a skill at a given index from the state array and re-renders the chips.

function removeSkill(target, index) {
  const key = target === 'learn' ? 'learnSkills' : 'teachSkills';
  registerState[key] = registerState[key].filter(
    (_, itemIndex) => itemIndex !== index
  );
  renderSkillTags(target);
}

// ─── Render Skill Tags ────────────────────────────────────────────────────────
// Renders the current skill list for a given target ('learn' | 'teach')
// as interactive chip elements with individual remove buttons.
// Shows an empty state message when no skills have been added yet.

function renderSkillTags(target) {
  const list = document.getElementById(
    target === 'learn' ? 'register-learn-list' : 'register-teach-list'
  );

  if (!list) return;

  const items =
    target === 'learn' ? registerState.learnSkills : registerState.teachSkills;

  // Empty state: shown when the skill array has no entries
  if (!items.length) {
    list.innerHTML = `
      <span class="skill-empty-state">
        ${target === 'learn' ? 'Aún no agregas habilidades para aprender.' : 'Aún no agregas habilidades para enseñar.'}
      </span>
    `;
    return;
  }

  // Render each skill as a chip with a remove button
  list.innerHTML = items
    .map(
      (skill, index) => `
        <span class="skill-chip ${target === 'teach' ? 'skill-chip--teach' : ''}">
          ${escapeHtml(skill)}
          <button
            type="button"
            class="skill-chip-remove"
            data-skill-remove="${target}"
            data-skill-index="${index}"
            aria-label="Eliminar ${escapeHtml(skill)}"
          >
            <ion-icon name="close-outline"></ion-icon>
          </button>
        </span>
      `
    )
    .join('');

  // Attach remove handlers to each chip's close button
  list.querySelectorAll('[data-skill-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      removeSkill(
        button.dataset.skillRemove,
        Number(button.dataset.skillIndex)
      );
    });
  });
}

// ─── Show Register Step ───────────────────────────────────────────────────────
// Controls which step of the registration form is visible.
// Toggles the 'register-step--active' class and shows/hides
// the navigation buttons (next, back, submit) based on the current step.
// Also focuses the learn skill input when transitioning to step 2.

function showRegisterStep(step) {
  registerState.step = step;

  const accountStep = document.getElementById('register-step-account');
  const skillsStep  = document.getElementById('register-step-skills');
  const nextBtn     = document.getElementById('register-next');
  const backBtn     = document.getElementById('register-back');
  const submitBtn   = document.getElementById('register-submit');
  const errorEl     = document.getElementById('register-error');

  // Toggle active class based on current step
  accountStep?.classList.toggle('register-step--active', step === 1);
  skillsStep?.classList.toggle('register-step--active', step === 2);

  // Show/hide navigation buttons based on step
  if (nextBtn)   nextBtn.hidden   = step !== 1;
  if (backBtn)   backBtn.hidden   = step !== 2;
  if (submitBtn) submitBtn.hidden = step !== 2;

  // When entering step 2, ensure inputs are enabled and focus the first one
  if (step === 2) {
    const learnInput = document.getElementById('register-learn-skill');
    const teachInput = document.getElementById('register-teach-skill');

    [learnInput, teachInput].forEach((input) => {
      if (!input) return;
      input.disabled = false;
      input.readOnly = false;
    });

    // Defer focus to next tick to ensure the step is visible before focusing
    setTimeout(() => {
      learnInput?.focus();
    }, 0);
  }

  // Clear any error message when switching steps
  clearError(errorEl);
}