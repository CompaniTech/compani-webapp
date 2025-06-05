<template>
  <ni-profile-header :title="title" class="delete-container" :header-info="headerInfo">
    <template #title v-if="!isClientInterface && isAdmin">
      <ni-button icon="delete" @click="deleteCourse" />
      <ni-button :flat="false" class="q-ml-sm" :label="archiveLabel" @click="validateCourseArchive" />
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
        .onCancel(() => {
          NotifyPositive(!isArchived ? 'Archivage annulé.' : 'Désarchivage annulé.');
        });
    };

    const archiveOrUnarchiveCourse = async () => {
      try {
        const isArchived = !!course.value.archivedAt;
        const payload = !isArchived
          ? { archivedAt: CompaniDate().toISO() }
          : { archivedAt: '' };

        await Courses.update(course.value._id, payload);

        NotifyPositive(!isArchived ? 'Formation archivée.' : 'Formation désarchivée.');
        refreshCourse();
      } catch (e) {
        console.error(e);
        NotifyNegative(
          !course.value.archivedAt
            ? 'Erreur lors de l\'archivage de la formation.'
            : 'Erreur lors du désarchivage de la formation.'
        );
      }
    };

    return {
      // Data
      isClientInterface,
      // Computed
      isAdmin,
      archiveLabel,
      // methods
      deleteCourse,
      validateCourseArchive,
    };
  },
};
</script>

<style lang="sass" scoped>
.delete-container
  position: relative
</style>
