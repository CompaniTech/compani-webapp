<template>
    <q-page v-if="course" class="client-background" padding>
      <ni-profile-header :title="courseName" :header-info="headerInfo" />
      <profile-follow-up :profile-id="courseId" />
    </q-page>
</template>

<script>
import { createMetaMixin } from 'quasar';
import { mapState } from 'vuex';
import get from 'lodash/get';
import ProfileHeader from '@components/ProfileHeader';
import ProfileFollowUp from '@components/courses/ProfileFollowUp';
import { NotifyNegative } from '@components/popup/notify';
import CompaniDuration from '@helpers/dates/companiDurations';
import { LONG_DURATION_H_MM } from '@data/constants';

const metaInfo = { title: 'Fiche formation' };

export default {
  name: 'ELearningCourseProfile',
  components: {
    'ni-profile-header': ProfileHeader,
    'profile-follow-up': ProfileFollowUp,
  },
  props: {
    courseId: { type: String, required: true },
  },
  mixins: [createMetaMixin(metaInfo)],
  computed: {
    ...mapState('course', ['course']),
    courseName () {
      return get(this.course, 'tradeName');
    },
    headerInfo () {
      return [{
        icon: 'hourglass_empty',
        label: `Durée : ${CompaniDuration(this.course.totalTheoreticalDuration).format(LONG_DURATION_H_MM)}`,
      }];
    },
  },
  async created () {
    await this.refreshCourse();
  },
  methods: {
    async refreshCourse () {
      try {
        await this.$store.dispatch('course/fetchCourse', { courseId: this.courseId });
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération de la formation.');
      }
    },
  },
  beforeUnmount () {
    this.$store.dispatch('course/resetCourse');
  },
};
</script>
