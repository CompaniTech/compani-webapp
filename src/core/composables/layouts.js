import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { onBeforeRouteUpdate } from 'vue-router';

export const useLayouts = (collapsibleClosing) => {
  const $store = useStore();
  const isMini = ref(false);

  const loggedUser = computed(() => $store.state.main.loggedUser);
  const drawer = computed(() => $store.state.main.drawer);

  const menuIcon = computed(() => (isMini.value ? 'view_headline' : 'chevron_left'));

  const chevronClasses = computed(() => (!isMini.value ? 'chevron chevron-left' : 'chevron chevron-right'));

  const chevronContainerClasses = computed(() => (!isMini.value
    ? 'absolute q-mini-drawer-hide'
    : 'absolute q-mini-drawer-only'
  ));

  const toggleMenu = (value) => { $store.dispatch('main/setDrawer', value); };

  onBeforeRouteUpdate((to, from, next) => {
    if (drawer.value && !isMini.value) {
      collapsibleClosing(to, from);
    }

    next();
  });

  return {
    // Data
    isMini,
    // Computed
    loggedUser,
    drawer,
    menuIcon,
    chevronClasses,
    chevronContainerClasses,
    // Method
    toggleMenu,
  };
};
