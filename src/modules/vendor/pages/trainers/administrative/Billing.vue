<template>
  <q-page v-if="loggedUser" padding class="vendor-background">
    <ni-title-header title="Suivi des heures" class="q-mb-xl" />
    <profile-billing />
  </q-page>
</template>

<script>
import { useMeta } from 'quasar';
import { computed } from 'vue';
import { useStore } from 'vuex';
import TitleHeader from '@components/TitleHeader';
import ProfileBilling from 'src/modules/vendor/components/trainers/VAEITrainerBillingInfos';

export default {
  name: 'Billing',
  components: {
    'ni-title-header': TitleHeader,
    'profile-billing': ProfileBilling,
  },
  setup () {
    const metaInfo = { title: 'Suivi des heures' };
    useMeta(metaInfo);

    const $store = useStore();

    const loggedUser = computed(() => $store.state.main.loggedUser);

    return {
      // Computed
      loggedUser,
    };
  },
};
</script>
