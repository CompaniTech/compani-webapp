<template>
  <ni-profile-header :title="title" class="delete-container" :header-info="headerInfo">
    <template #title v-if="!isClientInterface && isAdmin">
      <ni-button icon="delete" @click="deleteCourse" />
      <ni-button :flat="false" class="q-ml-sm" :label="archiveLabel" @click="validateCourseArchive" />
      <ni-button v-if="!course.archivedAt" :flat="false" class="q-ml-sm" :label="interruptionButtonLabel"
        @click="validateCourseInterruptionOrRestart" />
    </template>
  </ni-profile-header>
</template>

<script>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import Courses from '@api/Courses';
import ProfileHeader from '@components/ProfileHeader';
import Button from '@components/Button';
import { NotifyPositive, NotifyNegative } from '@components/popup/notify';
import { VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER } from '@data/constants';
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

    const interruptionButtonLabel = computed(() => (!course.value.interruptedAt ? 'Mettre en pause' : 'Reprendre'));

    const deleteCourse = () => emit('delete');

    const refreshCourse = () => emit('refresh');

    const validateCourseArchive = () => {
      const isArchived = !!course.value.archivedAt;
      const message = !isArchived
        ? 'Êtes-vous sûr(e) de vouloir archiver cette formation&nbsp;? <br /><br /> Vous ne pourrez plus'
        + ' modifier des informations, ajouter des émargements ni envoyer des sms.'
        : 'Êtes-vous sûr(e) de vouloir désarchiver cette formation&nbsp;? <br /><br /> Il sera de nouveau possible de'
        + ' modifier des informations, ajouter des émargements ou envoyer des sms.';

      $q.dialog({
        title: 'Confirmation',
        message,
        html: true,
        ok: 'Oui',
        cancel: 'Non',
      }).onOk(archiveOrUnarchiveCourse)
        .onCancel(() => NotifyPositive(!isArchived ? 'Archivage annulé.' : 'Désarchivage annulé.'));
    };

    const archiveOrUnarchiveCourse = async () => {
      try {
        const isArchived = !!course.value.archivedAt;
        const payload = !isArchived ? { archivedAt: CompaniDate().toISO() } : { archivedAt: '' };

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

    const interruptCourse = async () => {
      try {
        const interruptedAt = !course.value.interruptedAt ? CompaniDate().toISO() : '';
        await Courses.update(course.value._id, { interruptedAt });

        NotifyPositive(!course.value.interruptedAt ? 'Formation mise en pause.' : 'Reprise de la formation.');
        await refreshCourse();
      } catch (e) {
        console.error(e);
        NotifyNegative(
          `Erreur lors de la ${!course.value.interruptedAt ? 'mise en pause' : 'reprise'} de la formation.`
        );
      }
    };

    const validateCourseInterruptionOrRestart = () => {
      const message = !course.value.interruptedAt
        ? 'Êtes-vous sûr(e) de vouloir mettre en pause cette formation&nbsp;? <br /><br />'
          + 'Vous ne pourrez plus créer de factures.'
        : 'Êtes-vous sûr(e) de vouloir reprendre cette formation&nbsp;? <br /><br />'
          + 'Vous pourrez de nouveau créer des factures.';

      $q.dialog({
        title: 'Confirmation',
        message,
        html: true,
        ok: 'Oui',
        cancel: 'Non',
      }).onOk(interruptCourse)
        .onCancel(() => NotifyPositive(!course.value.interruptedAt ? 'Mise en pause annulée.' : 'Reprise annulée.'));
    };

    return {
      // Data
      isClientInterface,
      // Computed
      isAdmin,
      archiveLabel,
      course,
      interruptionButtonLabel,
      // methods
      deleteCourse,
      validateCourseArchive,
      validateCourseInterruptionOrRestart,
    };
  },
};
</script>

<style lang="sass" scoped>
.delete-container
  position: relative
</style>
