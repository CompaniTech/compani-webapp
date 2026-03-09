<template>
  <q-page padding class="vendor-background">
    <div v-if="userProfile">
      <ni-profile-header :title="userIdentity" />
      <profile-tabs :profile-id="trainerId" :tabs-content="tabsContent" @refresh="refreshUserProfile" />
    </div>
  </q-page>
</template>

<script>
import { useMeta } from 'quasar';
import { ref, computed, watch, onBeforeUnmount, toRefs } from 'vue';
import { useStore } from 'vuex';
import get from 'lodash/get';
import ProfileHeader from '@components/ProfileHeader';
import ProfileTabs from '@components/ProfileTabs';
import ProfileInfo from 'src/modules/vendor/components/trainers/ProfileInfo';
import ProfileContract from 'src/modules/vendor/components/trainers/ProfileContract';
import VAEITrainerBillingInfos from 'src/modules/vendor/components/trainers/VAEITrainerBillingInfos';
import { formatIdentity } from '@helpers/utils';
import { TRAINER } from '@data/constants';

export default {
  name: 'TrainerProfile',
  props: {
    trainerId: { type: String, required: true },
    defaultTab: { type: String, default: 'info' },
  },
  components: {
    'ni-profile-header': ProfileHeader,
    'profile-tabs': ProfileTabs,
  },
  setup (props) {
    const metaInfo = { title: 'Fiche formateur' };
    useMeta(metaInfo);
    const { defaultTab, trainerId } = toRefs(props);

    const userIdentity = ref('');
    const tabsContent = computed(() => {
      const { isSingleCourseTrainer } = userProfile.value;
      return [
        {
          label: 'Infos personnelles',
          name: 'info',
          default: defaultTab.value === 'info',
          component: ProfileInfo,
          notification: 'profiles',
        },
        {
          label: 'Contrats',
          name: 'contracts',
          default: defaultTab.value === 'contracts',
          component: ProfileContract,
        },
        ...isSingleCourseTrainer
          ? [{
            label: 'Suivi des heures',
            name: 'vaeiTrainerBillingInfos',
            default: defaultTab.value === 'vaeiTrainerBillingInfos',
            component: VAEITrainerBillingInfos,
          }]
          : [],
      ];
    });

    const $store = useStore();
    const userProfile = computed(() => (TRAINER === get($store.state.main.loggedUser, 'role.vendor.name')
      ? $store.state.main.loggedUser
      : $store.state.userProfile.userProfile));
    const vendorRole = computed(() => $store.getters['main/getVendorRole']);

    watch(
      userProfile,
      async () => {
        userIdentity.value = formatIdentity(get(userProfile.value, 'identity'), 'FL');
        if (vendorRole.value !== TRAINER) await $store.dispatch('userProfile/updateNotifications');
      }
    );

    onBeforeUnmount(() => { $store.dispatch('userProfile/resetUserProfile'); });

    const refreshUserProfile = async () => {
      try {
        await $store.dispatch('userProfile/fetchUserProfile', { userId: trainerId.value });
      } catch (e) {
        console.error(e);
      }
    };

    const created = async () => {
      if (vendorRole.value !== TRAINER) await refreshUserProfile();

      userIdentity.value = formatIdentity(get(userProfile.value, 'identity'), 'FL');
    };

    created();

    return {
      // Data
      userIdentity,
      tabsContent,
      // Computed
      userProfile,
      vendorRole,
      // Methods
      refreshUserProfile,
    };
  },
};
</script>
