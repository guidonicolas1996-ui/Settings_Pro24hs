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
      return candidate;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (window.landingSettings || window.casinosAPI) {
    return window.landingSettings || window.casinosAPI;
  }

  console.error('waitForCasinosApi: no casinos API disponible.');
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
        console.log('Casino guardado correctamente', { newCasinoId, name });
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

  const resetLandingButton = document.getElementById('reset-landing-content');
  if (resetLandingButton) {
    resetLandingButton.addEventListener('click', () => {
      if (confirm('Restablecer los textos a los valores por defecto?')) {
        location.reload();
      }
    });
  }
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

window.addEventListener('DOMContentLoaded', async () => {
  if (window.casinosReady) {
    await window.casinosReady.catch(() => {});
  }

  const api = await waitForCasinosApi();
  const remoteOrStored = (api.getLandingContent && api.getLandingContent()) || (api.getStoredLandingContent && api.getStoredLandingContent());
  populateForm(remoteOrStored);

  initSettings();
  await renderCasinos();
});
