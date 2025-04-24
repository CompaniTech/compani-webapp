import { computed } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import Authentication from '@api/Authentication';
import { WEBAPP } from '../data/constants';

export const useLogin = () => {
  const $store = useStore();
  const $route = useRoute();
  const $router = useRouter();

  const clientRole = computed(() => $store.getters['main/getClientRole']);
  const vendorRole = computed(() => $store.getters['main/getVendorRole']);
  const loggedUser = computed(() => $store.state.main.loggedUser);

  const logInUser = async (authenticationPayload) => {
    const auth = await Authentication.authenticate({ ...authenticationPayload, origin: WEBAPP });

    await $store.dispatch('main/fetchLoggedUser', auth.user._id);

    if (!loggedUser.value) throw new Error('Error on login');

    if ($route.query.from) return $router.replace({ path: $route.query.from });
    if (vendorRole.value) return $router.replace('/ad').catch((e) => {});
    return $router.replace('/').catch((e) => {});
  };

  return {
    // Computed
    clientRole,
    vendorRole,
    loggedUser,
    // Methods
    logInUser,
  };
};
