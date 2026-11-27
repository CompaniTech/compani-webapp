<template>
  <ni-profile-header :title="title" class="delete-container" :header-info="headerInfo">
    <template #title v-if="!isClientInterface && isAdmin">
      <ni-button icon="delete" @click="deleteCourse" />
      <ni-button :flat="false" class="q-ml-sm" :label="archiveLabel" @click="validateCourseArchive" />
      <ni-button v-if="!course.archivedAt" :flat="false" class="q-ml-sm" :label="interruptionButtonLabel"
        @click="openCourseInterruptionModal" />
    </template>
  </ni-profile-header>

  <course-interruption-modal v-model="courseInterruptionModal" v-model:interruption-date="interruptionDate"
    :has-ongoing-interruption="hasOngoingInterruption" :min="minInterruptionDate" :loading="interruptionLoading"
    :validations="v$.interruptionDate" @submit="interruptOrRestartCourse" @hide="resetCourseInterruptionModal" />
</template>

<script>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import Courses from '@api/Courses';
import ProfileHeader from '@components/ProfileHeader';
import Button from '@components/Button';
import { NotifyPositive, NotifyNegative, NotifyWarning } from '@components/popup/notify';
import CourseInterruptionModal from '@components/courses/CourseInterruptionModal';
import { VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, DAY } from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';

export default {
  name: 'BlendedCourseProfileHeader',
  props: {
    title: { type: String, required: true },
    headerInfo: { type: Array, required: true },
  },
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-button': Button,
    'course-interruption-modal': CourseInterruptionModal,
  },
  emits: ['delete', 'refresh'],
  setup (_, { emit }) {
    const $route = useRoute();
    const $store = useStore();
    const $q = useQuasar();

    const isClientInterface = !/\/ad\//.test($route.path);

    const course = computed(() => $store.state.course.course);

    const isAdmin = computed(() => {
      const vendorRole = $store.getters['main/getVendorRole'];
      return [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(vendorRole);
    });

    const archiveLabel = computed(() => (!course.value.archivedAt ? 'Archiver' : 'Désarchiver'));

    const courseInterruptionModal = ref(false);
    const interruptionDate = ref('');
    const interruptionLoading = ref(false);

    const v$ = useVuelidate({ interruptionDate: { required } }, { interruptionDate });

    const hasOngoingInterruption = computed(() => (course.value.interruptionDates || []).some(d => !d.endDate));

    const minInterruptionDate = computed(() => {
      const interruptionDates = course.value.interruptionDates || [];
      if (!interruptionDates.length) return '';

      if (hasOngoingInterruption.value) {
        return CompaniDate(interruptionDates.find(d => !d.endDate).startDate).startOf(DAY).toISO();
      }

      const lastEndDate = interruptionDates
        .map(d => d.endDate)
        .reduce((acc, date) => (CompaniDate(date).isAfter(acc) ? date : acc));

      return CompaniDate(lastEndDate).startOf(DAY).toISO();
    });

    const interruptionButtonLabel = computed(() => (!hasOngoingInterruption.value ? 'Mettre en pause' : 'Reprendre'));

    const deleteCourse = () => emit('delete');

    const refreshCourse = () => emit('refresh');

    const validateCourseArchive = () => {
      const isArchived = !!course.value.archivedAt;

      if (!isArchived) {
        $q.dialog({
          title: 'Confirmation',
          message: 'Êtes-vous sûr(e) de vouloir archiver cette formation&nbsp;? <br /><br /> Vous ne pourrez plus'
            + ' modifier des informations, ajouter des émargements ni envoyer des sms.',
          options: {
            type: 'checkbox',
            model: [],
            items: [{ label: 'Formation abandonnée en cours de parcours', value: true }],
            size: '32px',
            class: 'text-14',
          },
          html: true,
          ok: 'Oui',
          cancel: 'Non',
        }).onOk(value => archiveOrUnarchiveCourse(!!value && value[0]))
          .onCancel(() => NotifyPositive('Archivage annulé.'));
      } else {
        $q.dialog({
          title: 'Confirmation',
          message: 'Êtes-vous sûr(e) de vouloir désarchiver cette formation&nbsp;? <br /><br /> Il sera de nouveau'
            + ' possible de modifier des informations, ajouter des émargements ou envoyer des sms.',
          html: true,
          ok: 'Oui',
          cancel: 'Non',
        }).onOk(archiveOrUnarchiveCourse)
          .onCancel(() => NotifyPositive('Désarchivage annulé.'));
      }
    };

    const archiveOrUnarchiveCourse = async (isAbandoned = false) => {
      try {
        const isArchived = !!course.value.archivedAt;
        const payload = !isArchived
          ? { archivedAt: CompaniDate().toISO(), ...(isAbandoned && { isAbandoned: true }) }
          : { archivedAt: '' };

        await Courses.update(course.value._id, payload);

        NotifyPositive(!isArchived ? 'Formation archivée.' : 'Formation désarchivée.');
        await refreshCourse();
      } catch (e) {
        console.error(e);
        NotifyNegative(
          !course.value.archivedAt
            ? 'Erreur lors de l\'archivage de la formation.'
            : 'Erreur lors du désarchivage de la formation.'
        );
      }
    };

    const openCourseInterruptionModal = () => {
      interruptionDate.value = CompaniDate().startOf(DAY).toISO();
      courseInterruptionModal.value = true;
    };

    const resetCourseInterruptionModal = () => {
      interruptionDate.value = '';
      v$.value.interruptionDate.$reset();
    };

    const interruptOrRestartCourse = async () => {
      try {
        v$.value.interruptionDate.$touch();
        if (v$.value.interruptionDate.$error) return NotifyWarning('Champ(s) invalide(s)');

        interruptionLoading.value = true;
        await Courses.update(course.value._id, { interruptionDate: interruptionDate.value });

        NotifyPositive(!hasOngoingInterruption.value ? 'Formation mise en pause.' : 'Reprise de la formation.');
        courseInterruptionModal.value = false;
        await refreshCourse();
      } catch (e) {
        console.error(e);
        if (e.status === 400 && e.data?.message) return NotifyNegative(e.data.message);
        NotifyNegative(
          `Erreur lors de la ${!hasOngoingInterruption.value ? 'mise en pause' : 'reprise'} de la formation.`
        );
      } finally {
        interruptionLoading.value = false;
      }
    };

    return {
      // Data
      isClientInterface,
      courseInterruptionModal,
      interruptionDate,
      interruptionLoading,
      // Computed
      isAdmin,
      archiveLabel,
      course,
      interruptionButtonLabel,
      hasOngoingInterruption,
      minInterruptionDate,
      v$,
      // methods
      deleteCourse,
      validateCourseArchive,
      openCourseInterruptionModal,
      resetCourseInterruptionModal,
      interruptOrRestartCourse,
    };
  },
};
</script>

<style lang="sass" scoped>
.delete-container
  position: relative
</style>
