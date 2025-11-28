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
      if (selectedModel === 'kontext' && imageToImageUrl) {
        // Se è un data URL, dobbiamo convertirlo in un URL pubblico
        // Per ora, usiamo il data URL direttamente (Pollinations potrebbe non supportarlo)
        // In produzione, dovresti caricare l'immagine su un server pubblico
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
          <p class="header-subtitle">Crea immagini straordinarie con l'intelligenza artificiale</p>
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
          <span>Rate limit: 1 richiesta ogni 15 secondi per utenti anonimi.</span>
          {#if numImages > 1}
            <span class="time-estimate">Tempo stimato: ~{Math.ceil((numImages - 1) * 15 / 60)} minuti</span>
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
      {#if generatedImages.length > 0}
        <div class="gallery">
          <div class="gallery-header">
            <div class="gallery-title">
              <CheckCircle2 size={20} class="success-icon" />
              <h3>Immagini Generate</h3>
            </div>
            <span class="gallery-count">{generatedImages.length} {generatedImages.length === 1 ? 'immagine' : 'immagini'}</span>
          </div>
          <div class="images-grid">
            {#each generatedImages as image, index}
              {#if image.error}
                <div class="image-error">
                  <AlertCircle size={24} />
                  <p>Errore: {image.error}</p>
                </div>
              {:else}
                <div class="image-card">
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
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
    overflow-y: auto;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    background: var(--bg-primary, #ffffff);
    border-radius: 16px;
    width: 100%;
    max-width: 900px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 24px;
    border-bottom: 1px solid var(--border-color, #e5e5e5);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
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
    background: rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    flex-shrink: 0;
  }

  .header-content h2 {
    margin: 0 0 4px 0;
    font-size: 24px;
    font-weight: 700;
  }

  .header-subtitle {
    margin: 0;
    font-size: 14px;
    opacity: 0.9;
    font-weight: 400;
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    cursor: pointer;
    color: white;
    padding: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }

  .close-btn:active {
    transform: scale(0.95);
  }

  .modal-body {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  }

  .error-message {
    padding: 12px 16px;
    background: #fee2e2;
    color: #dc2626;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-left: 3px solid #dc2626;
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
    font-weight: 600;
    color: var(--text-primary, #171717);
    font-size: 14px;
  }

  .label-with-icon {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .label-with-icon :global(svg) {
    color: #667eea;
    flex-shrink: 0;
  }

  .label-hint {
    display: block;
    font-weight: 400;
    font-size: 12px;
    color: var(--text-secondary, #525252);
    margin-top: 2px;
  }

  .input-hint {
    font-size: 12px;
    color: var(--text-secondary, #525252);
    margin-top: 6px;
    line-height: 1.4;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .input-hint kbd {
    background: var(--bg-tertiary, #e5e5e5);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-family: monospace;
    border: 1px solid var(--border-color, #d4d4d4);
  }

  .warning-hint {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.1);
    padding: 8px 12px;
    border-radius: 6px;
    margin-top: 8px;
    border-left: 3px solid #f59e0b;
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
    padding: 12px;
    border: 2px solid var(--border-color, #d4d4d4);
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    background: var(--bg-primary, #ffffff);
    color: var(--text-primary, #171717);
    transition: all 0.2s;
  }

  .select-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .select-wrapper select {
    width: 100%;
    padding: 12px 40px 12px 12px;
    border: 2px solid var(--border-color, #d4d4d4);
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    background: var(--bg-primary, #ffffff);
    color: var(--text-primary, #171717);
    transition: all 0.2s;
    appearance: none;
    cursor: pointer;
  }

  .select-icon {
    position: absolute;
    right: 12px;
    pointer-events: none;
    color: var(--text-secondary, #525252);
  }

  .input-group textarea:focus,
  .input-group input:focus,
  .select-wrapper select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
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
    padding: 10px 12px;
    background: #eff6ff;
    border-left: 3px solid #3b82f6;
    border-radius: 4px;
    font-size: 13px;
    color: #1e40af;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .info-box :global(svg) {
    flex-shrink: 0;
    color: #3b82f6;
  }

  .file-upload-area {
    position: relative;
    border: 2px dashed var(--border-color, #d4d4d4);
    border-radius: 8px;
    padding: 40px;
    text-align: center;
    transition: all 0.2s;
    cursor: pointer;
  }

  .file-upload-area:hover {
    border-color: #667eea;
    background: var(--bg-secondary, #f5f5f5);
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
    font-size: 14px;
    color: var(--text-secondary, #525252);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .file-upload-label :global(svg) {
    color: #667eea;
  }

  .upload-hint {
    font-size: 12px;
    opacity: 0.7;
  }

  .image-preview {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid var(--border-color, #d4d4d4);
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
    background: rgba(220, 38, 38, 0.9);
    color: white;
    border: none;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .remove-image-btn:hover {
    background: rgba(220, 38, 38, 1);
    transform: scale(1.1);
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
    gap: 10px;
    background: var(--bg-secondary, #f5f5f5);
    border: 2px solid var(--border-color, #d4d4d4);
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
    color: var(--text-primary, #171717);
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
    width: 100%;
    justify-content: flex-start;
  }

  .toggle-btn:hover {
    background: var(--bg-tertiary, #e5e5e5);
    border-color: #667eea;
    color: #667eea;
  }

  .toggle-btn :global(svg) {
    flex-shrink: 0;
  }

  .advanced-options {
    margin-top: 16px;
    padding: 16px;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
    border: 1px solid var(--border-color, #d4d4d4);
  }

  .checkbox-group {
    margin-bottom: 16px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-primary, #171717);
    padding: 8px;
    border-radius: 6px;
    transition: background 0.2s;
  }

  .checkbox-label:hover {
    background: var(--bg-secondary, #f5f5f5);
  }

  .checkbox-label :global(svg) {
    flex-shrink: 0;
    color: #667eea;
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
    padding: 14px 28px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .btn :global(svg) {
    flex-shrink: 0;
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--bg-tertiary, #e5e5e5);
    color: var(--text-primary, #171717);
  }

  .btn-secondary:hover {
    background: var(--bg-secondary, #f5f5f5);
  }

  .generating-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 16px;
    color: var(--text-secondary, #525252);
    font-size: 14px;
  }

  .spinning {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .gallery {
    margin-top: 32px;
    padding-top: 32px;
    border-top: 2px solid var(--border-color, #e5e5e5);
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
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary, #171717);
  }

  .success-icon {
    color: #10b981;
  }

  .gallery-count {
    font-size: 14px;
    color: var(--text-secondary, #525252);
    background: var(--bg-secondary, #f5f5f5);
    padding: 4px 12px;
    border-radius: 12px;
  }

  .images-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }

  .image-card {
    border: 2px solid var(--border-color, #d4d4d4);
    border-radius: 12px;
    overflow: hidden;
    background: var(--bg-primary, #ffffff);
    transition: all 0.2s;
  }

  .image-card:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .image-wrapper {
    width: 100%;
    background: var(--bg-secondary, #f5f5f5);
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
    transition: transform 0.3s;
  }

  .image-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s;
  }

  .image-card:hover .image-overlay {
    opacity: 1;
  }

  .image-card:hover .image-wrapper img {
    transform: scale(1.05);
  }

  .btn-overlay {
    background: rgba(255, 255, 255, 0.9);
    border: none;
    border-radius: 8px;
    padding: 10px;
    cursor: pointer;
    color: #171717;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .btn-overlay:hover {
    background: white;
    transform: scale(1.1);
  }

  .image-info {
    padding: 16px;
  }

  .image-title {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #171717);
  }

  .image-meta {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .meta-item {
    font-size: 11px;
    color: var(--text-secondary, #525252);
    background: var(--bg-secondary, #f5f5f5);
    padding: 4px 8px;
    border-radius: 4px;
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
    background: #667eea;
    color: white;
    flex: 1;
  }

  .btn-download:hover {
    background: #5568d3;
    transform: translateY(-1px);
  }

  .image-error {
    padding: 24px;
    background: #fee2e2;
    color: #dc2626;
    border-radius: 12px;
    text-align: center;
    border: 2px solid #fecaca;
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
