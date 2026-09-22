const tabs = document.querySelectorAll('.auth-tab');
const forms = document.querySelectorAll('.auth-form');
const feedback = document.getElementById('feedback');
const formTitle = document.getElementById('form-title');
const formDescription = document.getElementById('form-description');

function alternarFormulario(tipo) {
    const isLogin = tipo === 'login';

    tabs.forEach((tab) => {
        const active = tab.id === `${tipo}-tab`;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active);
    });

    forms.forEach((form) => {
        const active = form.dataset.form === tipo;
        form.classList.toggle('is-hidden', !active);
        form.hidden = !active;
    });

    formTitle.textContent = isLogin ? 'Bem-vindo de volta' : 'Crie seu espaço';
    formDescription.textContent = isLogin
        ? 'Entre com seus dados para continuar.'
        : 'Cadastre-se para pedir seus favoritos com facilidade.';
    feedback.textContent = '';
    feedback.classList.remove('success');
}

tabs.forEach((tab) => {
    tab.addEventListener('click', () => alternarFormulario(tab.id.replace('-tab', '')));
});

forms.forEach((form) => {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        const dados = Object.fromEntries(new FormData(form));
        const endpoint = form.dataset.form === 'login' ? '/autenticar/login' : '/autenticar/registrar';

        button.disabled = true;
        feedback.textContent = 'Processando...';
        feedback.classList.remove('success');

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            const resultado = await response.json();

            if (!response.ok) {
                throw new Error(resultado.erro || 'Não foi possível concluir a operação.');
            }

            if (form.dataset.form === 'login') {
                window.location.href = '/Front/Paginas/Home.html';
                return;
            }

            form.reset();
            alternarFormulario('login');
            feedback.textContent = 'Conta criada. Agora você já pode entrar.';
            feedback.classList.add('success');
        } catch (error) {
            feedback.textContent = error.message;
        } finally {
            button.disabled = false;
        }
    });
});