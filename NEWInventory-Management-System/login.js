
function toggleForm(formId) {
    document.querySelectorAll('.form-box').forEach(box => box.classList.remove('active'));
    document.getElementById(formId).classList.add('active');
    clearMessages();
}

function clearMessages() {
    document.querySelectorAll('.form-msg').forEach(el => {
        el.textContent = '';
        el.className   = 'form-msg';
    });
}

function showMsg(id, text, isError = true) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className   = 'form-msg ' + (isError ? 'error' : 'success');
}

// ── Real-time Password Match (Signup) ─────────────────
const p1  = document.getElementById('s-pass');
const p2  = document.getElementById('s-confirm');
const msg = document.getElementById('match-msg');

p2.oninput = () => {
    if (p1.value === p2.value) {
        msg.textContent = '✓ Passwords match';
        msg.style.color = 'var(--success)';
    } else {
        msg.textContent = '✗ Passwords do not match';
        msg.style.color = 'var(--error)';
    }
};

// LOGIN Form Submit 
document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();

    const email    = e.target.querySelector('input[type="email"]').value.trim();
    const password = e.target.querySelector('input[type="password"]').value.trim();
    const btn      = e.target.querySelector('button[type="submit"]');

    btn.disabled   = true;
    btn.textContent = 'Signing in…';

    const formData = new FormData();
    formData.append('email',    email);
    formData.append('password', password);

    try {
        const res  = await fetch('api/login.php', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            showMsg('login-msg', '✓ Login successful! Redirecting…', false);
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 800);
        } else {
            showMsg('login-msg', data.message || 'Login failed.', true);
            btn.disabled    = false;
            btn.textContent = 'Sign in';
        }
    } catch (err) {
        showMsg('login-msg', 'Server error. Make sure XAMPP is running.', true);
        btn.disabled    = false;
        btn.textContent = 'Sign in';
    }
};

// SIGNUP Form Submit 
document.getElementById('signupForm').onsubmit = async (e) => {
    e.preventDefault();

    if (p1.value !== p2.value) {
        showMsg('signup-msg', 'Passwords do not match!', true);
        return;
    }

    const name     = e.target.querySelector('input[type="text"]').value.trim();
    const email    = e.target.querySelector('input[type="email"]').value.trim();
    const password = p1.value.trim();
    const btn      = document.getElementById('create-btn');

    btn.disabled    = true;
    btn.textContent = 'Creating…';

    const formData = new FormData();
    formData.append('name',     name);
    formData.append('email',    email);
    formData.append('password', password);

    try {
        const res  = await fetch('api/signup.php', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            showMsg('signup-msg', '✓ ' + data.message, false);
            btn.textContent = 'Account Created!';
            setTimeout(() => {
                toggleForm('login-box');
                btn.textContent = 'Create Account';
                btn.disabled    = false;
                e.target.reset();
                msg.textContent = '';
            }, 1800);
        } else {
            showMsg('signup-msg', data.message || 'Registration failed.', true);
            btn.disabled    = false;
            btn.textContent = 'Create Account';
        }
    } catch (err) {
        showMsg('signup-msg', 'Server error. Make sure XAMPP is running.', true);
        btn.disabled    = false;
        btn.textContent = 'Create Account';
    }
};