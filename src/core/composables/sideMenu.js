import { ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import get from 'lodash/get';
import { BLUE_TEXT_LOGO } from '../data/constants';

export const useSideMenu = (activeRoutes) => {
  const $store = useStore();
  const $route = useRoute();

  const userFirstname = ref('');
  const companiLogo = ref(BLUE_TEXT_LOGO);

  const loggedUser = computed(() => $store.state.main.loggedUser);

  const setUserFirstname = () => (get(loggedUser.value, 'identity.firstname') || '').toUpperCase();

  const collapsibleOpening = () => {
    const parentRoute = $route.meta.parent;

    if (parentRoute && activeRoutes.value[parentRoute]) {
      activeRoutes.value[parentRoute].open = true;
    }
  };

  const collapsibleClosing = (to, from) => {
    if ([from.meta.parent] && to.meta.parent !== from.meta.parent) {
      activeRoutes.value[from.meta.parent].open = false;
    }
  };

  watch(loggedUser, () => {
    userFirstname.value = setUserFirstname();
  });

  const created = () => {
    userFirstname.value = setUserFirstname();
  };

  created();

  return {
    // Data
    userFirstname,
    companiLogo,
    // Computed
    loggedUser,
    // Method
    collapsibleOpening,
    collapsibleClosing,
  };
};
