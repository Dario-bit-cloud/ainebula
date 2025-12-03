# Librerie Utili Installate

Questo documento elenca tutte le librerie utili installate nel progetto Nebula AI e come utilizzarle.

---

## 📦 Librerie Installate

### 1. **Date & Time Utilities**

#### `date-fns` ⭐
- **Versione**: Latest
- **Uso**: Formattazione e manipolazione date
- **Documentazione**: https://date-fns.org/

**Esempio:**
```javascript
import { format, formatDistance, addDays } from 'date-fns';
import { it } from 'date-fns/locale';

// Formattazione
format(new Date(), 'dd/MM/yyyy', { locale: it });
// "27/11/2025"

// Distanza temporale
formatDistance(new Date(), addDays(new Date(), 7), { locale: it });
// "circa 7 giorni"
```

#### `dayjs`
- **Versione**: Latest
- **Uso**: Alternativa leggera a moment.js
- **Documentazione**: https://day.js.org/

**Esempio:**
```javascript
import dayjs from 'dayjs';
import 'dayjs/locale/it';

dayjs.locale('it');
dayjs().format('DD/MM/YYYY');
```

---

### 2. **Drag & Drop**

#### `svelte-dnd-action`
- **Versione**: Latest
- **Uso**: Drag & drop per liste e elementi
- **Documentazione**: https://github.com/isaacHagoel/svelte-dnd-action

**Esempio:**
```svelte
<script>
  import { dndzone } from 'svelte-dnd-action';
  let items = ['Item 1', 'Item 2', 'Item 3'];
</script>

<div use:dndzone={{ items, flipDurationMs: 150 }}>
  {#each items as item (item)}
    <div class="draggable">{item}</div>
  {/each}
</div>
```

---

### 3. **Debounce & Throttle**

#### `svelte-debounce`
- **Versione**: Latest
- **Uso**: Debounce reattivo per Svelte
- **Documentazione**: https://github.com/langbamit/svelte-debounce

**Esempio:**
```svelte
<script>
  import { debounce } from 'svelte-debounce';
  let searchQuery = '';
  
  $: debouncedSearch = debounce(searchQuery, 300);
  $: if (debouncedSearch) {
    // Esegui ricerca
  }
</script>

<input bind:value={searchQuery} />
```

#### `just-debounce-it`
- **Versione**: Latest
- **Uso**: Utility debounce semplice
- **Documentazione**: https://github.com/angus-c/just

**Esempio:**
```javascript
import debounce from 'just-debounce-it';

const debouncedSearch = debounce((query) => {
  console.log('Searching:', query);
}, 300);
```

#### `lodash.debounce`
- **Versione**: Latest
- **Uso**: Debounce da lodash (se preferisci lodash)
- **Documentazione**: https://lodash.com/docs/#debounce

**Esempio:**
```javascript
import debounce from 'lodash.debounce';

const debouncedFn = debounce(() => {
  // Funzione debounced
}, 300);
```

---

### 4. **Toast & Notifications**

#### `svelte-toast`
- **Versione**: Latest
- **Uso**: Sistema toast semplice per Svelte
- **Documentazione**: https://github.com/zerodevx/svelte-toast

**Esempio:**
```svelte
<script>
  import { toast } from 'svelte-toast';
  import Toast from 'svelte-toast/Toast.svelte';
</script>

<Toast />

<button on:click={() => toast.push('Messaggio di successo!', {
  theme: {
    '--toastBackground': '#10b981',
    '--toastColor': 'white'
  }
})}>
  Mostra Toast
</button>
```

---

### 5. **Copy to Clipboard**

#### `clipboard-copy`
- **Versione**: Latest
- **Uso**: Copia testo negli appunti
- **Documentazione**: https://github.com/feross/clipboard-copy

**Esempio:**
```javascript
import clipboardCopy from 'clipboard-copy';

async function copyToClipboard(text) {
  try {
    await clipboardCopy(text);
    console.log('Copiato!');
  } catch (err) {
    console.error('Errore:', err);
  }
}
```

---

### 6. **Tooltip**

#### `svelte-tooltip`
- **Versione**: Latest
- **Uso**: Tooltip semplici per Svelte
- **Documentazione**: https://github.com/beyonk-adventures/svelte-tooltip

**Esempio:**
```svelte
<script>
  import Tooltip from 'svelte-tooltip';
</script>

<button use:Tooltip="Tooltip text">
  Hover me
</button>
```

---

### 7. **Persistent Stores**

#### `svelte-persisted-store`
- **Versione**: Latest
- **Uso**: Store Svelte che persistono in localStorage
- **Documentazione**: https://github.com/joigle/svelte-persisted-store

**Esempio:**
```javascript
import { persisted } from 'svelte-persisted-store';
import { writable } from 'svelte/store';

export const userPreferences = persisted('userPrefs', {
  theme: 'dark',
  language: 'it'
});
```

---

### 8. **Error Tracking**

#### `@sentry/svelte`
- **Versione**: Latest
- **Uso**: Error tracking professionale
- **Documentazione**: https://docs.sentry.io/platforms/javascript/guides/svelte/

**Esempio:**
```javascript
import * as Sentry from '@sentry/svelte';

Sentry.init({
  dsn: 'YOUR_DSN_HERE',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0
});
```

---

### 9. **File Upload**

#### `svelte-file-dropzone`
- **Versione**: Latest
- **Uso**: Drag & drop per upload file
- **Documentazione**: https://github.com/rozie/svelte-file-dropzone

**Esempio:**
```svelte
<script>
  import FileDropzone from 'svelte-file-dropzone';
  
  function handleFiles(files) {
    console.log('Files dropped:', files);
  }
</script>

<FileDropzone on:files={handleFiles}>
  <p>Trascina file qui o clicca per selezionare</p>
</FileDropzone>
```

---

### 10. **Keyboard Shortcuts**

#### `mousetrap`
- **Versione**: Latest
- **Uso**: Gestione keyboard shortcuts
- **Documentazione**: https://github.com/ccampbell/mousetrap

**Esempio:**
```javascript
import Mousetrap from 'mousetrap';

Mousetrap.bind('ctrl+s', (e) => {
  e.preventDefault();
  console.log('Save!');
});

Mousetrap.bind('esc', () => {
  console.log('Escape pressed');
});
```

---

### 11. **Form Validation**

#### `svelte-forms-lib`
- **Versione**: Latest
- **Uso**: Validazione form dichiarativa
- **Documentazione**: https://github.com/tjinauyeung/svelte-forms-lib

**Esempio:**
```svelte
<script>
  import { createForm } from 'svelte-forms-lib';
  import { required, email, minLength } from 'svelte-forms-lib/validators';
  
  const { form, errors, handleSubmit } = createForm({
    validators: {
      email: [required, email],
      password: [required, minLength(6)]
    }
  });
</script>

<form on:submit={handleSubmit}>
  <input bind:value={$form.email} />
  {#if $errors.email}
    <span class="error">{$errors.email}</span>
  {/if}
</form>
```

#### `felte`
- **Versione**: Latest
- **Uso**: Form management avanzato
- **Documentazione**: https://felte.dev/

**Esempio:**
```svelte
<script>
  import { createForm } from 'felte';
  import { validate } from '@felte/validator-yup';
  import * as yup from 'yup';
  
  const schema = yup.object({
    email: yup.string().email().required(),
    password: yup.string().min(6).required()
  });
  
  const { form, errors } = createForm({
    validate: validate(schema)
  });
</script>
```

---

### 12. **Storage Avanzato**

#### `localforage`
- **Versione**: Latest
- **Uso**: Storage avanzato (IndexedDB, WebSQL, localStorage)
- **Documentazione**: https://localforage.github.io/localForage/

**Esempio:**
```javascript
import localforage from 'localforage';

// Configurazione
localforage.config({
  name: 'NebulaAI',
  storeName: 'nebula_storage'
});

// Salva
await localforage.setItem('key', 'value');

// Leggi
const value = await localforage.getItem('key');

// Rimuovi
await localforage.removeItem('key');
```

---

### 13. **Charts & Visualizations**

#### `svelte-chartjs`
- **Versione**: Latest
- **Uso**: Wrapper per Chart.js
- **Documentazione**: https://github.com/SauravKanchan/svelte-chartjs

**Esempio:**
```svelte
<script>
  import { Bar } from 'svelte-chartjs';
  
  const chartData = {
    labels: ['Gen', 'Feb', 'Mar'],
    datasets: [{
      label: 'Messaggi',
      data: [12, 19, 3]
    }]
  };
</script>

<Bar data={chartData} />
```

---

## 🎯 Esempi di Integrazione nel Progetto

### Sostituire il Toast Personalizzato

**Prima (App.svelte):**
```javascript
function showCopyNotification() {
  const toast = document.createElement('div');
  // ... codice personalizzato
}
```

**Dopo:**
```svelte
<script>
  import { toast } from 'svelte-toast';
  import Toast from 'svelte-toast/Toast.svelte';
</script>

<Toast />

<script>
  function showCopyNotification() {
    toast.push('✓ Codice copiato!', {
      theme: {
        '--toastBackground': '#10b981',
        '--toastColor': 'white'
      }
    });
  }
</script>
```

### Migliorare il Debounce nella Sidebar

**Prima (Sidebar.svelte):**
```javascript
let debounceTimer;
$: {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    // ricerca
  }, 150);
}
```

**Dopo:**
```svelte
<script>
  import { debounce } from 'svelte-debounce';
</script>

<script>
  let searchQuery = '';
  $: debouncedQuery = debounce(searchQuery, 150);
  $: if (debouncedQuery) {
    // esegui ricerca
  }
</script>
```

### Store Persistenti per Preferenze

**Prima:**
```javascript
import { writable } from 'svelte/store';

export const preferences = writable(
  JSON.parse(localStorage.getItem('prefs') || '{}')
);

preferences.subscribe(value => {
  localStorage.setItem('prefs', JSON.stringify(value));
});
```

**Dopo:**
```javascript
import { persisted } from 'svelte-persisted-store';

export const preferences = persisted('prefs', {
  theme: 'dark',
  language: 'it'
});
```

### Copy to Clipboard Migliorato

**Prima:**
```javascript
// Implementazione manuale
```

**Dopo:**
```javascript
import clipboardCopy from 'clipboard-copy';

async function copyCode(code) {
  try {
    await clipboardCopy(code);
    toast.push('Codice copiato!');
  } catch (err) {
    toast.push('Errore nella copia', { theme: { '--toastBackground': '#ef4444' } });
  }
}
```

---

## 📚 Link Utili

- [date-fns Documentation](https://date-fns.org/)
- [dayjs Documentation](https://day.js.org/)
- [svelte-dnd-action](https://github.com/isaacHagoel/svelte-dnd-action)
- [svelte-toast](https://github.com/zerodevx/svelte-toast)
- [Sentry Svelte](https://docs.sentry.io/platforms/javascript/guides/svelte/)
- [felte](https://felte.dev/)
- [localForage](https://localforage.github.io/localForage/)

---

## ⚠️ Note

- Alcune librerie richiedono Svelte 5 (come `svelte-sonner`, `@svelte-put/*`), quindi sono state escluse
- Le librerie sono state installate con `--legacy-peer-deps` per risolvere conflitti di versioni
- Per produzione, considera di configurare Sentry per error tracking
- `svelte-persisted-store` può sostituire molte implementazioni manuali di localStorage

---

## 🔄 Prossimi Passi

1. **Integrare svelte-toast** per sostituire i toast personalizzati
2. **Usare svelte-debounce** nella Sidebar per la ricerca
3. **Configurare Sentry** per error tracking in produzione
4. **Usare svelte-persisted-store** per preferenze utente
5. **Integrare clipboard-copy** per migliorare la copia del codice











