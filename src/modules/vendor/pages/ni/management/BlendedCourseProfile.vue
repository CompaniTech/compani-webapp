<template>
  <q-page padding class="vendor-background">
    <template v-if="course">
      <ni-blended-course-profile-header :title="courseName" @delete="validateCourseDeletion" @refresh="refreshCourse"
        :header-info="headerInfo" />
      <profile-tabs :profile-id="courseId" :tabs-content="tabsContent" @refresh="refreshCourse" />
    </template>
  </q-page>
</template>

<script>
import { useMeta, useQuasar } from 'quasar';
import { onBeforeUnmount, computed, ref, toRefs, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import Courses from '@api/Courses';
import { NotifyPositive, NotifyNegative } from '@components/popup/notify';
import ProfileTabs from '@components/ProfileTabs';
import ProfileOrganization from '@components/courses/ProfileOrganization';
import ProfileBilling from '@components/courses/ProfileBilling';
import BlendedCourseProfileHeader from '@components/courses/BlendedCourseProfileHeader';
import ProfileTraineeFollowUp from '@components/courses/ProfileTraineeFollowUp';
import { VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER } from '@data/constants';
import { composeCourseName } from '@helpers/courses';
import { useCourses } from '@composables/courses';

export default {
  name: 'BlendedCourseProfile',
  props: {
    courseId: { type: String, required: true },
    defaultTab: { type: String, default: 'organization' },
  },
  components: {
    'ni-blended-course-profile-header': BlendedCourseProfileHeader,
    'profile-tabs': ProfileTabs,
  },
  setup (props) {
    const metaInfo = { title: 'Fiche formation' };
    useMeta(metaInfo);

    const { courseId, defaultTab } = toRefs(props);

    const $store = useStore();
    const $router = useRouter();
    const $route = useRoute();
    const $q = useQuasar();

    const courseName = ref('');

    const course = computed(() => $store.state.course.course);

    const tabsContent = computed(() => {
      const vendorRole = $store.getters['main/getVendorRole'];
      const isAdmin = [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(vendorRole);

      return [
        {
          label: 'Organisation',
          name: 'organization',
          default: defaultTab.value === 'organization',
          component: ProfileOrganization,
        },
        {
          label: 'Suivi des stagiaires',
          name: 'traineeFollowUp',
          default: defaultTab.value === 'traineeFollowUp',
          component: ProfileTraineeFollowUp,
        },
        ...(isAdmin
          ? [{
            label: 'Facturation',
            name: 'billing',
            default: defaultTab.value === 'billing',
            component: ProfileBilling,
          }]
          : []
        ),
      ];
    });

    const { headerInfo } = useCourses(course);

    watch(course, () => {
      courseName.value = composeCourseName(course.value, true);
    });

    const refreshCourse = async () => {
      try {
        await $store.dispatch('course/fetchCourse', { courseId: courseId.value });
      } catch (e) {
        console.error(e);
      }
    };

    const deleteCourse = async () => {
      try {
        await Courses.delete(course.value._id);
        NotifyPositive('Formation supprimée.');

        $router.push({ name: 'ni management blended courses' });
      } catch (e) {
        console.error(e);
        if (e.status === 403) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de la suppression de la formation.');
      }
    };

    const validateCourseDeletion = () => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Confirmez-vous la suppression&nbsp;? <br /><br /> Les éventuelles conventions de formation associées '
          + 'seront supprimées.',
        html: true,
        ok: 'OK',
        cancel: 'Annuler',
      })
        .onOk(deleteCourse)
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

    const created = async () => {
      if (!course.value) await refreshCourse();
      courseName.value = composeCourseName(course.value, true);
    };

    created();

    onBeforeUnmount(() => {
      $store.dispatch('course/resetCourse');
      const routes = ['ni management blended courses', 'trainers courses', 'ni management single courses'];
      if (!routes.includes($route.name)) $store.dispatch('course/resetFilters');
    });

    return {
      // Data
      courseName,
      tabsContent,
      // Computed
      course,
      headerInfo,
      // Methods
      refreshCourse,
      validateCourseDeletion,
    };
  },
};
</script>
