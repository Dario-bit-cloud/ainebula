<script>
  import TopBar from './components/TopBar.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import MainArea from './components/MainArea.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import InviteModal from './components/InviteModal.svelte';
  import ProjectModal from './components/ProjectModal.svelte';
  import UserMenu from './components/UserMenu.svelte';
  import PremiumModal from './components/PremiumModal.svelte';
  import AISettingsModal from './components/AISettingsModal.svelte';
  import PromptLibraryModal from './components/PromptLibraryModal.svelte';
  import VoiceSelectModal from './components/VoiceSelectModal.svelte';
  import VoiceModeView from './components/VoiceModeView.svelte';
  import ShortcutsModal from './components/ShortcutsModal.svelte';
  import ReportBugModal from './components/ReportBugModal.svelte';
  import { selectedPrompt } from './stores/app.js';
  
  function handlePromptSelect(event) {
    selectedPrompt.set(event.detail);
  }
</script>

<div class="app-container">
  <TopBar />
  <div class="main-layout">
    <Sidebar />
    <MainArea />
  </div>
  <SettingsModal />
  <InviteModal />
  <ProjectModal />
  <UserMenu />
  <PremiumModal />
  <AISettingsModal />
  <PromptLibraryModal on:select={handlePromptSelect} />
  <VoiceSelectModal on:voiceSelected={(e) => console.log('Voice selected:', e.detail)} />
  <VoiceModeView />
  <ShortcutsModal />
  <ReportBugModal />
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh; /* Dynamic viewport height per mobile */
    width: 100%;
    overflow: hidden;
  }

  .main-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
    position: relative;
    min-height: 0;
  }

  @media (max-width: 768px) {
    .main-layout {
      width: 100%;
    }

    .app-container {
      overflow: hidden;
      position: fixed;
      width: 100vw;
      height: 100vh;
      height: 100dvh; /* Dynamic viewport height per mobile */
    }
  }

  /* Previeni scroll orizzontale su mobile */
  @media (max-width: 768px) {
    body {
      overflow-x: hidden;
      position: fixed;
      width: 100%;
    }

    #app {
      width: 100vw;
      max-width: 100vw;
      overflow-x: hidden;
    }
  }
</style>
