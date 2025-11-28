<script>
  export let checked = false;
  export let id = `ios-switch-${Math.random().toString(36).substr(2, 9)}`;
  export let disabled = false;
  
  $: uniqueId = id;
</script>

<div class="ios-switch-container">
  <input 
    type="checkbox" 
    class="ios-switch-checkbox" 
    {id}
    bind:checked
    {disabled}
  />
  <label class="ios-switch" for={uniqueId}>
    <span class="ios-switch-slider"></span>
  </label>
</div>

<style>
  /* iOS Switch - From Uiverse.io by zanina-yassine */
  .ios-switch-container {
    width: 51px;
    height: 31px;
    position: relative;
  }

  .ios-switch-checkbox {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
  }

  .ios-switch {
    width: 100%;
    height: 100%;
    display: block;
    background-color: #e9e9eb;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.2s ease-out;
  }

  .ios-switch-slider {
    width: 27px;
    height: 27px;
    position: absolute;
    left: calc(50% - 27px/2 - 10px);
    top: calc(50% - 27px/2);
    border-radius: 50%;
    background: #FFFFFF;
    box-shadow: 0px 3px 8px rgba(0, 0, 0, 0.15), 0px 3px 1px rgba(0, 0, 0, 0.06);
    transition: all 0.2s ease-out;
    cursor: pointer;
  }

  .ios-switch-checkbox:checked + .ios-switch {
    background-color: #34C759;
  }

  .ios-switch-checkbox:checked + .ios-switch .ios-switch-slider {
    left: calc(50% - 27px/2 + 10px);
    top: calc(50% - 27px/2);
  }

  .ios-switch-checkbox:disabled + .ios-switch {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ios-switch-checkbox:disabled + .ios-switch .ios-switch-slider {
    cursor: not-allowed;
  }
</style>







