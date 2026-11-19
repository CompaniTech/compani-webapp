<template>
  <profile-tabs :profile-id="profileId" :tabs-content="tabsContent" />
</template>

<script>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import get from 'lodash/get';
import ProfileTabs from '@components/ProfileTabs';
import TrainerCollectiveCoursesBilling from 'src/modules/vendor/components/trainers/TrainerCollectiveCoursesBilling';
import TrainerSingleCoursesBilling from 'src/modules/vendor/components/trainers/TrainerSingleCoursesBilling';

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
    const $route = useRoute();

    const loggedUser = computed(() => $store.state.main.loggedUser);
    const userProfile = computed(() => $store.state.userProfile.userProfile);

    const trainer = computed(() => (get(userProfile.value, '_id') ? userProfile.value : loggedUser.value));

    const isCollectiveTabDefault = computed(() => !!trainer.value.isCollectiveCourseTrainer &&
      (!trainer.value.isSingleCourseTrainer || $route.query.defaultSubTab === 'trainerCollectiveSlots'));

    const tabsContent = computed(() => [
      ...trainer.value.isSingleCourseTrainer
        ? [{
          label: 'Formations individuelles',
          name: 'trainerSingleSlots',
          default: !isCollectiveTabDefault.value,
          component: TrainerSingleCoursesBilling,
        }]
        : [],
      ...trainer.value.isCollectiveCourseTrainer
        ? [{
          label: 'Formations collectives',
          name: 'trainerCollectiveSlots',
          default: isCollectiveTabDefault.value,
          component: TrainerCollectiveCoursesBilling,
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
