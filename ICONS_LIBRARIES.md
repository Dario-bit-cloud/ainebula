# Librerie di Icone Installate

Questo progetto include diverse librerie di icone per Svelte. Ecco come utilizzarle:

## 📦 Librerie Installate

### 1. **Lucide Svelte** ⭐ (Consigliata)
- **Pacchetto**: `lucide-svelte`
- **Collezione**: 1000+ icone moderne e coerenti
- **Stile**: Lineare, pulito
- **Documentazione**: https://lucide.dev/

**Esempio d'uso:**
```svelte
<script>
  import { Settings, BookOpen, Sparkles, Loader2 } from 'lucide-svelte';
</script>

<Settings size={18} color="currentColor" />
<BookOpen size={24} stroke-width={2} />
<Loader2 size={16} class="animate-spin" />
```

**Vantaggi:**
- Tree-shakeable (solo le icone usate vengono incluse)
- API semplice e intuitiva
- Supporto per animazioni
- Stile coerente

---

### 2. **Tabler Icons**
- **Pacchetto**: `@tabler/icons-svelte`
- **Collezione**: 4000+ icone
- **Stile**: Lineare, minimalista
- **Documentazione**: https://tabler.io/icons

**Esempio d'uso:**
```svelte
<script>
  import { IconSettings, IconBook, IconSparkles } from '@tabler/icons-svelte';
</script>

<IconSettings size={18} stroke={2} />
<IconBook size={24} />
```

**Vantaggi:**
- Collezione enorme
- Tutte le icone sono gratuite
- Stile uniforme

---

### 3. **Material Icons**
- **Pacchetto**: `svelte-material-icons`
- **Collezione**: Icone Material Design di Google
- **Stile**: Material Design
- **Documentazione**: https://fonts.google.com/icons

**Esempio d'uso:**
```svelte
<script>
  import Settings from 'svelte-material-icons/settings.svelte';
  import Book from 'svelte-material-icons/book.svelte';
</script>

<Settings size={18} />
<Book size={24} />
```

**Vantaggi:**
- Icone Material Design ufficiali
- Molto riconoscibili
- Ampia varietà

---

### 4. **Feather Icons**
- **Pacchetto**: `svelte-feather-icons`
- **Collezione**: 280+ icone
- **Stile**: Minimalista, elegante
- **Documentazione**: https://feathericons.com/

**Esempio d'uso:**
```svelte
<script>
  import { Settings, BookOpen } from 'svelte-feather-icons';
</script>

<Settings size={18} />
<BookOpen size={24} />
```

**Vantaggi:**
- Design minimalista
- Leggere e veloci
- Perfette per UI moderne

---

### 5. **Bootstrap Icons**
- **Pacchetto**: `svelte-bootstrap-icons`
- **Collezione**: 2000+ icone
- **Stile**: Bootstrap-style
- **Documentazione**: https://icons.getbootstrap.com/

**Esempio d'uso:**
```svelte
<script>
  import { Gear, Book } from 'svelte-bootstrap-icons';
</script>

<Gear size={18} />
<Book size={24} />
```

**Vantaggi:**
- Collezione completa
- Compatibile con Bootstrap
- Gratuite e open source

---

### 6. **Svelte Icons**
- **Pacchetto**: `svelte-icons`
- **Collezione**: Wrapper per varie librerie
- **Stile**: Varia in base alla libreria

**Esempio d'uso:**
```svelte
<script>
  import { FaSettings, FaBook } from 'svelte-icons/fa';
  import { MdSettings, MdBook } from 'svelte-icons/md';
</script>

<FaSettings size={18} />
<MdBook size={24} />
```

---

### 7. **Font Awesome (via svelte-awesome)**
- **Pacchetto**: `svelte-awesome`
- **Collezione**: Icone Font Awesome
- **Stile**: Font Awesome

**Esempio d'uso:**
```svelte
<script>
  import { faSettings, faBook } from '@fortawesome/free-solid-svg-icons';
  import { FontAwesomeIcon } from 'svelte-awesome';
</script>

<FontAwesomeIcon icon={faSettings} size="lg" />
<FontAwesomeIcon icon={faBook} />
```

---

### 8. **Octicons**
- **Pacchetto**: `svelte-octicons`
- **Collezione**: Icone GitHub Octicons
- **Stile**: GitHub style

**Esempio d'uso:**
```svelte
<script>
  import { Gear, Book } from 'svelte-octicons';
</script>

<Gear size={18} />
<Book size={24} />
```

---

## 🎯 Raccomandazioni

### Per la maggior parte dei casi: **Lucide Svelte**
- API più semplice
- Performance migliori
- Stile moderno e coerente
- Tree-shaking ottimizzato

### Per collezioni specifiche:
- **Material Design**: `svelte-material-icons`
- **Bootstrap**: `svelte-bootstrap-icons`
- **GitHub style**: `svelte-octicons`
- **Minimalista**: `svelte-feather-icons`

---

## 📝 Esempio Completo di Utilizzo

```svelte
<script>
  // Lucide (consigliata)
  import { Settings, BookOpen, Sparkles } from 'lucide-svelte';
  
  // Tabler
  import { IconSettings, IconBook } from '@tabler/icons-svelte';
  
  // Material
  import SettingsMaterial from 'svelte-material-icons/settings.svelte';
  
  // Feather
  import { Settings as FeatherSettings } from 'svelte-feather-icons';
  
  // Bootstrap
  import { Gear } from 'svelte-bootstrap-icons';
</script>

<div class="icon-showcase">
  <!-- Lucide -->
  <Settings size={18} />
  
  <!-- Tabler -->
  <IconSettings size={18} />
  
  <!-- Material -->
  <SettingsMaterial size={18} />
  
  <!-- Feather -->
  <FeatherSettings size={18} />
  
  <!-- Bootstrap -->
  <Gear size={18} />
</div>

<style>
  .icon-showcase {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
</style>
```

---

## 🔄 Migrazione da SVG Inline

Per sostituire gli SVG inline esistenti, cerca il path SVG e trova l'icona equivalente nella libreria scelta.

**Prima (SVG inline):**
```svelte
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"/>
</svg>
```

**Dopo (Lucide):**
```svelte
<script>
  import { Settings } from 'lucide-svelte';
</script>

<Settings size={18} />
```

---

## 📚 Link Utili

- [Lucide Icons](https://lucide.dev/)
- [Tabler Icons](https://tabler.io/icons)
- [Material Icons](https://fonts.google.com/icons)
- [Feather Icons](https://feathericons.com/)
- [Bootstrap Icons](https://icons.getbootstrap.com/)
- [Octicons](https://primer.style/octicons/)






