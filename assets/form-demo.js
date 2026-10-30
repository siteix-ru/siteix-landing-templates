(() => {
  /*
   * Демонстрационный обработчик формы.
   * Замените API_ENDPOINT на адрес своего API, а API_TOKEN — на свой токен.
   * Значения ниже — заглушки, не используйте их в продакшене.
   */
  const API_ENDPOINT = 'https://api.example.com/lead';
  const API_TOKEN = '***';
  const forms = document.querySelectorAll('.lead-form');

  const normalizePhone = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) {
      return `+7${digits.slice(1)}`;
    }
    if (digits.length === 10) {
      return `+7${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('7')) {
      return `+${digits}`;
    }
    return null;
  };

  const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

  forms.forEach((form) => {
    const channels = form.querySelectorAll('.lead-form__channel');
    const contact = form.querySelector('input[name="contact"]');
    const contactLabel = form.querySelector('[data-contact-label]');
    const error = form.querySelector('.lead-form__error');
    const button = form.querySelector('button[type="submit"]');
    const fields = form.querySelector('.lead-form__fields');
    const success = form.querySelector('.lead-form__success');
    const consent = form.querySelector('input[name="consent"]');
    const niche = form.dataset.niche || 'частный мастер';

    let channel = 'phone';
    let sending = false;
    let cooldown = 0;
    let timer;

    const meta = {
      phone: { label: 'Телефон', placeholder: '+7 999 123-45-67' },
      whatsapp: { label: 'Телефон для WhatsApp', placeholder: '+7 999 123-45-67' },
      max: { label: 'Телефон или @ник', placeholder: '+7 999 123-45-67 или @nickname' },
      email: { label: 'E-mail', placeholder: 'name@mail.ru' },
    };

    const setChannel = (next) => {
      channel = next;
      channels.forEach((item) => {
        const active = item.dataset.channel === next;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      contactLabel.textContent = meta[next].label;
      contact.placeholder = meta[next].placeholder;
      contact.type = next === 'email' ? 'email' : 'tel';
      error.hidden = true;
    };

    channels.forEach((item) => {
      item.addEventListener('click', () => setChannel(item.dataset.channel));
    });

    const startCooldown = () => {
      cooldown = 5;
      clearInterval(timer);
      const tick = () => {
        if (cooldown <= 0) {
          clearInterval(timer);
          button.disabled = false;
          button.textContent = 'Отправить';
          return;
        }
        button.disabled = true;
        button.textContent = `Подождите ${cooldown} с`;
        cooldown -= 1;
      };
      tick();
      timer = setInterval(tick, 1000);
    };

    const showError = (message) => {
      error.textContent = message;
      error.hidden = false;
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (sending || cooldown > 0) {
        return;
      }

      if (!consent || !consent.checked) {
        showError('Поставьте галочку согласия — без неё заявку отправить нельзя.');
        consent?.focus();
        return;
      }

      const value = contact.value.trim();
      let normalized = value;

      if (channel === 'phone' || channel === 'whatsapp') {
        normalized = normalizePhone(value) || '';
        if (!normalized) {
          showError('Оставьте телефон в формате +7 999 123-45-67.');
          return;
        }
      } else if (channel === 'email') {
        if (!isEmail(value)) {
          showError('Введите e-mail, например name@mail.ru.');
          return;
        }
        normalized = value.toLowerCase();
      } else if (
        !value ||
        !(
          /^@[a-zA-Z0-9_]{3,}$/.test(value) ||
          /max\.ru/i.test(value) ||
          normalizePhone(value)
        )
      ) {
        showError('Оставьте телефон, @ник или ссылку на MAX.');
        return;
      }

      const honeypot = form.querySelector('input[name="company"]').value;
      const name = form.querySelector('input[name="name"]').value.trim();
      const message = form.querySelector('textarea[name="message"]').value.trim();
      const website = form.querySelector('input[name="website"]')?.value.trim();

      sending = true;
      error.hidden = true;
      button.disabled = true;
      button.innerHTML = '<span class="lead-form__spinner" aria-hidden="true"></span> Отправляем…';

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${API_TOKEN}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            name: name || undefined,
            contact: normalized,
            message: message || undefined,
            channel,
            source: form.dataset.source || 'github-template',
            page: window.location.pathname,
            intent: form.dataset.intent || undefined,
            objectType: form.dataset.objectType || undefined,
            website: website || undefined,
            consent: true,
            consentVersion: 'template',
            company: honeypot,
          }),
        });

        if (!response.ok) {
          const limited = response.status === 429;
          showError(
            limited
              ? 'Слишком много заявок. Подождите 10 минут или позвоните.'
              : 'Не получилось отправить. Попробуйте ещё раз или позвоните.',
          );
          startCooldown();
          return;
        }

        fields.hidden = true;
        success.hidden = false;
        success.focus?.(););
        }
      } catch {
        sending = false;
        showError('Не получилось отправить. Попробуйте ещё раз или позвоните.');
        startCooldown();
      } finally {
        clearTimeout(timeout);
        sending = false;
        if (success.hidden) {
          button.disabled = cooldown > 0;
        }
      }
    });

    setChannel('phone');
  });
})();
