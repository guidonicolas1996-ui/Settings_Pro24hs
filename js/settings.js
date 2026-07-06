// M�dulo de scripts espec�ficos de settings.html

function compressImage(base64String, maxWidth = 600, maxHeight = 600, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64String;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const originalMime = (base64String.match(/^data:(image\/[^;]+);/) || [])[1] || 'image/jpeg';
      const outputMime = originalMime === 'image/png' ? 'image/png' : 'image/jpeg';
      const outputQuality = outputMime === 'image/png' ? undefined : quality;
      resolve(canvas.toDataURL(outputMime, outputQuality));
    };
    img.onerror = () => resolve(base64String);
  });
}

async function waitForCasinosApi(timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const candidate = window.landingSettings && (window.landingSettings.addCasino || window.landingSettings.getCasinos || window.landingSettings.setActiveCasinos)
      ? window.landingSettings
      : (window.casinosAPI && (window.casinosAPI.addCasino || window.casinosAPI.getCasinos || window.casinosAPI.setActiveCasinos))
        ? window.casinosAPI
        : null;

    if (candidate) {
      try { console.debug('[settings] waitForCasinosApi found candidate', candidate === window.landingSettings ? 'landingSettings' : (candidate === window.casinosAPI ? 'casinosAPI' : candidate)); } catch(e){}
      return candidate;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (window.landingSettings || window.casinosAPI) {
    try { console.debug('[settings] waitForCasinosApi fallback returning', !!window.landingSettings, !!window.casinosAPI); } catch(e){}
    return window.landingSettings || window.casinosAPI;
  }
  console.error('waitForCasinosApi: no casinos API disponible.', { windowLandingSettings: !!window.landingSettings, windowCasinosAPI: !!window.casinosAPI });
  return {};
}

function setupFilePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);

  if (!input || !preview) return;

  input.addEventListener('change', (event) => {
    const file = event.target.files[0];
    preview.innerHTML = '';
    if (!file) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      preview.innerHTML = '<p style="color: #ff6b6b; font-size: 0.8rem;">Archivo muy grande (m�x 10MB)</p>';
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

function getFormValues() {
  return {
    casinoId: document.getElementById('casino-id').value,
    name: document.getElementById('casino-name').value,
    logoFile: document.getElementById('casino-logo').files[0],
    mascotFile: document.getElementById('casino-mascot').files[0],
    color: document.getElementById('casino-color').value
  };
}

function validateFiles(logoFile, mascotFile) {
  const maxFileSize = 10 * 1024 * 1024;
  if (logoFile && logoFile.size > maxFileSize) {
    alert(`Logo muy grande (${(logoFile.size / 1024 / 1024).toFixed(2)}MB). Máximo: 10MB`);
    return false;
  }
  if (mascotFile && mascotFile.size > maxFileSize) {
    alert(`Mascota muy grande (${(mascotFile.size / 1024 / 1024).toFixed(2)}MB). Máximo: 10MB`);
    return false;
  }
  return true;
}

function getCasinoApi() {
  return window.landingSettings || window.casinosAPI || null;
}

async function setupCasinoForm() {
  const form = document.getElementById('new-casino-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = document.getElementById('casino-submit-button');
    const originalButtonText = submitButton ? submitButton.innerText : null;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerText = 'Procesando...';
    }

    const { casinoId, name, logoFile, mascotFile, color } = getFormValues();
    const api = await waitForCasinosApi();
    const saveCasino = api.addCasino || (window.landingSettings && window.landingSettings.addCasino) || (window.casinosAPI && window.casinosAPI.addCasino);

    if (!saveCasino) {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerText = originalButtonText;
      }
      console.error('API de casinos no disponible', { api, windowLandingSettings: window.landingSettings, windowCasinosAPI: window.casinosAPI });
      alert('API de casinos no disponible. Recarg� la p�gina e intent� de nuevo.');
      return;
    }

    const existingCasino = casinoId && api.getCasinos ? api.getCasinos()[casinoId] : null;
    if (casinoId && !existingCasino) {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerText = originalButtonText;
      }
      alert('No se encontr� el casino a editar.');
      return;
    }

    if (!casinoId && (!logoFile || !mascotFile)) {
      alert('Por favor carga tanto el logo como la mascota.');
      return;
    }

    if (!validateFiles(logoFile, mascotFile)) {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerText = originalButtonText;
      }
      return;
    }

    const needLogo = !!logoFile;
    const needMascot = !!mascotFile;

    const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const saveCasinoEntry = async () => {
      try {
        const [logoData, mascotData] = await Promise.all([
          needLogo ? readFileAsDataUrl(logoFile) : Promise.resolve(undefined),
          needMascot ? readFileAsDataUrl(mascotFile) : Promise.resolve(undefined)
        ]);

        const finalLogo = logoData || (existingCasino ? existingCasino.logo : null);
        const finalMascot = mascotData || (existingCasino ? existingCasino.mascot : null);

        if (!finalLogo || !finalMascot) {
          alert('Por favor carga tanto el logo como la mascota.');
          return;
        }

        const newCasinoId = await saveCasino(casinoId || null, name, finalLogo, finalMascot, color);
        alert(casinoId ? '✅ Casino actualizado exitosamente' : '✅ Casino creado exitosamente');
        closeNewCasinoModal();
        resetCasinoForm();
        await renderCasinos();
      } catch (saveError) {
        console.error('Error guardando casino:', saveError);
        alert('❌ Error guardando casino: ' + (saveError?.message || saveError));
      }
    };

    try {
      await saveCasinoEntry();
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerText = originalButtonText;
      }
    }
  });
}

async function renderCasinos() {
  const api = await waitForCasinosApi();
  const casinos = (api.getCasinos && api.getCasinos()) || {};
  const container = document.getElementById('casinos-container');
  if (!container) return;
  container.innerHTML = '';

  let order = [];
  try {
    order = api && api.getCasinoOrder ? api.getCasinoOrder() : [];
  } catch (e) {
    order = [];
  }
  
  if (Array.isArray(order) && order.length) {
    order.forEach((id) => {
      const casino = casinos[id];
      if (!casino) return;
      const card = document.createElement('article');
      card.className = 'theme-card' + (casino.active ? ' is-active' : '');
      card.setAttribute('data-theme-card', id);
      card.innerHTML = `
        <img src="${casino.logo}" alt="Logo ${casino.label}" class="theme-card__logo" />
        <div>
          <h2>${casino.label}</h2>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="width: 16px; height: 16px; background: ${casino.color}; border-radius: 0.25rem; border: 1px solid rgba(255,255,255,0.3);"></div>
            <p>${casino.color}</p>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center; margin-left: auto;">
          <button type="button" class="btn-small btn-edit" data-edit="${id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;">Editar</button>
          <button type="button" class="btn-small btn-delete" data-delete="${id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;">Eliminar</button>
          <input type="checkbox" class="theme-checkbox ${id}" name="theme-select" value="${id}" ${casino.active ? 'checked' : ''} />
        </div>
      `;
      
      const editButton = card.querySelector('[data-edit]');
      const deleteButton = card.querySelector('[data-delete]');
      const checkbox = card.querySelector('input[name="theme-select"][type="checkbox"]');
      
      if (editButton) {
        editButton.addEventListener('click', () => openEditCasinoModal(id));
      }
      if (deleteButton) {
        deleteButton.addEventListener('click', async () => {
          if (confirm(`¿Estás seguro de que deseas eliminar "${casino.label}"?`)) {
            if (api.removeCasino) {
              await api.removeCasino(id);
              await renderCasinos();
            }
          }
        });
      }
      if (checkbox) {
        checkbox.addEventListener('change', async () => {
          const checkboxes = document.querySelectorAll('input[name="theme-select"][type="checkbox"]');
          const selected = Array.from(checkboxes)
            .filter((cb) => cb.checked)
            .map((cb) => cb.value);
          
          if (!selected.length) {
            checkbox.checked = true;
            return;
          }
          
          if (api.setActiveCasinos) {
            await api.setActiveCasinos(selected);
          }
          await renderCasinos();
        });
      }
      
      container.appendChild(card);
    });
    initCasinoDragAndDrop(container);
    return;
  }
  Object.entries(casinos)
    .sort(([a], [b]) => {
      const aNum = parseInt((a.match(/(\d+)$/) || [])[0] || a, 10);
      const bNum = parseInt((b.match(/(\d+)$/) || [])[0] || b, 10);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.localeCompare(b);
    })
    .forEach(([id, casino]) => {
      const card = document.createElement('article');
      card.className = 'theme-card' + (casino.active ? ' is-active' : '');
      card.setAttribute('data-theme-card', id);
      card.innerHTML = `
        <img src="${casino.logo}" alt="Logo ${casino.label}" class="theme-card__logo" />
        <div>
          <h2>${casino.label}</h2>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="width: 16px; height: 16px; background: ${casino.color}; border-radius: 0.25rem; border: 1px solid rgba(255,255,255,0.3);"></div>
            <p>${casino.color}</p>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center; margin-left: auto;">
          <button type="button" class="btn-small btn-edit" data-edit="${id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;">Editar</button>
          <button type="button" class="btn-small btn-delete" data-delete="${id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;">Eliminar</button>
          <input type="checkbox" class="theme-checkbox ${id}" name="theme-select" value="${id}" ${casino.active ? 'checked' : ''} />
        </div>
      `;

      const editButton = card.querySelector('[data-edit]');
      const deleteButton = card.querySelector('[data-delete]');
      const checkbox = card.querySelector('input[name="theme-select"][type="checkbox"]');

      if (editButton) {
        editButton.addEventListener('click', () => openEditCasinoModal(id));
      }
      if (deleteButton) {
        deleteButton.addEventListener('click', async () => {
          if (confirm(`�Est�s seguro de que deseas eliminar "${casino.label}"?`)) {
            if (api.removeCasino) {
              await api.removeCasino(id);
              await renderCasinos();
            }
          }
        });
      }
      if (checkbox) {
        checkbox.addEventListener('change', async () => {
          const checkboxes = document.querySelectorAll('input[name="theme-select"][type="checkbox"]');
          const selected = Array.from(checkboxes)
            .filter((cb) => cb.checked)
            .map((cb) => cb.value);

          if (!selected.length) {
            checkbox.checked = true;
            return;
          }

          if (api.setActiveCasinos) {
            await api.setActiveCasinos(selected);
          }
          await renderCasinos();
        });
      }

      container.appendChild(card);
    });
  // Initialize drag & drop after cards are in DOM
  initCasinoDragAndDrop(container);
}

function initCasinoDragAndDrop(container) {
  if (!container) return;
  let isDragging = false;
  let dragged = null;
  let mirror = null;
  let placeholder = null;
  let startY = 0;
  let offsetY = 0;
  let rafId = null;
  let dragPointerId = null;
  const apiPromise = waitForCasinosApi();

  function getCards() {
    return Array.from(container.querySelectorAll('.theme-card'));
  }

  function createMirror(node, rect) {
    const m = node.cloneNode(true);
    m.classList.add('drag-mirror');
    m.style.width = rect.width + 'px';
    m.style.height = rect.height + 'px';
    m.style.left = rect.left + 'px';
    m.style.top = rect.top + 'px';
    m.style.transform = 'translate3d(0,0,0)';
    document.body.appendChild(m);
    return m;
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    const y = e.clientY;
    offsetY = y - startY;
    // determine where placeholder should be
    const cards = getCards().filter(c => c !== dragged && c !== placeholder);
    let insertBefore = null;
    for (const c of cards) {
      const r = c.getBoundingClientRect();
      const midpoint = r.top + r.height / 2;
      if (y < midpoint) {
        insertBefore = c;
        break;
      }
    }
    if (insertBefore) {
      if (container.firstChild !== placeholder || placeholder.nextSibling !== insertBefore) {
        container.insertBefore(placeholder, insertBefore);
      }
    } else {
      if (container.lastChild !== placeholder) {
        container.appendChild(placeholder);
      }
    }
  }

  function endDrag(success) {
    cancelAnimationFrame(rafId);
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    // restore user-select
    try { document.body.style.userSelect = ''; } catch (e) {}
    if (dragged && dragged.releasePointerCapture) {
      try { dragged.releasePointerCapture(dragPointerId); } catch (e) {}
    }
    if (mirror && mirror.parentNode) mirror.parentNode.removeChild(mirror);
    if (!dragged) return;
    dragged.classList.remove('dragging');
    dragged.style.transition = '';
    dragged.style.transform = '';
    dragged.style.display = dragged.dataset.originalDisplay || '';
    delete dragged.dataset.originalDisplay;
    // place the dragged element into the placeholder position (replace)
    if (placeholder && placeholder.parentNode) {
      try {
        placeholder.parentNode.replaceChild(dragged, placeholder);
      } catch (e) {
        // fallback
        container.insertBefore(dragged, placeholder);
        if (placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
      }
    }
    // persist new order
    apiPromise.then(async (api) => {
      if (api && api.setCasinoOrder) {
        const newOrder = Array.from(container.querySelectorAll('.theme-card')).map((el) => el.getAttribute('data-theme-card'));
        try {
          await api.setCasinoOrder(newOrder);
        } catch (e) {
          console.warn('Error saving new order', e);
        }
      }
    });
    isDragging = false;
    dragged = null;
    mirror = null;
    placeholder = null;
  }

  function onPointerUp(e) {
    endDrag(true);
  }

  function startDrag(e, card) {
    if (isDragging) return;
    isDragging = true;
    dragged = card;
    const rect = card.getBoundingClientRect();
    startY = e.clientY;
    // create placeholder
    placeholder = document.createElement('div');
    placeholder.className = 'theme-card placeholder';
    placeholder.style.height = rect.height + 'px';
    placeholder.style.width = rect.width + 'px';
    placeholder.style.boxSizing = 'border-box';
    // replace the dragged card with the placeholder so it leaves no blank gap
    container.replaceChild(placeholder, card);
    card.classList.add('dragging');
    card.dataset.originalDisplay = card.style.display || '';
    card.style.display = 'none';
    // prevent text selection while dragging
    try { document.body.style.userSelect = 'none'; } catch (e) {}
    // capture pointer
    let pointerId = e.pointerId || (e.pointerId === 0 ? 0 : null);
    if (pointerId != null && card.setPointerCapture) {
      try { card.setPointerCapture(pointerId); } catch (err) {}
      dragPointerId = pointerId;
    }
    mirror = createMirror(card, rect);

    // animate mirror via RAF for smoothness
    function animate() {
      if (mirror) {
        mirror.style.transform = `translate3d(0, ${offsetY}px, 0)`;
      }
      rafId = requestAnimationFrame(animate);
    }
    rafId = requestAnimationFrame(animate);

    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup', onPointerUp);
  }

  // attach pointer handlers
  container.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.theme-card');
    if (!card) return;
    // prevent starting drag when clicking edit/delete buttons or inputs
    if (e.target.closest('button') || e.target.closest('input')) return;
    // only primary button
    if (e.button && e.button !== 0) return;
    e.preventDefault();
    startDrag(e, card);
  });
}

function resetCasinoForm() {
  const form = document.getElementById('new-casino-form');
  if (!form) return;
  form.reset();
  document.getElementById('casino-id').value = '';
  document.getElementById('logo-preview').innerHTML = '';
  document.getElementById('mascot-preview').innerHTML = '';
  const submitButton = document.getElementById('casino-submit-button');
  if (submitButton) {
    submitButton.textContent = 'Crear Casino';
  }
  const title = document.getElementById('new-casino-title');
  if (title) {
    title.textContent = 'Crear Nuevo Casino';
  }
}

function openNewCasinoModal() {
  resetCasinoForm();
  const modal = document.getElementById('new-casino-modal');
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
}

async function openEditCasinoModal(casinoId) {
  const api = await waitForCasinosApi();
  const casino = api.getCasinos ? api.getCasinos()[casinoId] : null;
  if (!casino) {
    alert('No se encontr� el casino a editar.');
    return;
  }

  document.getElementById('casino-id').value = casinoId;
  document.getElementById('casino-name').value = casino.label || '';
  document.getElementById('casino-color').value = casino.color || '#FF1493';
  document.getElementById('logo-preview').innerHTML = casino.logo ? `<img src="${casino.logo}" alt="Logo preview" />` : '';
  document.getElementById('mascot-preview').innerHTML = casino.mascot ? `<img src="${casino.mascot}" alt="Mascota preview" />` : '';
  const submitButton = document.getElementById('casino-submit-button');
  if (submitButton) {
    submitButton.textContent = 'Guardar cambios';
  }
  const title = document.getElementById('new-casino-title');
  if (title) {
    title.textContent = 'Editar Casino';
  }

  const modal = document.getElementById('new-casino-modal');
  if (modal) {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function closeNewCasinoModal() {
  const modal = document.getElementById('new-casino-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}

function setupSettingsPage() {
  const openButton = document.getElementById('open-new-casino');
  const closeButton = document.getElementById('close-new-casino');
  const modal = document.getElementById('new-casino-modal');

  if (openButton) {
    openButton.addEventListener('click', openNewCasinoModal);
  }
  if (closeButton) {
    closeButton.addEventListener('click', closeNewCasinoModal);
  }
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeNewCasinoModal();
      }
    });
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && modal.classList.contains('is-open')) {
      closeNewCasinoModal();
    }
  });

  const saveLandingButton = document.getElementById('save-landing-content');
  if (saveLandingButton) {
    saveLandingButton.addEventListener('click', async () => {
      const api = await waitForCasinosApi();
      const payload = {
        accessBadge: document.getElementById('input-accessBadge').value,
        heroTitle: document.getElementById('input-heroTitle').value,
        heroCopy: document.getElementById('input-heroCopy').value,
        ctaLabel: document.getElementById('input-ctaLabel').value,
        whatsappUrl: document.getElementById('input-whatsappUrl').value,
        helperText: document.getElementById('input-helperText').value,
        footerText1: document.getElementById('input-footerText1').value,
        footerText2: document.getElementById('input-footerText2').value
      };

      if (api.setLandingContent) {
        api.setLandingContent(payload, false);
      }
      try {
        if (api.saveRemoteConfig) {
          await api.saveRemoteConfig({ landingContent: payload });
        }
        alert('Textos guardados correctamente.');
      } catch (error) {
        console.warn('No se pudo guardar de forma remota', error);
        alert('Error guardando en remoto.');
      }
    });
  }

  // When the user begins editing the CTA label, if the field value matches the
  // originally loaded value (likely the constant), replace it with the literal
  // 'WHATSAPP OFICIAL' as requested.
  const ctaInput = document.getElementById('input-ctaLabel');
  if (ctaInput) {
    ctaInput.addEventListener('focus', () => {
      try {
        const orig = ctaInput.dataset.original || '';
        if ((ctaInput.value || '') === orig) {
          ctaInput.value = 'WHATSAPP OFICIAL';
        }
      } catch (e) {
        // swallow
      }
    });
  }

  const resetLandingButton = document.getElementById('reset-landing-content');
  if (resetLandingButton) {
    resetLandingButton.addEventListener('click', async () => {
      if (!confirm('Restablecer los textos a los valores por defecto?')) {
        return;
      }

      const defaults = {
        accessBadge: 'ACCESO VIP',
        heroTitle: 'OBTENÉ UN <span class="gradient-text">EXTRA</span> EN TU <span class="gradient-text">PRIMER DEPÓSITO</span>',
        heroCopy: 'Escribinos apretando el botón de abajo',
        ctaLabel: 'WHATSAPP OFICIAL',
        // whatsappUrl intentionally omitted here; we'll preserve existing DB value when saving
        helperText: 'ATENCIÓN Y RETIROS LAS 24 HS',
        footerText1: 'Bono no extraíble, válido solo para slots. Mínimo de carga: $2.000.',
        footerText2: '© 2026 el juego es solo +18. Operá con responsabilidad.'
      };

      try {
        const api = await waitForCasinosApi();

        const firebaseModule = await import('./firebase.js');
        const firestoreModule = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');

        const { doc, getDoc, setDoc } = firestoreModule;

        const snapshot = await getDoc(doc(firebaseModule.db, 'config', 'landing'));
        const currentConfig = snapshot.exists() ? snapshot.data() : {};
        const preservedWhatsapp = currentConfig?.landingContent?.whatsappUrl || '';

        const toSave = {
          ...defaults,
          whatsappUrl: preservedWhatsapp
        };

        // Populate form with the final values (preserving whatsapp URL)
        populateForm(toSave);

        await setDoc(doc(firebaseModule.db, 'config', 'landing'), {
          ...currentConfig,
          landingContent: toSave
        });


        if (api.setLandingContent) {
          api.setLandingContent(toSave, false);
        }

        window.dispatchEvent(new CustomEvent('landingContent:ready', { detail: toSave }));
        alert('Textos restablecidos correctamente y guardados en la base de datos. (WhatsApp URL preservada)');
      } catch (error) {
        console.error('Error reseteando textos:', error);
        alert('Error al restablecer: ' + error.message);
      }
    });
  }
}

function populateForm(content) {
  if (!content) return;
  document.getElementById('input-accessBadge').value = content.accessBadge || '';
  document.getElementById('input-heroTitle').value = content.heroTitle || '';
  document.getElementById('input-heroCopy').value = content.heroCopy || '';
  const ctaEl = document.getElementById('input-ctaLabel');
  ctaEl.value = content.ctaLabel || '';
  // store original loaded value so we can detect edits and replace const-based defaults
  ctaEl.dataset.original = content.ctaLabel || '';
  if (Object.prototype.hasOwnProperty.call(content, 'whatsappUrl')) {
    document.getElementById('input-whatsappUrl').value = content.whatsappUrl || '';
  }
  document.getElementById('input-helperText').value = content.helperText || '';
  document.getElementById('input-footerText1').value = content.footerText1 || '';
  document.getElementById('input-footerText2').value = content.footerText2 || '';
}

function initSettings() {
  setupFilePreview('casino-logo', 'logo-preview');
  setupFilePreview('casino-mascot', 'mascot-preview');
  setupCasinoForm();
  setupSettingsPage();
}

window.renderCasinos = renderCasinos;
window.openEditCasinoModal = openEditCasinoModal;
window.closeNewCasinoModal = closeNewCasinoModal;

window.addEventListener('landingContent:ready', (event) => {
  populateForm(event.detail || {});
});

async function runOnReady() {
  try {
    if (window.casinosReady) {
      await window.casinosReady.catch(() => {});
    }

    const api = await waitForCasinosApi();

    // Prefer explicitly reading landingContent from Firestore so the settings
    // form shows the database values (not the local constants) as the source
    // of truth. Fallback to the API-provided values if Firestore read fails.
    let landingFromDb = null;
    try {
      const firebaseModule = await import('./firebase.js');
      const firestoreModule = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
      const { doc, getDoc } = firestoreModule;
      const snapshot = await getDoc(doc(firebaseModule.db, 'config', 'landing'));
      if (snapshot && snapshot.exists()) {
        const cfg = snapshot.data() || {};
        if (cfg.landingContent && typeof cfg.landingContent === 'object') {
          landingFromDb = cfg.landingContent;
        }
      }
    } catch (e) {
      console.warn('[settings] could not read landingContent from Firestore, falling back to API', e);
    }

    const remoteOrStored = landingFromDb || (api.getLandingContent && api.getLandingContent()) || (api.getStoredLandingContent && api.getStoredLandingContent());
    populateForm(remoteOrStored);

    initSettings();
    await renderCasinos();
  } catch (e) {
    console.error('[settings] runOnReady error', e);
  }
}

window.addEventListener('DOMContentLoaded', runOnReady);

// If the script is imported after DOMContentLoaded fired, run immediately
if (document.readyState !== 'loading') {
  runOnReady().catch((e) => console.error('[settings] runOnReady immediate error', e));
}
