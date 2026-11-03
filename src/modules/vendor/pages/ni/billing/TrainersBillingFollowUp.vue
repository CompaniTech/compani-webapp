<template>
  <q-page padding class="vendor-background q-pb-xl">
    <ni-title-header title="Suivi de la facturation des intervenant·es" class="q-mb-xl" />
    <profile-tabs :tabs-content="tabsContent" />
  </q-page>
</template>

<script>
import { useMeta } from 'quasar';
import TitleHeader from '@components/TitleHeader';
import ProfileTabs from '@components/ProfileTabs';
import TrainersSingleCoursesBillingFollowUp
  from 'src/modules/vendor/components/billing/TrainersSingleCoursesBillingFollowUp';
import TrainersCollectiveCoursesBillingFollowUp
  from 'src/modules/vendor/components/billing/TrainersCollectiveCoursesBillingFollowUp';

export default {
  name: 'TrainersBillingFollowUp',
  components: {
    'ni-title-header': TitleHeader,
    'profile-tabs': ProfileTabs,
  },
  setup () {
    const metaInfo = { title: 'Suivi de la facturation des intervenant·es' };
    useMeta(metaInfo);

    const tabsContent = [
      {
        label: 'Formations individuelles',
        name: 'trainersSingleCourses',
        default: true,
        component: TrainersSingleCoursesBillingFollowUp,
      },
      {
        label: 'Formations collectives',
        name: 'trainersCollectiveCourses',
        default: false,
        component: TrainersCollectiveCoursesBillingFollowUp,
      },
    ];

    return {
      // Data
      tabsContent,
    };
  },
};
</script>
