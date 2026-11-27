<template>
  <q-page padding class="client-background">
    <template v-if="course">
      <ni-blended-course-profile-header :title="courseName" :header-info="headerInfo" />
      <profile-tabs :profile-id="courseId" :tabs-content="tabsContent" />
    </template>
  </q-page>
</template>

<script>
import get from 'lodash/get';
import { useMeta } from 'quasar';
import { onBeforeUnmount, computed, ref, toRefs, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import ProfileTabs from '@components/ProfileTabs';
import ProfileOrganization from '@components/courses/ProfileOrganization';
import BlendedCourseProfileHeader from '@components/courses/BlendedCourseProfileHeader';
import ProfilePedagogicalFollowUp from '@components/courses/ProfilePedagogicalFollowUp';
import { useCourses } from '@composables/courses';
import { composeCourseName } from '@helpers/courses';

export default {
  name: 'BlendedCourseProfile',
  props: {
    courseId: { type: String, required: true },
    defaultTab: { type: String, default: 'organization' },
  },
  components: {
    'profile-tabs': ProfileTabs,
    'ni-blended-course-profile-header': BlendedCourseProfileHeader,
  },
  setup (props) {
    const metaInfo = { title: 'Fiche formation' };
    useMeta(metaInfo);

    const { courseId, defaultTab } = toRefs(props);

    const $store = useStore();
    const $route = useRoute();

    const courseName = ref('');

    const tabsContent = [
      {
        label: 'Organisation',
        name: 'organization',
        default: defaultTab.value === 'organization',
        component: ProfileOrganization,
      },
      {
        label: 'Suivi pédagogique',
        name: 'pedagogicalFollowUp',
        default: defaultTab.value === 'pedagogicalFollowUp',
        component: ProfilePedagogicalFollowUp,
      },
    ];

    const course = computed(() => $store.state.course.course);

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const { headerInfo } = useCourses(course);

    watch(course, () => {
      courseName.value = composeCourseName(course.value, get(loggedUser.value, 'role.holding'));
    });

    const refreshCourse = async () => {
      try {
        await $store.dispatch('course/fetchCourse', { courseId: courseId.value });
      } catch (e) {
        console.error(e);
      }
    };

    const created = async () => {
      if (!course.value) await refreshCourse();
      courseName.value = composeCourseName(course.value, get(loggedUser.value, 'role.holding'));
    };

    created();

    onBeforeUnmount(() => {
      $store.dispatch('course/resetCourse');
      if ($route.name !== 'ni courses') {
        $store.dispatch('course/resetFilters');
        $store.dispatch('course/resetCompaniesHoldings');
      }
      if ($route.name !== 'ni courses bills') $store.dispatch('company/resetCompany');
    });

    return {
      // Data
      courseName,
      tabsContent,
      // Computed
      course,
      headerInfo,
    };
  },
};
</script>
