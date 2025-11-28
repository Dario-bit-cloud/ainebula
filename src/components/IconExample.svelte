<!-- 
  File di esempio che mostra come utilizzare tutte le librerie di icone installate.
  Questo file può essere usato come riferimento per vedere tutte le opzioni disponibili.
-->

<script>
  // 1. Lucide Svelte (Consigliata) ⭐
  import { Settings, BookOpen, Sparkles, Loader2, User, Home } from 'lucide-svelte';
  
  // 2. Tabler Icons
  import { IconSettings, IconBook, IconSparkles, IconLoader, IconUser, IconHome } from '@tabler/icons-svelte';
  
  // 3. Material Icons
  import SettingsMaterial from 'svelte-material-icons/settings.svelte';
  import BookMaterial from 'svelte-material-icons/book.svelte';
  import HomeMaterial from 'svelte-material-icons/home.svelte';
  
  // 4. Feather Icons
  import { Settings as FeatherSettings, BookOpen as FeatherBook, Home as FeatherHome } from 'svelte-feather-icons';
  
  // 5. Bootstrap Icons
  import { Gear, Book, House } from 'svelte-bootstrap-icons';
  
  // 6. Octicons
  import { Gear as OcticonGear, Book as OcticonBook, Home as OcticonHome } from 'svelte-octicons';
</script>

<div class="icon-showcase">
  <h2>Librerie di Icone Disponibili</h2>
  
  <section class="library-section">
    <h3>1. Lucide Svelte ⭐ (Consigliata)</h3>
    <div class="icon-grid">
      <div class="icon-item">
        <Settings size={24} />
        <span>Settings</span>
      </div>
      <div class="icon-item">
        <BookOpen size={24} />
        <span>BookOpen</span>
      </div>
      <div class="icon-item">
        <Sparkles size={24} />
        <span>Sparkles</span>
      </div>
      <div class="icon-item">
        <Loader2 size={24} class="spinning" />
        <span>Loader2 (animato)</span>
      </div>
    </div>
    <code>import { Settings } from 'lucide-svelte';</code>
  </section>

  <section class="library-section">
    <h3>2. Tabler Icons</h3>
    <div class="icon-grid">
      <div class="icon-item">
        <IconSettings size={24} />
        <span>IconSettings</span>
      </div>
      <div class="icon-item">
        <IconBook size={24} />
        <span>IconBook</span>
      </div>
      <div class="icon-item">
        <IconSparkles size={24} />
        <span>IconSparkles</span>
      </div>
      <div class="icon-item">
        <IconLoader size={24} class="spinning" />
        <span>IconLoader</span>
      </div>
    </div>
    <code>import { IconSettings } from '@tabler/icons-svelte';</code>
  </section>

  <section class="library-section">
    <h3>3. Material Icons</h3>
    <div class="icon-grid">
      <div class="icon-item">
        <SettingsMaterial size={24} />
        <span>Settings</span>
      </div>
      <div class="icon-item">
        <BookMaterial size={24} />
        <span>Book</span>
      </div>
      <div class="icon-item">
        <HomeMaterial size={24} />
        <span>Home</span>
      </div>
    </div>
    <code>import Settings from 'svelte-material-icons/settings.svelte';</code>
  </section>

  <section class="library-section">
    <h3>4. Feather Icons</h3>
    <div class="icon-grid">
      <div class="icon-item">
        <FeatherSettings size={24} />
        <span>Settings</span>
      </div>
      <div class="icon-item">
        <FeatherBook size={24} />
        <span>BookOpen</span>
      </div>
      <div class="icon-item">
        <FeatherHome size={24} />
        <span>Home</span>
      </div>
    </div>
    <code>import { Settings } from 'svelte-feather-icons';</code>
  </section>

  <section class="library-section">
    <h3>5. Bootstrap Icons</h3>
    <div class="icon-grid">
      <div class="icon-item">
        <Gear size={24} />
        <span>Gear</span>
      </div>
      <div class="icon-item">
        <Book size={24} />
        <span>Book</span>
      </div>
      <div class="icon-item">
        <House size={24} />
        <span>House</span>
      </div>
    </div>
    <code>import { Gear } from 'svelte-bootstrap-icons';</code>
  </section>

  <section class="library-section">
    <h3>6. Octicons (GitHub Style)</h3>
    <div class="icon-grid">
      <div class="icon-item">
        <OcticonGear size={24} />
        <span>Gear</span>
      </div>
      <div class="icon-item">
        <OcticonBook size={24} />
        <span>Book</span>
      </div>
      <div class="icon-item">
        <OcticonHome size={24} />
        <span>Home</span>
      </div>
    </div>
    <code>import { Gear } from 'svelte-octicons';</code>
  </section>

  <section class="library-section">
    <h3>7. Svelte Awesome (Font Awesome)</h3>
    <div class="icon-grid">
      <p class="note">Richiede installazione aggiuntiva di @fortawesome/free-solid-svg-icons</p>
      <code>npm install @fortawesome/free-solid-svg-icons</code>
    </div>
  </section>
</div>

<style>
  .icon-showcase {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  h2 {
    font-size: 2rem;
    margin-bottom: 2rem;
    color: #1f2937;
  }

  .library-section {
    margin-bottom: 3rem;
    padding: 1.5rem;
    background: #f9fafb;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .library-section h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: #374151;
  }

  .icon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1.5rem;
    margin-bottom: 1rem;
  }

  .icon-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: white;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .icon-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .icon-item span {
    font-size: 0.875rem;
    color: #6b7280;
    text-align: center;
  }

  code {
    display: block;
    padding: 0.75rem;
    background: #1f2937;
    color: #10b981;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    overflow-x: auto;
  }

  .spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .note {
    color: #6b7280;
    font-style: italic;
    margin: 0.5rem 0;
  }
</style>


