// Módulo de scripts específicos de settings.html

// Comprimir imagen base64
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

// Helper to wait for la API de casinos disponible
async function waitForCasinosApi(timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const apiCandidate = window.landingSettings && (window.landingSettings.addCasino || window.landingSettings.getCasinos || window.landingSettings.setActiveCasinos)
      ? window.landingSettings
      : (window.casinosAPI && (window.casinosAPI.addCasino || window.casinosAPI.getCasinos || window.casinosAPI.setActiveCasinos))
        ? window.casinosAPI
        : null;

    if (apiCandidate) {
      return apiCandidate;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (window.landingSettings || window.casinosAPI) {
    console.warn('waitForCasinosApi: fallback returned existing global API object', { landingSettings: window.landingSettings, casinosAPI: window.casinosAPI });
    return window.landingSettings || window.casinosAPI;
  }

  console.error('waitForCasinosApi: no casinos API available after timeout');
  return {};
}

function setupFilePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    preview.innerHTML = '';
    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      preview.innerHTML = '<p style="color: #ff6b6b; font-size: 0.8rem;">⚠️ Archivo muy grande (máx 2MB)</p>';
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target.result;
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
  const maxFileSize = 2 * 1024 * 1024;
  if (logoFile && logoFile.size > maxFileSize) {
    alert(`Logo muy grande (${(logoFile.size / 1024 / 1024).toFixed(2)}MB). Máximo: 2MB`);
    return false;
  }
  if (mascotFile && mascotFile.size > maxFileSize) {
    alert(`Mascota muy grande (${(mascotFile.size / 1024 / 1024).toFixed(2)}MB). Máximo: 2MB`);
    return false;
  }
  return true;
}

function setupCasinoForm() {
  const form = document.getElementById('new-casino-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const { casinoId, name, logoFile, mascotFile, color } = getFormValues();

    if (window.casinosReady) {
      await window.casinosReady.catch(() => {});
    }

    const api = await waitForCasinosApi();
    const addCasinoFn = api.addCasino || null;
    if (!addCasinoFn) {
      console.error('API de casinos no disponible', { windowLandingSettings: window.landingSettings, windowCasinosAPI: window.casinosAPI });
      alert('API de casinos no disponible. Recargá la página e intentá de nuevo.');
      return;
    }

    console.log('Nueva acción de casino', { casinoId, name, logoFile, mascotFile, color, apiAvailable: !!addCasinoFn });

    const existingCasino = casinoId ? (api.getCasinos && api.getCasinos()[casinoId]) : null;
    if (casinoId && !existingCasino) {
      alert('No se encontró el casino a editar.');
      return;
    }

    if (!casinoId && (!logoFile || !mascotFile)) {
      alert('Por favor carga tanto el logo como la mascota');
      return;
    }

    if (!validateFiles(logoFile, mascotFile)) {
      return;
    }

    const logoReader = new FileReader();
    const mascotReader = new FileReader();
    let logoData;
    let mascotData;
    let filesProcessed = 0;
    const needLogo = !!logoFile;
    const needMascot = !!mascotFile;

    const processComplete = async () => {
      filesProcessed++;
      console.log('processComplete', { filesProcessed, needLogo, needMascot, logoData, mascotData });
      if (filesProcessed !== (needLogo ? 1 : 0) + (needMascot ? 1 : 0)) {
        return;
      }

      try {
        const finalLogo = logoData || (existingCasino ? existingCasino.logo : null);
        const finalMascot = mascotData || (existingCasino ? existingCasino.mascot : null);

        console.log('finalLogo/finalMascot ready', { finalLogo: !!finalLogo, finalMascot: !!finalMascot });
        if (!finalLogo || !finalMascot) {
          alert('Por favor carga tanto el logo como la mascota');
          return;
        }

        const compressedLogo = logoData ? await compressImage(logoData, 400, 400, 0.7) : finalLogo;
        const compressedMascot = mascotData ? await compressImage(mascotData, 600, 600, 0.7) : finalMascot;
        console.log('compressed images ready', { compressedLogo: typeof compressedLogo, compressedMascot: typeof compressedMascot });

        const saveCasino = api.addCasino || window.landingSettings?.addCasino || window.casinosAPI?.addCasino;
        if (!saveCasino) {
          console.error('saveCasino not found after processing');
          alert('API de casinos no disponible. Recargá la página e intentá de nuevo.');
          return;
        }

        try {
          const newCasinoId = await saveCasino(casinoId || null, name, compressedLogo, compressedMascot, color);
          console.log('Casino guardado correctamente', { newCasinoId, name });
          alert(casinoId ? '✅ Casino actualizado exitosamente' : '✅ Casino creado exitosamente');
          await renderCasinos();
          form.reset();
          document.getElementById('casino-id').value = '';
          document.getElementById('logo-preview').innerHTML = '';
          document.getElementById('mascot-preview').innerHTML = '';
          closeNewCasinoModal();
        } catch (error) {
          console.error('Error guardando casino:', error);
          alert('❌ Error guardando casino: ' + (error?.message || error));
        }
      } catch (error) {
        alert('❌ Error procesando imágenes: ' + error.message);
        console.error(error);
      }
    };

    logoReader.onload = (event) => {
      logoData = event.target.result;
      processComplete();
    };
    mascotReader.onload = (event) => {
      mascotData = event.target.result;
      processComplete();
    };
    logoReader.onerror = () => alert('Error al leer el logo');
    mascotReader.onerror = () => alert('Error al leer la mascota');

    if (needLogo) logoReader.readAsDataURL(logoFile);
    if (needMascot) mascotReader.readAsDataURL(mascotFile);
    if (!needLogo && !needMascot) processComplete();
  });
}

async function renderCasinos() {
  const api = await waitForCasinosApi();
  const casinos = (api.getCasinos && api.getCasinos()) || {};
  const container = document.getElementById('casinos-container');
  container.innerHTML = '';

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

      container.appendChild(card);

      card.querySelector(`[data-delete="${id}"]`).addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm(`¿Estás seguro de que deseas eliminar "${casino.label}"?`)) {
          if (api.removeCasino) {
            await api.removeCasino(id);
            await renderCasinos();
          }
        }
      });

      card.querySelector(`[data-edit="${id}"]`).addEventListener('click', (e) => {
        e.preventDefault();
        if (window.openEditCasinoModal) {
          window.openEditCasinoModal(id);
        }
      });
    });

  const checkboxes = document.querySelectorAll('input[name="theme-select"][type="checkbox"]');
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', async () => {
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

      renderCasinos();
    });
  });
}

function populateForm(content) {
  if (!content) return;
  document.getElementById('input-accessBadge').value = content.accessBadge || '';
  document.getElementById('input-heroTitle').value = content.heroTitle || '';
  document.getElementById('input-heroCopy').value = content.heroCopy || '';
  document.getElementById('input-ctaLabel').value = content.ctaLabel || '';
  document.getElementById('input-helperText').value = content.helperText || '';
  document.getElementById('input-footerText1').value = content.footerText1 || '';
  document.getElementById('input-footerText2').value = content.footerText2 || '';
}

window.addEventListener('landingContent:ready', (e) => {
  populateForm(e.detail || {});
});

function setupSettingsPage() {
  const modal = document.getElementById('new-casino-modal');
  const openNewCasino = document.getElementById('open-new-casino');
  const closeNewCasino = document.getElementById('close-new-casino');
  const modalTitle = document.getElementById('new-casino-title');

  function resetCasinoForm() {
    document.getElementById('new-casino-form').reset();
    document.getElementById('casino-id').value = '';
    document.getElementById('logo-preview').innerHTML = '';
    document.getElementById('mascot-preview').innerHTML = '';
    modalTitle.textContent = 'Crear Nuevo Casino';
  }

  function openNewCasinoModal() {
    resetCasinoForm();
    document.getElementById('casino-submit-button').textContent = 'Crear Casino';
    modalTitle.textContent = 'Crear Nuevo Casino';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('casino-name').focus();
  }

  async function openEditCasinoModal(casinoId) {
    const api = await waitForCasinosApi();
    const casino = api.getCasinos ? api.getCasinos()[casinoId] : null;
    if (!casino) {
      alert('No se encontró el casino a editar.');
      return;
    }
    document.getElementById('casino-id').value = casinoId;
    document.getElementById('casino-name').value = casino.label || '';
    document.getElementById('casino-color').value = casino.color || '#FF1493';
    document.getElementById('logo-preview').innerHTML = casino.logo ? `<img src="${casino.logo}" alt="Logo preview" />` : '';
    document.getElementById('mascot-preview').innerHTML = casino.mascot ? `<img src="${casino.mascot}" alt="Mascota preview" />` : '';
    document.getElementById('casino-submit-button').textContent = 'Guardar cambios';
    modalTitle.textContent = 'Editar Casino';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('casino-name').focus();
  }

  function closeNewCasinoModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  openNewCasino.addEventListener('click', () => openNewCasinoModal());
  closeNewCasino.addEventListener('click', () => closeNewCasinoModal());
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeNewCasinoModal();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeNewCasinoModal();
    }
  });

  window.closeNewCasinoModal = closeNewCasinoModal;
  window.openEditCasinoModal = openEditCasinoModal;

  document.getElementById('save-landing-content').addEventListener('click', async () => {
    const api = await waitForCasinosApi();
    const payload = {
      accessBadge: document.getElementById('input-accessBadge').value,
      heroTitle: document.getElementById('input-heroTitle').value,
      heroCopy: document.getElementById('input-heroCopy').value,
      ctaLabel: document.getElementById('input-ctaLabel').value,
      helperText: document.getElementById('input-helperText').value,
      footerText1: document.getElementById('input-footerText1').value,
      footerText2: document.getElementById('input-footerText2').value
    };

    if (api.setLandingContent) api.setLandingContent(payload, false);
    try {
      if (api.saveRemoteConfig) {
        await api.saveRemoteConfig({ landingContent: payload });
      }
      alert('Textos guardados correctamente.');
    } catch (e) {
      console.warn('No se pudo guardar de forma remota', e);
      alert('Error guardando en remoto.');
    }
  });

  document.getElementById('reset-landing-content').addEventListener('click', async () => {
    if (!confirm('Restablecer los textos a los valores por defecto?')) return;
    location.reload();
  });
}

function initSettings() {
  setupFilePreview('casino-logo', 'logo-preview');
  setupFilePreview('casino-mascot', 'mascot-preview');
  setupCasinoForm();
  setupSettingsPage();
}

window.renderCasinos = renderCasinos;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.casinosReady) {
    await window.casinosReady.catch(() => {});
  }

  const api = await waitForCasinosApi();
  if (!api || typeof api !== 'object') {
    console.error('No se pudo inicializar la API de casinos.');
  }

  const remoteOrStored = (api.getLandingContent && api.getLandingContent()) || (api.getStoredLandingContent && api.getStoredLandingContent());
  populateForm(remoteOrStored);

  await renderCasinos();

  initSettings();
});
