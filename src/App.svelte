<script>
  import TopBar from './components/TopBar.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import MainArea from './components/MainArea.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import InviteModal from './components/InviteModal.svelte';
  import ProjectModal from './components/ProjectModal.svelte';
  import UserMenu from './components/UserMenu.svelte';
  import PremiumModal from './components/PremiumModal.svelte';
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
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
  }

  .main-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
    position: relative;
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
