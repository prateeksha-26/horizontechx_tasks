function showError(message) {
  const box = document.getElementById('error-box');
  box.innerHTML = `<div class="error-box">${escapeHtml(message)}</div>`;
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get('next') === 'checkout' ? '/orders.html?checkout=1' : '/index.html';
    } catch (err) {
      showError(err.message);
    }
  });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
      window.location.href = '/index.html';
    } catch (err) {
      showError(err.message);
    }
  });
}
