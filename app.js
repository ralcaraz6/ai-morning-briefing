// Application Data
let appData = {
  profile: {},
  rssSources: [],
  sampleNews: [],
  stats: {
    totalSources: 0,
    activeSources: 0,
    newsProcessed: 0,
    averageRelevance: 0,
    newslettersSent: 0,
    lastUpdate: new Date().toISOString()
  },
  scheduling: {
    frequency: "daily",
    time: "07:00",
    timezone: "Europe/Madrid",
    active: true
  },
  recipients: []
};

// Estado de noticias leídas (en memoria, por sesión)
let readNewsIds = new Set();
let newsReadFilter = 'all'; // 'all', 'read', 'unread'

// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';

// DOM Elements
const elements = {
  navTabs: document.querySelectorAll('.nav-tab'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // Profile elements
  profileForm: document.getElementById('profileForm'),
  interestsContainer: document.getElementById('interests'),
  notInterestedContainer: document.getElementById('notInterested'),
  newInterestInput: document.getElementById('newInterest'),
  newNotInterestInput: document.getElementById('newNotInterest'),
  addInterestBtn: document.getElementById('addInterest'),
  addNotInterestBtn: document.getElementById('addNotInterest'),
  saveProfileBtn: document.getElementById('saveProfile'),
  
  // Sources elements
  sourcesList: document.getElementById('sourcesList'),
  addSourceBtn: document.getElementById('addSourceBtn'),
  addSourceModal: document.getElementById('addSourceModal'),
  addSourceForm: document.getElementById('addSourceForm'),
  closeModal: document.getElementById('closeModal'),
  cancelAdd: document.getElementById('cancelAdd'),
  confirmAdd: document.getElementById('confirmAdd'),
  
  // News elements
  newsList: document.getElementById('newsList'),
  categoryFilter: document.getElementById('categoryFilter'),
  relevanceFilter: document.getElementById('relevanceFilter'),
  
  // Newsletter elements
  newsletterContent: document.getElementById('newsletterContent'),
  refreshNewsletter: document.getElementById('refreshNewsletter'),
  sendTestNewsletter: document.getElementById('sendTestNewsletter'),
  generateNewsletter: document.getElementById('generateNewsletter'),
  
  // Settings elements
  schedulingForm: document.getElementById('schedulingForm'),
  frequency: document.getElementById('frequency'),
  sendTime: document.getElementById('sendTime'),
  weeklyDay: document.getElementById('weeklyDay'),
  weekDay: document.getElementById('weekDay'),
  timezone: document.getElementById('timezone'),
  saveScheduling: document.getElementById('saveScheduling'),
  systemActive: document.getElementById('systemActive'),
  nextSend: document.getElementById('nextSend'),
  
  // Dashboard elements
  totalSources: document.getElementById('totalSources'),
  activeSources: document.getElementById('activeSources'),
  newsProcessed: document.getElementById('newsProcessed'),
  averageRelevance: document.getElementById('averageRelevance'),
  newslettersSent: document.getElementById('newslettersSent'),
  latestNewsPreview: document.getElementById('latestNewsPreview'),
  systemStatus: document.getElementById('systemStatus')
};

// API Functions
async function fetchProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/profile`);
    appData.profile = await response.json();
    loadProfile();
  } catch (error) {
    console.error('Error fetching profile:', error);
    showNotification('Error al cargar el perfil', 'error');
  }
}

async function saveProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(appData.profile)
    });
    appData.profile = await response.json();
    showNotification('Perfil guardado correctamente', 'success');
  } catch (error) {
    console.error('Error saving profile:', error);
    showNotification('Error al guardar el perfil', 'error');
  }
}

async function fetchSources() {
  try {
    const response = await fetch(`${API_BASE_URL}/sources`);
    appData.rssSources = await response.json();
    updateStats();
    renderSources();
  } catch (error) {
    console.error('Error fetching sources:', error);
    showNotification('Error al cargar las fuentes', 'error');
  }
}

async function addNewSource(sourceData) {
  try {
    const response = await fetch(`${API_BASE_URL}/sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sourceData)
    });
    const newSource = await response.json();
    appData.rssSources.push(newSource);
    updateStats();
    renderSources();
    showNotification('Fuente añadida correctamente', 'success');
  } catch (error) {
    console.error('Error adding source:', error);
    showNotification('Error al añadir la fuente', 'error');
  }
}

async function toggleSource(id) {
  const source = appData.rssSources.find(s => s.id === id);
  if (source) {
    try {
      const response = await fetch(`${API_BASE_URL}/sources/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...source, active: !source.active })
      });
      const updatedSource = await response.json();
      Object.assign(source, updatedSource);
      updateStats();
      renderSources();
      showNotification(`Fuente ${source.name} ${source.active ? 'activada' : 'desactivada'}`, 'success');
    } catch (error) {
      console.error('Error toggling source:', error);
      showNotification('Error al actualizar la fuente', 'error');
    }
  }
}

async function removeSource(id) {
  const source = appData.rssSources.find(s => s.id === id);
  if (source && confirm(`¿Estás seguro de que quieres eliminar la fuente "${source.name}"?`)) {
    try {
      await fetch(`${API_BASE_URL}/sources/${id}`, {
        method: 'DELETE'
      });
      appData.rssSources = appData.rssSources.filter(s => s.id !== id);
      updateStats();
      renderSources();
      showNotification(`Fuente ${source.name} eliminada`, 'success');
    } catch (error) {
      console.error('Error removing source:', error);
      showNotification('Error al eliminar la fuente', 'error');
    }
  }
}

async function fetchNews() {
  try {
    const response = await fetch(`${API_BASE_URL}/news`);
    appData.sampleNews = await response.json();
    updateStats();
    renderNews(appData.sampleNews);
  } catch (error) {
    console.error('Error fetching news:', error);
    showNotification('Error al cargar las noticias', 'error');
  }
}

// Recipients Management
async function fetchRecipients() {
  try {
    const response = await fetch(`${API_BASE_URL}/recipients`);
    appData.recipients = await response.json();
    renderRecipients();
  } catch (error) {
    showNotification('Error loading recipients', 'error');
  }
}

async function addRecipient() {
  const email = document.getElementById('newRecipientEmail').value.trim();
  if (!email) return;
  try {
    const response = await fetch(`${API_BASE_URL}/recipients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (data.success) {
      document.getElementById('newRecipientEmail').value = '';
      appData.recipients = data.recipients;
      renderRecipients();
      showNotification('Recipient added', 'success');
    } else {
      showNotification(data.message || 'Error adding recipient', 'error');
    }
  } catch (error) {
    showNotification('Error adding recipient', 'error');
  }
}

async function removeRecipient(email) {
  try {
    const response = await fetch(`${API_BASE_URL}/recipients`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (data.success) {
      appData.recipients = data.recipients;
      renderRecipients();
      showNotification('Recipient removed', 'success');
    } else {
      showNotification('Error removing recipient', 'error');
    }
  } catch (error) {
    showNotification('Error removing recipient', 'error');
  }
}

function renderRecipients() {
  const list = document.getElementById('recipientsList');
  if (!appData.recipients || appData.recipients.length === 0) {
    list.innerHTML = '<p>No recipients yet.</p>';
    return;
  }
  list.innerHTML = appData.recipients.map(email => `
    <div class="recipient-item">
      <span>${email}</span>
      <button class="btn btn--sm btn--outline remove-recipient-btn" data-email="${email}">Remove</button>
    </div>
  `).join('');
  document.querySelectorAll('.remove-recipient-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const email = this.getAttribute('data-email');
      removeRecipient(email);
    });
  });
}

// Add event listeners for Recipients tab
function setupRecipientsTab() {
  document.getElementById('addRecipientBtn').addEventListener('click', addRecipient);
  document.getElementById('newRecipientEmail').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addRecipient();
  });
}

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

async function initializeApp() {
  setupEventListeners();
  setupRecipientsTab();
  await Promise.all([
    fetchProfile(),
    fetchSources(),
    fetchNews(),
    fetchRecipients()
  ]);
  loadDashboard();
  loadSettings();
  generateNewsletterContent();
}

function setupEventListeners() {
  // Navigation
  elements.navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
  });
  
  // Profile
  elements.addInterestBtn.addEventListener('click', addInterest);
  elements.addNotInterestBtn.addEventListener('click', addNotInterest);
  elements.saveProfileBtn.addEventListener('click', saveProfile);
  elements.newInterestInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addInterest();
  });
  elements.newNotInterestInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addNotInterest();
  });
  
  // Sources
  elements.addSourceBtn.addEventListener('click', openAddSourceModal);
  elements.closeModal.addEventListener('click', closeAddSourceModal);
  elements.cancelAdd.addEventListener('click', closeAddSourceModal);
  elements.confirmAdd.addEventListener('click', addNewSource);
  
  // News
  elements.categoryFilter.addEventListener('change', filterNews);
  elements.relevanceFilter.addEventListener('change', filterNews);
  
  // Newsletter
  elements.refreshNewsletter.addEventListener('click', generateNewsletterContent);
  elements.sendTestNewsletter.addEventListener('click', sendTestNewsletter);
  elements.generateNewsletter.addEventListener('click', generateNewsletterContent);
  
  // Settings
  elements.frequency.addEventListener('change', toggleWeeklyOptions);
  elements.saveScheduling.addEventListener('click', saveScheduling);
  elements.systemActive.addEventListener('change', toggleSystem);
  
  // Modal
  elements.addSourceModal.addEventListener('click', (e) => {
    if (e.target === elements.addSourceModal) closeAddSourceModal();
  });
}

// Navigation
function switchTab(tabName) {
  elements.navTabs.forEach(tab => tab.classList.remove('active'));
  elements.tabContents.forEach(content => content.classList.remove('active'));
  
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(tabName).classList.add('active');
}

// Profile Management
function loadProfile() {
  document.getElementById('age').value = appData.profile.age;
  document.getElementById('location').value = appData.profile.location;
  document.getElementById('job').value = appData.profile.job;
  document.getElementById('company').value = appData.profile.company;
  
  renderInterests();
}

function renderInterests() {
  elements.interestsContainer.innerHTML = appData.profile.interests.map(interest => 
    `<div class="interest-tag">
      ${interest}
      <button onclick="removeInterest('${interest}')">×</button>
    </div>`
  ).join('');
  
  elements.notInterestedContainer.innerHTML = appData.profile.notInterested.map(item => 
    `<div class="interest-tag not-interested-tag">
      ${item}
      <button onclick="removeNotInterest('${item}')">×</button>
    </div>`
  ).join('');
}

function addInterest() {
  const value = elements.newInterestInput.value.trim();
  if (value && !appData.profile.interests.includes(value)) {
    appData.profile.interests.push(value);
    elements.newInterestInput.value = '';
    renderInterests();
    showNotification('Interés añadido', 'success');
  }
}

function addNotInterest() {
  const value = elements.newNotInterestInput.value.trim();
  if (value && !appData.profile.notInterested.includes(value)) {
    appData.profile.notInterested.push(value);
    elements.newNotInterestInput.value = '';
    renderInterests();
    showNotification('Exclusión añadida', 'success');
  }
}

// Sources Management
function loadSources() {
  renderSources();
}

function renderSources() {
  elements.sourcesList.innerHTML = appData.rssSources.map(source => 
    `<div class="source-card ${!source.active ? 'inactive' : ''}">
      <div class="source-header">
        <h4 class="source-name">${source.name}</h4>
        <span class="source-category">${source.category}</span>
      </div>
      <div class="source-url">${source.url}</div>
      <div class="source-actions">
        <button class="btn btn--sm ${source.active ? 'btn--secondary' : 'btn--primary'}" 
                onclick="toggleSource(${source.id})">
          ${source.active ? 'Desactivar' : 'Activar'}
        </button>
        <button class="btn btn--sm btn--outline" onclick="removeSource(${source.id})">
          Eliminar
        </button>
      </div>
    </div>`
  ).join('');
}

function openAddSourceModal() {
  elements.addSourceModal.classList.remove('hidden');
}

function closeAddSourceModal() {
  elements.addSourceModal.classList.add('hidden');
  elements.addSourceForm.reset();
}

function addNewSource() {
  const name = document.getElementById('sourceName').value;
  const url = document.getElementById('sourceUrl').value;
  const category = document.getElementById('sourceCategory').value;
  
  if (name && url) {
    const newSource = {
      id: Math.max(...appData.rssSources.map(s => s.id)) + 1,
      name,
      url,
      category,
      active: true
    };
    
    appData.rssSources.push(newSource);
    updateStats();
    renderSources();
    loadDashboard();
    closeAddSourceModal();
    showNotification('Fuente RSS añadida correctamente', 'success');
  }
}

// News Management
function loadNews() {
  renderNews(appData.sampleNews);
}

function renderNewsFilters() {
  // Filtro de leídas/no leídas
  const filterHtml = `
    <div class="news-read-filter">
      <label>Ver: </label>
      <select id="readFilterSelect" class="form-control filter-select">
        <option value="all">Todas</option>
        <option value="unread">No leídas</option>
        <option value="read">Leídas</option>
      </select>
    </div>
  `;
  elements.newsList.innerHTML = filterHtml + '<div id="newsCardsContainer"></div>';
  document.getElementById('readFilterSelect').value = newsReadFilter;
  document.getElementById('readFilterSelect').addEventListener('change', (e) => {
    newsReadFilter = e.target.value;
    renderNews(appData.sampleNews);
  });
}

function renderNews(newsArray) {
  renderNewsFilters();
  // Ordenar por relevancia descendente
  const sortedNews = [...newsArray].sort((a, b) => b.relevanceScore - a.relevanceScore);
  // Filtrar por leídas/no leídas
  let filteredNews = sortedNews;
  if (newsReadFilter === 'read') filteredNews = sortedNews.filter(n => readNewsIds.has(n.url));
  if (newsReadFilter === 'unread') filteredNews = sortedNews.filter(n => !readNewsIds.has(n.url));
  const newsCardsHtml = filteredNews.map(news => {
    // Formatear fecha y hora
    let dateStr = '';
    if (news.publishedAt) {
      const date = new Date(news.publishedAt);
      dateStr = date.toLocaleString('es-ES', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    }
    // Estado de leído
    const isRead = readNewsIds.has(news.url);
    // Impacto personalizado breve
    let impactShort = news.impact;
    let showMoreBtn = '';
    if (impactShort && impactShort.length > 160) {
      impactShort = impactShort.slice(0, 160) + '...';
      showMoreBtn = `<button class="btn btn--xs btn--link show-impact-btn" data-url="${news.url}">Ver más</button>`;
    }
    return `
      <div class="news-card">
        <div class="news-header">
          <h3 class="news-title">
            <a href="${news.url}" target="_blank" rel="noopener noreferrer">${news.title}</a>
          </h3>
          <div class="news-meta">
            <span class="relevance-score ${getRelevanceClass(news.relevanceScore)}">
              ${news.relevanceScore}%
            </span>
            <span class="news-category">${news.category || ''}</span>
            <span class="news-source">${news.source}</span>
            ${dateStr ? `<span class="news-date">${dateStr}</span>` : ''}
          </div>
        </div>
        <p class="news-summary">${news.summary}</p>
        <div class="news-impact">
          <strong>Impacto Personalizado:</strong> <span class="impact-short" data-url="${news.url}">${impactShort}</span> ${showMoreBtn}
        </div>
        <button class="btn mark-read-btn ${isRead ? 'btn--success' : 'btn--outline'}" data-url="${news.url}">
          <span class="btn-icon">${isRead ? '✅' : '☐'}</span> ${isRead ? 'Leída' : 'Marcar como leída'}
        </button>
      </div>
    `;
  }).join('');
  document.getElementById('newsCardsContainer').innerHTML = newsCardsHtml;
  // Añadir listeners a los botones de marcar como leída
  document.querySelectorAll('.mark-read-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const url = this.getAttribute('data-url');
      readNewsIds.add(url);
      this.classList.remove('btn--outline');
      this.classList.add('btn--success');
      this.querySelector('.btn-icon').textContent = '✅';
      this.textContent = ' Leída';
      this.prepend(this.querySelector('.btn-icon'));
    });
  });
  // Listener para mostrar el impacto completo
  document.querySelectorAll('.show-impact-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const url = this.getAttribute('data-url');
      const news = appData.sampleNews.find(n => n.url === url);
      if (news) {
        const span = document.querySelector(`.impact-short[data-url="${url}"]`);
        if (span) span.textContent = news.impact;
        this.style.display = 'none';
      }
    });
  });
}

function getRelevanceClass(score) {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

function filterNews() {
  const categoryFilter = elements.categoryFilter.value;
  const relevanceFilter = parseInt(elements.relevanceFilter.value) || 0;
  
  let filteredNews = appData.sampleNews.filter(news => {
    const categoryMatch = !categoryFilter || news.category === categoryFilter;
    const relevanceMatch = news.relevanceScore >= relevanceFilter;
    return categoryMatch && relevanceMatch;
  });
  
  renderNews(filteredNews);
}

// Newsletter Generation
function generateNewsletterContent() {
  const relevantNews = appData.sampleNews.filter(news => news.relevanceScore >= 60);
  const currentDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const highImpactNews = relevantNews.filter(news => news.relevanceScore >= 80);
  const mediumImpactNews = relevantNews.filter(news => news.relevanceScore >= 60 && news.relevanceScore < 80);
  
  const newsletterHTML = `
    <div class="newsletter-header">
      <div class="newsletter-date">${currentDate}</div>
      <h2 class="newsletter-title">🌅 Tu Briefing Matutino Personalizado</h2>
      <p class="newsletter-subtitle">Las noticias que realmente te importan, filtradas por IA</p>
    </div>
    
    ${highImpactNews.length > 0 ? `
    <div class="newsletter-section">
      <h3>📈 Noticias de Alto Impacto</h3>
      ${highImpactNews.map(news => 
        `<div class="newsletter-news-item">
          <h4 class="newsletter-news-title">${news.title}</h4>
          <p class="newsletter-news-summary">${news.summary}</p>
          <div class="newsletter-news-impact">${news.impact}</div>
        </div>`
      ).join('')}
    </div>
    ` : ''}
    
    ${mediumImpactNews.length > 0 ? `
    <div class="newsletter-section">
      <h3>📊 Otras Noticias Relevantes</h3>
      ${mediumImpactNews.map(news => 
        `<div class="newsletter-news-item">
          <h4 class="newsletter-news-title">${news.title}</h4>
          <p class="newsletter-news-summary">${news.summary}</p>
          <div class="newsletter-news-impact">${news.impact}</div>
        </div>`
      ).join('')}
    </div>
    ` : ''}
    
    <div class="newsletter-section">
      <h3>🤖 Resumen de IA</h3>
      <p>Este briefing ha sido personalizado para <strong>${appData.profile.job}</strong> de <strong>${appData.profile.age} años</strong> 
      en <strong>${appData.profile.location}</strong>. Se han filtrado <strong>${appData.sampleNews.length}</strong> noticias, 
      seleccionando <strong>${relevantNews.length}</strong> con alta relevancia para tus intereses en 
      <strong>${appData.profile.interests.slice(0, 3).join(', ')}</strong> y más.</p>
    </div>
  `;
  
  if (elements.newsletterContent) {
    elements.newsletterContent.innerHTML = newsletterHTML;
    showNotification('Newsletter actualizado', 'success');
  }
}

function sendTestNewsletter() {
  showNotification('Newsletter de prueba enviado a tu email', 'success');
}

// Settings Management
function loadSettings() {
  elements.frequency.value = appData.scheduling.frequency;
  elements.sendTime.value = appData.scheduling.time;
  elements.timezone.value = appData.scheduling.timezone;
  elements.systemActive.checked = appData.scheduling.active;
  
  toggleWeeklyOptions();
  updateNextSend();
}

function toggleWeeklyOptions() {
  const isWeekly = elements.frequency.value === 'weekly';
  elements.weeklyDay.style.display = isWeekly ? 'block' : 'none';
}

function saveScheduling() {
  appData.scheduling.frequency = elements.frequency.value;
  appData.scheduling.time = elements.sendTime.value;
  appData.scheduling.timezone = elements.timezone.value;
  
  updateNextSend();
  showNotification('Configuración de envío guardada', 'success');
}

function toggleSystem() {
  appData.scheduling.active = elements.systemActive.checked;
  elements.systemStatus.textContent = elements.systemActive.checked ? 'Sistema Activo' : 'Sistema Inactivo';
  elements.systemStatus.className = `status ${elements.systemActive.checked ? 'status--success' : 'status--error'}`;
}

function updateNextSend() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const timeStr = appData.scheduling.time;
  
  if (appData.scheduling.frequency === 'daily') {
    elements.nextSend.textContent = `Mañana a las ${timeStr}`;
  } else {
    elements.nextSend.textContent = `Próximo lunes a las ${timeStr}`;
  }
}

// Dashboard Management
function loadDashboard() {
  updateStats();
  
  elements.totalSources.textContent = appData.stats.totalSources;
  elements.activeSources.textContent = appData.stats.activeSources;
  elements.newsProcessed.textContent = appData.stats.newsProcessed;
  elements.averageRelevance.textContent = appData.stats.averageRelevance;
  elements.newslettersSent.textContent = appData.stats.newslettersSent;
  
  renderLatestNewsPreview();
}

function updateStats() {
  appData.stats.totalSources = appData.rssSources.length;
  appData.stats.activeSources = appData.rssSources.filter(s => s.active).length;
}

function renderLatestNewsPreview() {
  const latestNews = appData.sampleNews
    .filter(news => news.relevanceScore >= 60)
    .slice(0, 3);
  
  elements.latestNewsPreview.innerHTML = latestNews.map(news => 
    `<div class="news-item">
      <div class="news-title">${news.title}</div>
      <div class="news-relevance">${news.relevanceScore}% relevancia</div>
    </div>`
  ).join('');
}

// Utility Functions
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `status status--${type}`;
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '1001';
  notification.style.padding = '12px 20px';
  notification.style.borderRadius = '8px';
  notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}