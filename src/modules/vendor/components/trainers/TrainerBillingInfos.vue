<template>
  <profile-tabs :profile-id="profileId" :tabs-content="tabsContent" />
</template>

<script>
import { computed } from 'vue';
import { useStore } from 'vuex';
import get from 'lodash/get';
import ProfileTabs from '@components/ProfileTabs';
import CollectiveTrainerBillingInfos from 'src/modules/vendor/components/trainers/CollectiveTrainerBillingInfos';
import SingleTrainerBillingInfos from 'src/modules/vendor/components/trainers/SingleTrainerBillingInfos';

export default {
  name: 'TrainerBillingInfos',
  components: {
    'profile-tabs': ProfileTabs,
  },
  props: {
    profileId: { type: String, default: '' },
  },
  setup () {
    const $store = useStore();

    const loggedUser = computed(() => $store.state.main.loggedUser);
    const userProfile = computed(() => $store.state.userProfile.userProfile);

    const trainer = computed(() => (get(userProfile.value, '_id') ? userProfile.value : loggedUser.value));

    const tabsContent = computed(() => [
      ...trainer.value.isSingleCourseTrainer
        ? [{
          label: 'Formations individuelles',
          name: 'trainerSingleSlots',
          default: true,
          component: SingleTrainerBillingInfos,
        }]
        : [],
      ...trainer.value.isCollectiveCourseTrainer
        ? [{
          label: 'Formations collectives',
          name: 'trainerCollectiveSlots',
          default: !trainer.value.isSingleCourseTrainer,
          component: CollectiveTrainerBillingInfos,
        }]
        : [],
    ]);

    return {
      // Computed
      tabsContent,
    };
  },
};
</script>
