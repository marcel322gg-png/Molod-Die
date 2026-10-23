/* Client-only API adapter for GitHub Pages. All data stays in this browser. */
(() => {
  const nativeFetch = window.fetch.bind(window);
  const keys = { users: 'users_db', current: 'currentUser', tasks: 'tasks_db', applications: 'applications_db', reports: 'reports_db', survey: 'survey_db' };
  const get = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const put = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const publicUser = user => ({ id: user.id, name: user.name, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role });
  const currentUser = () => get(keys.current, null);
  const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  const fail = (message, status = 400) => response({ error: message }, status);
  async function passwordHash(password, salt) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: Uint8Array.from(atob(salt), c => c.charCodeAt(0)), iterations: 150000, hash: 'SHA-256' }, material, 256);
    return btoa(String.fromCharCode(...new Uint8Array(bits)));
  }
  const random = length => { const b = crypto.getRandomValues(new Uint8Array(length)); return btoa(String.fromCharCode(...b)); };
  const seedTasks = [
    ['Створити візуальні картки для молодіжного простору','ГО «Тепла майстерня»','Дизайн','Харків · дистанційно',800,'14+','Віддалено','2026-11-02','Потрібно підготувати 6 карток для соцмереж за готовим текстом.'],
    ['Допомогти з презентацією про сортування','Екоцентр «Зелений крок»','Освіта','Харків · Салтівський район',600,'16+','На місці','2026-10-29','Оформити 8 слайдів за наданими матеріалами.'],
    ['Відформатувати навчальний посібник','Освітня студія «Крок»','Робота з текстом','Дистанційно',500,'14+','Віддалено','2026-11-05','Вирівняти заголовки та зміст у документі.'],
    ['Помічник на відкритій події','Молодіжний хаб «Схід»','Події','Харків · центр',700,'16+','На місці','2026-11-08','Реєстрація гостей на денному заході.'],
    ['Підготувати субтитри до короткого відео','Медіалаб «Фокус»','Медіа','Дистанційно',450,'14+','Віддалено','2026-11-01','Розшифрувати й додати субтитри до короткого відео.'],
    ['Допомога з англійською для молодшої групи','Освітній простір «Маяк»','Освіта','Харків · центр',350,'16+','На місці','2026-11-03','Підготувати вправи разом із викладачем.'],
    ['Зробити ілюстрації для афіші','Майстерня «Папір»','Дизайн','Дистанційно',900,'16+','Віддалено','2026-11-12','Дві авторські ілюстрації для афіші.'],
    ['Допомога з таблицею каталогу книжок','Бібліотека «Сузір’я»','Робота з текстом','Харків · центр',400,'14+','На місці','2026-10-31','Внести назви та авторів до таблиці.'],
    ['Зняти фото для шкільного медіапроєкту','Медіалаб «Фокус»','Медіа','Харків · центр',650,'16+','На місці','2026-11-10','Фотозйомка відкритої виставки вдень.'],
    ['Створити просту сторінку події','ГО «Тепла майстерня»','Цифрові навички','Дистанційно',1200,'18+','Віддалено','2026-11-15','Односторінкова сторінка за готовим макетом.'],
    ['Підготувати матеріали для майстер-класу','Хаб «Схід»','Події','Харків · центр',500,'14+','На місці','2026-11-06','Підготувати матеріали до відкритої події.'],
    ['Зробити добірку локальних ініціатив','Освітня студія «Крок»','Дослідження','Дистанційно',550,'16+','Віддалено','2026-11-09','Зібрати контакти та посилання на ініціативи.']
  ].map((x, i) => ({ id: i + 1, title: x[0], org: x[1], category: x[2], location: x[3], pay: x[4], age: x[5], format: x[6], date: x[7], description: x[8], demo: true }));
  function allTasks() { const stored = get(keys.tasks, null); if (stored) return stored; put(keys.tasks, seedTasks); return seedTasks; }
  async function handle(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    let body = {}; try { body = options.body ? JSON.parse(options.body) : {}; } catch {}
    if (url.pathname === '/api/auth/register' && method === 'POST') {
      await delay(1000);
      const email = String(body.email || '').trim().toLowerCase();
      const firstName = String(body.firstName || '').trim(), lastName = String(body.lastName || '').trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Введіть коректну електронну адресу');
      if (firstName.length < 2 || lastName.length < 2) return fail('Вкажіть ім’я та прізвище');
      if (String(body.password || '').length < 10 || body.password !== body.passwordConfirm) return fail('Паролі мають збігатися й містити щонайменше 10 символів');
      const users = get(keys.users);
      if (users.some(user => user.email === email)) return fail('Ця адреса вже зареєстрована', 409);
      const salt = random(16), user = { id: crypto.randomUUID(), firstName, lastName, name: `${firstName} ${lastName}`, email, role: body.role || 'youth', salt, passwordHash: await passwordHash(body.password, salt), emailVerified: false };
      users.push(user); put(keys.users, users);
      const verificationToken = random(24); sessionStorage.setItem(`verify:${verificationToken}`, user.id);
      return response({ message: 'Профіль створено. Демо-лист готовий до підтвердження.', verificationToken }, 201);
    }
    if (url.pathname === '/api/auth/verify-email' && method === 'POST') {
      const id = sessionStorage.getItem(`verify:${body.token}`), users = get(keys.users), user = users.find(item => item.id === id);
      if (!user) return fail('Посилання недійсне або вже використане');
      user.emailVerified = true; sessionStorage.removeItem(`verify:${body.token}`); put(keys.users, users); put(keys.current, publicUser(user));
      return response({ user: publicUser(user), message: 'Email підтверджено' });
    }
    if (url.pathname === '/api/auth/login' && method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase(), user = get(keys.users).find(item => item.email === email);
      if (!user || await passwordHash(String(body.password || ''), user.salt) !== user.passwordHash) return fail('Невірний пароль або електронна адреса', 401);
      if (!user.emailVerified) return fail('Спочатку підтвердьте email у демонстраційному вікні', 403);
      put(keys.current, publicUser(user)); return response({ user: publicUser(user) });
    }
    if (url.pathname === '/api/auth/me') return currentUser() ? response({ user: currentUser() }) : fail('Потрібен вхід', 401);
    if (url.pathname === '/api/auth/logout' && method === 'POST') { localStorage.removeItem(keys.current); return response({ message: 'Ви вийшли з облікового запису' }); }
    if (url.pathname === '/api/auth/diia-demo' && method === 'POST') {
      await delay(2500);
      let user = get(keys.users).find(item => item.email === 'diia-demo@example.test');
      if (!user) { user = { id: crypto.randomUUID(), firstName: 'Тестовий', lastName: 'Користувач Дії', name: 'Тестовий Користувач Дії', email: 'diia-demo@example.test', role: 'youth', identityProvider: 'MOCK' }; put(keys.users, [...get(keys.users), user]); }
      put(keys.current, publicUser(user)); return response({ user: publicUser(user), demo: true, identityProvider: 'MOCK' });
    }
    if (url.pathname === '/api/tasks' && method === 'GET') {
      let items = allTasks().filter(task => task.status !== 'pending');
      const q = (url.searchParams.get('q') || '').toLowerCase(), category = url.searchParams.get('category'), format = url.searchParams.get('format'), age = Number(url.searchParams.get('age') || 99);
      items = items.filter(task => (!q || [task.title, task.org, task.category, task.description, task.location].join(' ').toLowerCase().includes(q)) && (!category || category === 'Усі напрями' || task.category === category) && (!format || format === 'Будь-який формат' || task.format === format) && Number(String(task.age).replace('+', '')) <= age);
      return response({ items, total: items.length });
    }
    if (url.pathname === '/api/tasks' && method === 'POST') {
      const user = currentUser(); if (!user || user.role !== 'employer') return fail('Потрібен вхід як замовник', 403);
      const tasks = allTasks(), item = { id: Date.now(), title: String(body.title || '').slice(0, 100), org: user.name, category: 'Інше', location: 'Дистанційно', pay: Number(body.pay), age: '18+', format: 'Віддалено', date: new Date().toISOString().slice(0, 10), description: String(body.description || '').slice(0, 1000), demo: true, status: 'pending' };
      if (!item.title || item.description.length < 20 || item.pay <= 0) return fail('Перевірте назву, опис і винагороду');
      tasks.unshift(item); put(keys.tasks, tasks); return response({ item, message: 'Завдання надіслано на демонстраційну модерацію' }, 201);
    }
    const apply = url.pathname.match(/^\/api\/tasks\/(\d+)\/apply$/);
    if (apply && method === 'POST') {
      const user = currentUser(); if (!user || user.role !== 'youth') return fail('Увійдіть як молодий виконавець', 403);
      const task = allTasks().find(item => item.id === Number(apply[1])); if (!task) return fail('Завдання не знайдено', 404);
      const item = { id: Date.now(), taskId: task.id, userId: user.id, name: user.name, note: String(body.note || '').slice(0, 500), status: Number(body.age || 18) < 18 ? 'Потрібне погодження дорослого' : 'Надіслано замовнику', demo: true };
      const list = get(keys.applications); list.push(item); put(keys.applications, list); return response({ item }, 201);
    }
    if (url.pathname === '/api/reports' && method === 'POST') { if (!body.reason) return fail('Оберіть причину звернення'); const list = get(keys.reports); list.push({ ...body, createdAt: new Date().toISOString(), demo: true }); put(keys.reports, list); return response({ message: 'Звернення збережено в цьому браузері' }, 201); }
    if (url.pathname === '/api/survey/summary') { const count = get(keys.survey).length; return response({ count, message: count ? 'Збережені відповіді в локальній демоверсії.' : 'Результати з’являться після збору відповідей.' }); }
    if (url.pathname === '/api/survey' && method === 'POST') { if (!Array.isArray(body.answers) || body.answers.length !== 25 || body.answers.some(x => !String(x || '').trim())) return fail('Дайте відповідь на всі 25 запитань'); const list = get(keys.survey); list.push({ answers: body.answers, createdAt: new Date().toISOString() }); put(keys.survey, list); return response({ message: 'Відповіді збережено в цьому браузері' }, 201); }
    return fail('Дія недоступна в локальному режимі', 404);
  }
  window.fetch = (input, options) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    return url.pathname.startsWith('/api/') ? handle(url, options) : nativeFetch(input, options);
  };
})();
