# 🔧 Fix Deploy Vercel - Problema Integrazione GitHub

## Problema
I commit vengono pushati su GitHub ma Vercel non avvia automaticamente i deploy.

## Soluzione Passo-Passo

### 1. Verifica Connessione Repository su Vercel

1. Vai su https://vercel.com/dashboard
2. Seleziona il progetto `ainebula` (o creane uno nuovo se non esiste)
3. Vai su **Settings** → **Git**
4. Verifica che il repository sia: `Dario-bit-cloud/ainebula`
5. Verifica che il **Production Branch** sia: `main`

### 2. Riconnetti il Repository (se necessario)

1. In **Settings** → **Git**
2. Clicca **Disconnect** (se già connesso)
3. Clicca **Connect Git Repository**
4. Seleziona **GitHub**
5. Autorizza Vercel se richiesto
6. Seleziona il repository: `Dario-bit-cloud/ainebula`
7. Configura:
   - **Production Branch**: `main`
   - **Root Directory**: `.` (lasciare vuoto o mettere `.`)
   - **Framework Preset**: `Other` o `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci --prefer-offline --no-audit --legacy-peer-deps`

### 3. Verifica Webhook su GitHub

1. Vai su GitHub → `Dario-bit-cloud/ainebula`
2. Vai su **Settings** → **Webhooks**
3. Cerca webhook di Vercel (dovrebbe essere `https://api.vercel.com/v1/integrations/deploy/...`)
4. Se non c'è, Vercel lo creerà automaticamente quando riconnetterai
5. Se c'è ma è rosso/fallito, clicca su di esso e verifica gli ultimi delivery

### 4. Verifica App GitHub di Vercel

1. Vai su GitHub → **Settings** → **Applications** → **Installed GitHub Apps**
2. Cerca **Vercel**
3. Verifica che abbia accesso al repository `ainebula`
4. Se non c'è o non ha accesso:
   - Vai su https://vercel.com/account/integrations
   - Clicca su **GitHub** → **Configure**
   - Seleziona il repository `ainebula`
   - Autorizza

### 5. Test Manuale del Deploy

Dopo aver riconnesso, fai un commit di test:

```bash
git commit --allow-empty -m "Test Vercel deployment"
git push
```

Poi controlla su Vercel Dashboard se appare un nuovo deploy.

### 6. Verifica Build Settings

Su Vercel Dashboard → **Settings** → **Build & Development Settings**:

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm ci --prefer-offline --no-audit --legacy-peer-deps`
- **Development Command**: (lasciare vuoto o `npm run dev`)
- **Framework Preset**: `Other` o `Vite`

### 7. Verifica Environment Variables

Assicurati che tutte le variabili d'ambiente necessarie siano configurate:
- `DATABASE_URL`
- `JWT_SECRET`
- `WEBAUTHN_RP_ID` (opzionale)
- `WEBAUTHN_ORIGIN` (opzionale)
- `WEBAUTHN_RP_NAME` (opzionale)

### 8. Se Nulla Funziona - Deploy Manuale

Se dopo tutti questi passaggi non funziona ancora:

1. Installa Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Link progetto: `vercel link`
4. Deploy: `vercel --prod`

## Checklist Finale

- [ ] Repository GitHub collegato su Vercel
- [ ] Branch di produzione: `main`
- [ ] Webhook GitHub attivo e funzionante
- [ ] App Vercel installata su GitHub con permessi corretti
- [ ] Build settings configurati correttamente
- [ ] Environment variables configurate
- [ ] Test commit pushato e deploy avviato

## Contatto Supporto

Se dopo tutti questi passaggi il problema persiste:
1. Vai su https://vercel.com/support
2. Apri un ticket spiegando che i commit GitHub non triggerano deploy automatici
3. Fornisci:
   - Nome progetto: `ainebula`
   - Repository: `Dario-bit-cloud/ainebula`
   - Branch: `main`
   - Screenshot delle impostazioni Git su Vercel

