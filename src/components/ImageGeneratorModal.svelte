<script>
  import { onMount } from 'svelte';
  import { generateImage, generateMultipleImages, AVAILABLE_MODELS, AVAILABLE_SIZES, parseSize } from '../services/imageGenerationService.js';
  import { isImageGeneratorOpen } from '../stores/app.js';
  import { 
    Sparkles, X, AlertCircle, PenTool, Bot, Image as ImageIcon, 
    Ruler, Hash, Zap, Lock, Eye, ChevronDown, ChevronRight, 
    Download, Loader2, Upload, XCircle, Settings, Wand2, 
    Grid3x3, Info, Clock, CheckCircle2
  } from 'lucide-svelte';

  // State
  let prompt = '';
  let selectedModel = 'flux';
  let selectedSize = '1024x1024';
  let seed = '';
  let enhance = false;
  let isPrivate = false;
  let numImages = 1;
  let isGenerating = false;
  let generatedImages = [];
  let error = null;
  let abortController = null;
  let showAdvanced = false;

  // Image-to-image
  let imageToImageUrl = '';
  let imageToImageFile = null;
  let showImageToImage = false;

  // Load saved values from localStorage
  onMount(() => {
    prompt = localStorage.getItem('pollinations_prompt') || '';
    selectedModel = localStorage.getItem('pollinations_model') || 'flux';
    selectedSize = localStorage.getItem('pollinations_size') || '1024x1024';
    seed = localStorage.getItem('pollinations_seed') || '';
    enhance = localStorage.getItem('pollinations_enhance') === 'true';
    isPrivate = localStorage.getItem('pollinations_private') === 'true';
    numImages = parseInt(localStorage.getItem('pollinations_numImages') || '1');
    showAdvanced = localStorage.getItem('pollinations_showAdvanced') === 'true';
  });

  // Save to localStorage
  function saveToLocalStorage() {
    localStorage.setItem('pollinations_prompt', prompt);
    localStorage.setItem('pollinations_model', selectedModel);
    localStorage.setItem('pollinations_size', selectedSize);
    localStorage.setItem('pollinations_seed', seed);
    localStorage.setItem('pollinations_enhance', enhance.toString());
    localStorage.setItem('pollinations_private', isPrivate.toString());
    localStorage.setItem('pollinations_numImages', numImages.toString());
    localStorage.setItem('pollinations_showAdvanced', showAdvanced.toString());
  }

  // Watch for changes and save
  $: if (prompt !== undefined) saveToLocalStorage();
  $: if (selectedModel !== undefined) saveToLocalStorage();
  $: if (selectedSize !== undefined) saveToLocalStorage();
  $: if (seed !== undefined) saveToLocalStorage();
  $: if (enhance !== undefined) saveToLocalStorage();
  $: if (isPrivate !== undefined) saveToLocalStorage();
  $: if (numImages !== undefined) saveToLocalStorage();
  $: if (showAdvanced !== undefined) saveToLocalStorage();

  // Handle image upload for image-to-image
  function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error = 'Per favore seleziona un file immagine valido';
      return;
    }

    imageToImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imageToImageUrl = e.target.result;
      // Se l'immagine è caricata, cambia automaticamente il modello a kontext
      if (selectedModel !== 'kontext') {
        selectedModel = 'kontext';
      }
    };
    reader.readAsDataURL(file);
  }

  function removeImageToImage() {
    imageToImageUrl = '';
    imageToImageFile = null;
    if (selectedModel === 'kontext') {
      selectedModel = 'flux';
    }
  }

  async function generateImages() {
    if (!prompt.trim()) {
      error = 'Inserisci un prompt per generare le immagini';
      return;
    }

    // Per image-to-image, serve un'immagine
    if (selectedModel === 'kontext' && !imageToImageUrl) {
      error = 'Per usare il modello Kontext (image-to-image), carica prima un\'immagine';
      return;
    }

    isGenerating = true;
    error = null;
    generatedImages = [];
    abortController = new AbortController();

    try {
      const { width, height } = parseSize(selectedSize);
      
      // Prepara le opzioni
      const options = {
        model: selectedModel,
        width,
        height,
        enhance,
        private: isPrivate
      };

      // Aggiungi seed se specificato
      if (seed.trim()) {
        const seedNum = parseInt(seed);
        if (!isNaN(seedNum)) {
          options.seed = seedNum;
        }
      }

      // Per image-to-image, aggiungi l'URL dell'immagine
      // Il servizio convertirà automaticamente il data URL in un URL pubblico
      if (selectedModel === 'kontext' && imageToImageUrl) {
        options.image = imageToImageUrl;
      }

      let results;
      if (numImages === 1) {
        const result = await generateImage(prompt, options, abortController);
        results = [result];
      } else {
        results = await generateMultipleImages(prompt, numImages, options, abortController);
      }

      generatedImages = results.map((result, index) => ({
        ...result,
        index: index + 1,
        title: `Immagine ${index + 1}`
      }));

    } catch (err) {
      error = err.message || 'Errore durante la generazione delle immagini';
      console.error('Errore generazione:', err);
    } finally {
      isGenerating = false;
      abortController = null;
    }
  }

  function cancelGeneration() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    isGenerating = false;
  }

  function downloadImage(imageData, index) {
    try {
      // Se abbiamo il blob, usalo direttamente
      if (imageData.blob) {
        const url = URL.createObjectURL(imageData.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pollinations-image-${index}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (imageData.imageUrl) {
        // Altrimenti scarica dall'URL
        fetch(imageData.imageUrl)
          .then(res => res.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pollinations-image-${index}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          })
          .catch(err => {
            console.error('Errore download:', err);
            error = 'Errore durante il download dell\'immagine';
          });
      }
    } catch (err) {
      console.error('Errore download:', err);
      error = 'Errore durante il download dell\'immagine';
    }
  }

  function closeModal() {
    isImageGeneratorOpen.set(false);
  }

  function handlePromptKeydown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      generateImages();
    }
  }

  // Cleanup URLs quando il componente viene distrutto
  import { onDestroy } from 'svelte';
  onDestroy(() => {
    generatedImages.forEach(img => {
      if (img.imageUrl && img.imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.imageUrl);
      }
    });
  });
</script>

<div class="modal-overlay" on:click={closeModal} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
  <div class="modal-content" on:click|stopPropagation>
    <div class="modal-header">
      <div class="header-content">
        <div class="header-icon">
          <Sparkles size={28} />
        </div>
        <div>
          <h2>Generatore Immagini AI</h2>
        </div>
      </div>
      <button class="close-btn" on:click={closeModal} title="Chiudi">
        <X size={20} />
      </button>
    </div>

    <div class="modal-body">
      {#if error}
        <div class="error-message">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      {/if}

      <!-- Prompt Input -->
      <div class="input-group">
        <label for="prompt" class="label-with-icon">
          <PenTool size={18} />
          <span>Prompt</span>
        </label>
        <div class="label-hint">Descrivi l'immagine che vuoi generare</div>
        <div class="textarea-wrapper">
          <textarea
            id="prompt"
            bind:value={prompt}
            placeholder="Es: A serene mountain landscape at sunrise with vibrant colors..."
            rows="4"
            on:keydown={handlePromptKeydown}
            disabled={isGenerating}
          ></textarea>
        </div>
        <div class="input-hint">
          <span>Premi <kbd>Ctrl</kbd> + <kbd>Enter</kbd> per generare</span>
        </div>
      </div>

      <!-- Model Selection -->
      <div class="input-group">
        <label for="model" class="label-with-icon">
          <Bot size={18} />
          <span>Modello</span>
        </label>
        <div class="select-wrapper">
          <select id="model" bind:value={selectedModel} disabled={isGenerating}>
            {#each AVAILABLE_MODELS as model}
              <option value={model.value}>{model.label}</option>
            {/each}
          </select>
          <ChevronDown size={18} class="select-icon" />
        </div>
        {#if selectedModel === 'kontext'}
          <div class="info-box">
            <Info size={16} />
            <span>Il modello Kontext richiede un'immagine di input per la trasformazione</span>
          </div>
        {/if}
      </div>

      <!-- Image-to-Image Upload -->
      {#if selectedModel === 'kontext' || showImageToImage}
        <div class="input-group">
          <label for="imageUpload" class="label-with-icon">
            <ImageIcon size={18} />
            <span>Immagine di Input (Image-to-Image)</span>
          </label>
          <div class="label-hint">Carica un'immagine da trasformare</div>
          {#if imageToImageUrl}
            <div class="image-preview">
              <img src={imageToImageUrl} alt="Preview" />
              <button class="remove-image-btn" on:click={removeImageToImage} title="Rimuovi immagine">
                <XCircle size={20} />
              </button>
            </div>
          {:else}
            <div class="file-upload-area">
              <input
                type="file"
                id="imageUpload"
                accept="image/*"
                on:change={handleImageUpload}
                disabled={isGenerating}
              />
              <label for="imageUpload" class="file-upload-label">
                <Upload size={32} />
                <span>Clicca per caricare un'immagine</span>
                <span class="upload-hint">o trascina qui</span>
              </label>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Size Selection -->
      <div class="input-group">
        <label for="size" class="label-with-icon">
          <Ruler size={18} />
          <span>Dimensioni</span>
        </label>
        <div class="select-wrapper">
          <select id="size" bind:value={selectedSize} disabled={isGenerating}>
            {#each AVAILABLE_SIZES as size}
              <option value={size.value}>{size.label}</option>
            {/each}
          </select>
          <ChevronDown size={18} class="select-icon" />
        </div>
      </div>

      <!-- Number of Images -->
      <div class="input-group">
        <label for="numImages" class="label-with-icon">
          <Grid3x3 size={18} />
          <span>Numero di Immagini</span>
        </label>
        <div class="select-wrapper">
          <select id="numImages" bind:value={numImages} disabled={isGenerating}>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>
          <ChevronDown size={18} class="select-icon" />
        </div>
        <div class="input-hint warning-hint">
          <Clock size={14} />
          <span>Rate limit: 1 richiesta ogni 15 secondi per utenti anonimi. Il sistema gestisce automaticamente i retry e rispetta i limiti.</span>
          {#if numImages > 1}
            <span class="time-estimate">Tempo stimato: ~{Math.ceil((numImages - 1) * 15 / 60)} minuti (con gestione automatica del rate limit)</span>
          {/if}
        </div>
      </div>

      <!-- Advanced Options Toggle -->
      <div class="advanced-toggle">
        <button
          class="toggle-btn"
          on:click={() => showAdvanced = !showAdvanced}
          disabled={isGenerating}
        >
          {#if showAdvanced}
            <ChevronDown size={18} />
          {:else}
            <ChevronRight size={18} />
          {/if}
          <Settings size={18} />
          <span>Opzioni Avanzate</span>
        </button>
      </div>

      {#if showAdvanced}
        <div class="advanced-options">
          <!-- Seed -->
          <div class="input-group">
            <label for="seed" class="label-with-icon">
              <Hash size={18} />
              <span>Seed (Opzionale)</span>
            </label>
            <div class="label-hint">Numero per risultati consistenti</div>
            <input
              type="number"
              id="seed"
              bind:value={seed}
              placeholder="Es: 12345"
              disabled={isGenerating}
            />
          </div>

          <!-- Enhance -->
          <div class="input-group checkbox-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                bind:checked={enhance}
                disabled={isGenerating}
              />
              <Wand2 size={18} />
              <span>Migliora automaticamente il prompt</span>
            </label>
          </div>

          <!-- Private -->
          <div class="input-group checkbox-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                bind:checked={isPrivate}
                disabled={isGenerating}
              />
              <Lock size={18} />
              <span>Nascondi dai feed pubblici</span>
            </label>
          </div>
        </div>
      {/if}

      <!-- Generate Button -->
      <div class="actions">
        {#if isGenerating}
          <button class="btn btn-secondary" on:click={cancelGeneration}>
            <X size={18} />
            <span>Annulla Generazione</span>
          </button>
          <div class="generating-indicator">
            <Loader2 size={20} class="spinning" />
            <span>Generazione in corso...</span>
            <div class="generating-progress">
              <div class="progress-bar"></div>
            </div>
          </div>
        {:else}
          <button
            class="btn btn-primary"
            on:click={generateImages}
            disabled={!prompt.trim() || (selectedModel === 'kontext' && !imageToImageUrl)}
          >
            <Sparkles size={18} />
            <span>Genera Immagini</span>
          </button>
        {/if}
      </div>

      <!-- Generated Images Gallery -->
      {#if generatedImages.length > 0 || isGenerating}
        <div class="gallery">
          <div class="gallery-header">
            <div class="gallery-title">
              {#if isGenerating}
                <Loader2 size={20} class="spinning success-icon" />
                <h3>Generazione in corso...</h3>
              {:else}
                <CheckCircle2 size={20} class="success-icon" />
                <h3>Immagini Generate</h3>
              {/if}
            </div>
            {#if !isGenerating}
              <span class="gallery-count">{generatedImages.length} {generatedImages.length === 1 ? 'immagine' : 'immagini'}</span>
            {/if}
          </div>
          <div class="images-grid">
            {#each generatedImages as image, index}
              {#if image.error}
                <div class="image-error">
                  <AlertCircle size={24} />
                  <p>Errore: {image.error}</p>
                </div>
              {:else}
                <div class="image-card" style="animation: fadeInScale 0.5s ease-out {index * 0.1}s both;">
                  <div class="image-wrapper">
                    <img src={image.imageUrl} alt={image.title} loading="lazy" />
                    <div class="image-overlay">
                      <button
                        class="btn-overlay btn-download-overlay"
                        on:click={() => downloadImage(image, index + 1)}
                        title="Scarica immagine"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                  <div class="image-info">
                    <p class="image-title">{image.title}</p>
                    <div class="image-meta">
                      <span class="meta-item">
                        <Bot size={12} />
                        {image.model}
                      </span>
                      <span class="meta-item">
                        <Ruler size={12} />
                        {image.width}×{image.height}
                      </span>
                    </div>
                    <div class="image-actions">
                      <button
                        class="btn-small btn-download"
                        on:click={() => downloadImage(image, index + 1)}
                      >
                        <Download size={16} />
                        <span>Scarica</span>
                      </button>
                    </div>
                  </div>
                </div>
              {/if}
            {/each}
            {#if isGenerating}
              {#each Array(numImages - generatedImages.length) as _, i}
                <div class="image-card image-placeholder">
                  <div class="image-wrapper placeholder-wrapper">
                    <div class="image-skeleton">
                      <Loader2 size={32} class="spinning" />
                      <div class="skeleton-shimmer"></div>
                    </div>
                  </div>
                  <div class="image-info">
                    <div class="skeleton-text"></div>
                    <div class="skeleton-meta">
                      <div class="skeleton-badge"></div>
                      <div class="skeleton-badge"></div>
                    </div>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* Material Design 3 Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--md-sys-color-scrim);
    opacity: 0.8;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
    overflow-y: auto;
    backdrop-filter: blur(8px);
    animation: fadeIn var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-content {
    background-color: #FFFBFE;
    background: var(--md-sys-color-surface, #FFFBFE);
    border-radius: var(--md-sys-shape-corner-extra-large);
    width: 100%;
    max-width: 900px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--md-sys-elevation-level5);
    overflow: hidden;
    animation: slideUp var(--md-sys-motion-duration-medium4) var(--md-sys-motion-easing-emphasized);
  }
  
  @media (prefers-color-scheme: dark) {
    .modal-content {
      background-color: #1C1B1F;
      background: var(--md-sys-color-surface-dark, #1C1B1F);
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 24px;
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
  }

  .header-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    border-radius: var(--md-sys-shape-corner-medium);
    flex-shrink: 0;
  }

  .header-content h2 {
    margin: 0 0 4px 0;
    font-family: var(--md-sys-typescale-headline-medium-font);
    font-size: var(--md-sys-typescale-headline-medium-size);
    font-weight: var(--md-sys-typescale-headline-medium-weight);
    line-height: var(--md-sys-typescale-headline-medium-line-height);
    letter-spacing: var(--md-sys-typescale-headline-medium-tracking);
    color: var(--md-sys-color-on-primary);
  }

  .header-subtitle {
    margin: 0;
    font-size: 14px;
    opacity: 0.9;
    font-weight: 400;
  }

  .close-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--md-sys-color-on-primary);
    padding: 8px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--md-sys-shape-corner-small);
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    flex-shrink: 0;
  }

  .close-btn:hover {
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
  }

  .close-btn:active {
    transform: scale(0.95);
  }

  .modal-body {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
    background-color: #FFFBFE;
    background: var(--md-sys-color-surface, #FFFBFE);
    color: var(--md-sys-color-on-surface, #1C1B1F);
  }
  
  @media (prefers-color-scheme: dark) {
    .modal-body {
      background-color: #1C1B1F;
      background: var(--md-sys-color-surface-dark, #1C1B1F);
      color: var(--md-sys-color-on-surface-dark, #E6E1E5);
    }
  }

  .error-message {
    padding: 16px;
    background: var(--md-sys-color-error-container);
    color: var(--md-sys-color-on-error-container);
    border-radius: var(--md-sys-shape-corner-medium);
    margin-bottom: 24px;
    font-family: var(--md-sys-typescale-body-medium-font);
    font-size: var(--md-sys-typescale-body-medium-size);
    font-weight: var(--md-sys-typescale-body-medium-weight);
    line-height: var(--md-sys-typescale-body-medium-line-height);
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid var(--md-sys-color-error);
  }

  .error-message :global(svg) {
    flex-shrink: 0;
  }

  .input-group {
    margin-bottom: 20px;
  }

  .input-group label {
    display: block;
    margin-bottom: 8px;
    font-family: var(--md-sys-typescale-label-large-font);
    font-size: var(--md-sys-typescale-label-large-size);
    font-weight: var(--md-sys-typescale-label-large-weight);
    line-height: var(--md-sys-typescale-label-large-line-height);
    color: var(--md-sys-color-on-surface);
  }

  .label-with-icon {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .label-with-icon :global(svg) {
    color: var(--md-sys-color-primary);
    flex-shrink: 0;
  }

  .label-hint {
    display: block;
    font-family: var(--md-sys-typescale-body-small-font);
    font-size: var(--md-sys-typescale-body-small-size);
    font-weight: var(--md-sys-typescale-body-small-weight);
    color: var(--md-sys-color-on-surface-variant);
    margin-top: 4px;
  }

  .input-hint {
    font-family: var(--md-sys-typescale-body-small-font);
    font-size: var(--md-sys-typescale-body-small-size);
    color: var(--md-sys-color-on-surface-variant);
    margin-top: 8px;
    line-height: 1.4;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .input-hint kbd {
    background: var(--md-sys-color-surface-container-high);
    padding: 4px 8px;
    border-radius: var(--md-sys-shape-corner-extra-small);
    font-size: 11px;
    font-family: monospace;
    border: 1px solid var(--md-sys-color-outline-variant);
    color: var(--md-sys-color-on-surface);
  }

  .warning-hint {
    color: var(--md-sys-color-on-surface-variant);
    background: var(--md-sys-color-surface-container);
    padding: 12px 16px;
    border-radius: var(--md-sys-shape-corner-small);
    margin-top: 8px;
    border: 1px solid var(--md-sys-color-outline-variant);
  }

  .warning-hint :global(svg) {
    flex-shrink: 0;
  }

  .time-estimate {
    display: block;
    margin-top: 4px;
    font-weight: 500;
  }

  .textarea-wrapper {
    position: relative;
  }

  .input-group textarea,
  .input-group input[type="text"],
  .input-group input[type="number"] {
    width: 100%;
    padding: 16px;
    border: 1px solid var(--md-sys-color-outline);
    border-radius: var(--md-sys-shape-corner-small);
    font-family: var(--md-sys-typescale-body-large-font);
    font-size: var(--md-sys-typescale-body-large-size);
    font-weight: var(--md-sys-typescale-body-large-weight);
    line-height: var(--md-sys-typescale-body-large-line-height);
    background: var(--md-sys-color-surface-container-high);
    color: var(--md-sys-color-on-surface);
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
  }

  .select-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .select-wrapper select {
    width: 100%;
    padding: 16px 48px 16px 16px;
    border: 1px solid var(--md-sys-color-outline);
    border-radius: var(--md-sys-shape-corner-small);
    font-family: var(--md-sys-typescale-body-large-font);
    font-size: var(--md-sys-typescale-body-large-size);
    font-weight: var(--md-sys-typescale-body-large-weight);
    line-height: var(--md-sys-typescale-body-large-line-height);
    background: var(--md-sys-color-surface-container-high);
    color: var(--md-sys-color-on-surface);
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    appearance: none;
    cursor: pointer;
  }

  .select-icon {
    position: absolute;
    right: 16px;
    pointer-events: none;
    color: var(--md-sys-color-on-surface-variant);
  }

  .input-group textarea:focus,
  .input-group input:focus,
  .select-wrapper select:focus {
    outline: none;
    border-color: var(--md-sys-color-primary);
    box-shadow: 0 0 0 1px var(--md-sys-color-primary);
  }

  .input-group textarea {
    resize: vertical;
    min-height: 100px;
  }

  .input-group textarea:disabled,
  .input-group input:disabled,
  .select-wrapper select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .info-box {
    margin-top: 8px;
    padding: 12px 16px;
    background: var(--md-sys-color-secondary-container);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-small);
    font-family: var(--md-sys-typescale-body-medium-font);
    font-size: var(--md-sys-typescale-body-medium-size);
    color: var(--md-sys-color-on-secondary-container);
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .info-box :global(svg) {
    flex-shrink: 0;
    color: var(--md-sys-color-secondary);
  }

  .file-upload-area {
    position: relative;
    border: 2px dashed var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-medium);
    padding: 40px;
    text-align: center;
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    cursor: pointer;
    background: var(--md-sys-color-surface-container-low);
  }

  .file-upload-area:hover {
    border-color: var(--md-sys-color-primary);
    background: var(--md-sys-color-surface-container);
  }

  .file-upload-area input[type="file"] {
    position: absolute;
    opacity: 0;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    cursor: pointer;
  }

  .file-upload-label {
    pointer-events: none;
    font-family: var(--md-sys-typescale-body-large-font);
    font-size: var(--md-sys-typescale-body-large-size);
    color: var(--md-sys-color-on-surface-variant);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .file-upload-label :global(svg) {
    color: var(--md-sys-color-primary);
  }

  .upload-hint {
    font-size: 12px;
    opacity: 0.7;
  }

  .image-preview {
    position: relative;
    border-radius: var(--md-sys-shape-corner-medium);
    overflow: hidden;
    border: 1px solid var(--md-sys-color-outline-variant);
  }

  .image-preview img {
    width: 100%;
    height: auto;
    display: block;
    max-height: 300px;
    object-fit: contain;
  }

  .remove-image-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: var(--md-sys-color-error-container);
    color: var(--md-sys-color-on-error-container);
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    box-shadow: var(--md-sys-elevation-level2);
  }

  .remove-image-btn:hover {
    background: var(--md-sys-color-error);
    color: var(--md-sys-color-on-error);
    box-shadow: var(--md-sys-elevation-level3);
  }

  .remove-image-btn:active {
    transform: scale(0.95);
  }

  .advanced-toggle {
    margin-bottom: 20px;
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--md-sys-color-surface-container-low);
    border: 1px solid var(--md-sys-color-outline-variant);
    padding: 12px 16px;
    border-radius: var(--md-sys-shape-corner-small);
    cursor: pointer;
    color: var(--md-sys-color-on-surface);
    font-family: var(--md-sys-typescale-label-large-font);
    font-size: var(--md-sys-typescale-label-large-size);
    font-weight: var(--md-sys-typescale-label-large-weight);
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    width: 100%;
    justify-content: flex-start;
  }

  .toggle-btn:hover {
    background: var(--md-sys-color-surface-container);
    border-color: var(--md-sys-color-primary);
    color: var(--md-sys-color-primary);
  }

  .toggle-btn :global(svg) {
    flex-shrink: 0;
  }

  .advanced-options {
    margin-top: 16px;
    padding: 16px;
    background: var(--md-sys-color-surface-container-low);
    border-radius: var(--md-sys-shape-corner-medium);
    border: 1px solid var(--md-sys-color-outline-variant);
  }

  .checkbox-group {
    margin-bottom: 16px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    font-family: var(--md-sys-typescale-body-large-font);
    font-size: var(--md-sys-typescale-body-large-size);
    color: var(--md-sys-color-on-surface);
    padding: 8px;
    border-radius: var(--md-sys-shape-corner-small);
    transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
  }

  .checkbox-label:hover {
    background: var(--md-sys-color-surface-container);
  }

  .checkbox-label :global(svg) {
    flex-shrink: 0;
    color: var(--md-sys-color-primary);
  }

  .checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .actions {
    margin-top: 24px;
    margin-bottom: 24px;
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: var(--md-sys-shape-corner-small);
    font-family: var(--md-sys-typescale-label-large-font);
    font-size: var(--md-sys-typescale-label-large-size);
    font-weight: var(--md-sys-typescale-label-large-weight);
    line-height: var(--md-sys-typescale-label-large-line-height);
    cursor: pointer;
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 40px;
  }

  .btn :global(svg) {
    flex-shrink: 0;
  }

  .btn-primary {
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    box-shadow: var(--md-sys-elevation-level1);
  }

  .btn-primary:hover:not(:disabled) {
    box-shadow: var(--md-sys-elevation-level2);
    transform: translateY(-1px);
  }

  .btn-primary:active:not(:disabled) {
    box-shadow: var(--md-sys-elevation-level1);
    transform: translateY(0);
  }

  .btn-primary:disabled {
    opacity: 0.38;
    cursor: not-allowed;
    box-shadow: none;
  }

  .btn-secondary {
    background: var(--md-sys-color-secondary-container);
    color: var(--md-sys-color-on-secondary-container);
  }

  .btn-secondary:hover {
    box-shadow: var(--md-sys-elevation-level1);
  }

  .generating-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 16px;
    color: var(--text-secondary, #525252);
    font-size: 14px;
  }

  .generating-progress {
    width: 200px;
    height: 4px;
    background-color: var(--border-color, #e5e7eb);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 8px;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
    background-size: 200% 100%;
    animation: progress-shimmer 2s linear infinite;
    width: 100%;
  }

  @keyframes progress-shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  .spinning {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .image-placeholder {
    opacity: 0.7;
  }

  .placeholder-wrapper {
    position: relative;
    overflow: hidden;
  }

  .image-skeleton {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--bg-secondary, #f3f4f6) 0%, var(--bg-tertiary, #e5e7eb) 100%);
    position: relative;
    overflow: hidden;
  }

  .skeleton-shimmer {
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }

  .skeleton-text {
    height: 16px;
    width: 60%;
    background: var(--bg-secondary, #f3f4f6);
    border-radius: 4px;
    margin-bottom: 8px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton-meta {
    display: flex;
    gap: 8px;
  }

  .skeleton-badge {
    height: 20px;
    width: 80px;
    background: var(--bg-secondary, #f3f4f6);
    border-radius: 10px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }

  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .gallery {
    margin-top: 32px;
    padding-top: 32px;
    border-top: 1px solid var(--md-sys-color-outline-variant);
  }

  .gallery-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .gallery-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .gallery-title h3 {
    margin: 0;
    font-family: var(--md-sys-typescale-headline-small-font);
    font-size: var(--md-sys-typescale-headline-small-size);
    font-weight: var(--md-sys-typescale-headline-small-weight);
    line-height: var(--md-sys-typescale-headline-small-line-height);
    color: var(--md-sys-color-on-surface);
  }

  .success-icon {
    color: var(--md-sys-color-primary);
  }

  .gallery-count {
    font-family: var(--md-sys-typescale-label-medium-font);
    font-size: var(--md-sys-typescale-label-medium-size);
    color: var(--md-sys-color-on-surface-variant);
    background: var(--md-sys-color-surface-container-high);
    padding: 6px 12px;
    border-radius: var(--md-sys-shape-corner-small);
  }

  .images-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }

  .image-card {
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-large);
    overflow: hidden;
    background: var(--md-sys-color-surface-container);
    transition: all var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
    box-shadow: var(--md-sys-elevation-level1);
  }

  .image-card:hover {
    box-shadow: var(--md-sys-elevation-level3);
    transform: translateY(-2px);
    border-color: var(--md-sys-color-primary);
  }

  .image-wrapper {
    width: 100%;
    background: var(--md-sys-color-surface-container-low);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    position: relative;
    overflow: hidden;
  }

  .image-wrapper img {
    width: 100%;
    height: auto;
    display: block;
    max-height: 400px;
    object-fit: contain;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform;
  }

  .image-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--md-sys-color-scrim);
    opacity: 0.6;
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
  }

  .image-card:hover .image-overlay {
    opacity: 1;
  }

  .image-card:hover .image-wrapper img {
    transform: scale(1.08);
  }

  .btn-overlay {
    background: var(--md-sys-color-surface-container);
    backdrop-filter: blur(8px);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-small);
    padding: 12px 16px;
    cursor: pointer;
    color: var(--md-sys-color-on-surface);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    box-shadow: var(--md-sys-elevation-level2);
    font-family: var(--md-sys-typescale-label-large-font);
    font-size: var(--md-sys-typescale-label-large-size);
    font-weight: var(--md-sys-typescale-label-large-weight);
  }

  .btn-overlay:hover {
    background: var(--md-sys-color-surface-container-high);
    transform: scale(1.02) translateY(-1px);
    box-shadow: var(--md-sys-elevation-level3);
    border-color: var(--md-sys-color-primary);
  }

  .btn-overlay:active {
    transform: scale(0.98) translateY(0);
  }

  .image-info {
    padding: 16px;
  }

  .image-title {
    margin: 0 0 8px 0;
    font-family: var(--md-sys-typescale-title-small-font);
    font-size: var(--md-sys-typescale-title-small-size);
    font-weight: var(--md-sys-typescale-title-small-weight);
    line-height: var(--md-sys-typescale-title-small-line-height);
    color: var(--md-sys-color-on-surface);
  }

  .image-meta {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .meta-item {
    font-family: var(--md-sys-typescale-label-small-font);
    font-size: var(--md-sys-typescale-label-small-size);
    color: var(--md-sys-color-on-surface-variant);
    background: var(--md-sys-color-surface-container-high);
    padding: 4px 8px;
    border-radius: var(--md-sys-shape-corner-extra-small);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .meta-item :global(svg) {
    flex-shrink: 0;
  }

  .image-actions {
    display: flex;
    gap: 8px;
  }

  .btn-small {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .btn-small :global(svg) {
    flex-shrink: 0;
  }

  .btn-download {
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    flex: 1;
  }

  .btn-download:hover {
    box-shadow: var(--md-sys-elevation-level2);
    transform: translateY(-1px);
  }

  .image-error {
    padding: 24px;
    background: var(--md-sys-color-error-container);
    color: var(--md-sys-color-on-error-container);
    border-radius: var(--md-sys-shape-corner-medium);
    text-align: center;
    border: 1px solid var(--md-sys-color-error);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .image-error :global(svg) {
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .modal-content {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
    }

    .modal-header {
      padding: 16px;
    }

    .header-content {
      gap: 12px;
    }

    .header-icon {
      width: 40px;
      height: 40px;
    }

    .header-content h2 {
      font-size: 20px;
    }

    .header-subtitle {
      font-size: 12px;
    }

    .modal-body {
      padding: 16px;
    }

    .input-group {
      margin-bottom: 16px;
    }

    .label-with-icon {
      font-size: 13px;
    }

    .label-with-icon :global(svg) {
      width: 16px;
      height: 16px;
    }

    .images-grid {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .gallery-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .gallery-title h3 {
      font-size: 18px;
    }

    .btn {
      padding: 12px 20px;
      font-size: 14px;
    }

    .btn-small {
      padding: 6px 12px;
      font-size: 12px;
    }

    .file-upload-area {
      padding: 30px 20px;
    }

    .file-upload-label {
      font-size: 13px;
    }

    .advanced-options {
      padding: 12px;
    }
  }
</style>
