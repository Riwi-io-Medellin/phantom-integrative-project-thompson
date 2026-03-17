export function setupAuthNavbar() {
  const logoLink = document.querySelector('.navbar-brand');
  if (logoLink) {
    logoLink.addEventListener('click', async (e) => {
      e.preventDefault();
      document.body.classList.remove('auth-page', 'register-mode');
      const { HomePage } = await import('../home.js');
      HomePage();
    });
  }

  const navAction = async (targetMode) => {
    document.body.classList.remove('auth-page', 'register-mode');
    const { LoginPage } = await import('../login.js');
    LoginPage(targetMode);
  };

  ['btnLogin', 'btnLoginMobile'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        navAction('login');
      });
    }
  });

  ['btnSignup', 'btnSignupMobile'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        navAction('register');
      });
    }
  });
}

export function initializeAuthToggle() {
  const container = document.querySelector('.container');
  const btnSignUp = document.getElementById('btn-sign-up');
  const btnSignIn = document.getElementById('btn-sign-in');

  if (btnSignUp) {
    btnSignUp.addEventListener('click', () => {
      container.classList.add('toggle');
      document.body.classList.add('register-mode');
    });
  }

  if (btnSignIn) {
    btnSignIn.addEventListener('click', () => {
      container.classList.remove('toggle');
      document.body.classList.remove('register-mode');
    });
  }
}
