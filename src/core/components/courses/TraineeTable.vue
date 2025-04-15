<template>
  <ni-responsive-table :data="trainees" :columns="traineeColumns" v-model:pagination="traineePagination"
    :hide-header="hideHeader" separator="none" :loading="loading" :class="tableClass"
    :visible-columns="traineeVisibleColumns">
    <template #header="{ props }">
      <q-tr :props="props">
        <q-th v-for="col in props.cols" :key="col.name" :props="props" :style="col.style"
          :class="[{ 'table-actions-responsive': col.name === 'actions', 'email': col.name === 'email' }]">
          {{ col.label }}
        </q-th>
      </q-tr>
    </template>
    <template #body="{ props }">
      <q-tr :props="props">
        <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props"
          :style="col.style" :class="[col.classes, { 'border': props.rowIndex === 0 && !hideHeader}]">
          <template v-if="col.name === 'actions' && canUpdateTrainees">
            <div>
              <ni-button icon="edit" @click="openTraineeEditionModal(props.row)" :disable="!!course.archivedAt" />
              <ni-button v-if="course.type !== SINGLE" icon="close" @click="validateTraineeDeletion(props.row._id)"
                :disable="!!course.archivedAt" />
            </div>
          </template>
          <template v-else-if="col.name === 'connectionInfos'">
            <a v-if="col.value">{{ col.value }}</a>
            <connected-dot v-else />
          </template>
          <template v-else>{{ col.value }}</template>
        </q-td>
      </q-tr>
    </template>
  </ni-responsive-table>

   <trainee-edition-modal v-model="traineeEditionModal" v-model:edited-trainee="editedTrainee" @submit="updateTrainee"
      @hide="resetTraineeEditionForm" :loading="traineeModalLoading" :validations="traineeValidation.editedTrainee" />
</template>

<script>
import { subject } from '@casl/ability';
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useQuasar } from 'quasar';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import get from 'lodash/get';
import pick from 'lodash/pick';
import omit from 'lodash/omit';
import { defineAbilitiesForCourse } from '@helpers/ability';
import { formatPhone, formatPhoneForPayload } from '@helpers/utils';
import Courses from '@api/Courses';
import Users from '@api/Users';
import Button from '@components/Button';
import { SINGLE } from '@data/constants';
import TraineeEditionModal from '@components/courses/TraineeEditionModal';
import ResponsiveTable from '@components/table/ResponsiveTable';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import { frPhoneNumber, countryCode } from '@helpers/vuelidateCustomVal';
import ConnectedDot from './ConnectedDot';

export default {
  name: 'TraineeTable',
  props: {
    trainees: { type: Array, default: () => [] },
    hideHeader: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    tableClass: { type: String, default: () => '' },
  },
  components: {
    'ni-button': Button,
    'ni-responsive-table': ResponsiveTable,
    'trainee-edition-modal': TraineeEditionModal,
    'connected-dot': ConnectedDot,
  },
  emits: ['refresh'],
  setup (props, { emit }) {
    const $q = useQuasar();
    const $store = useStore();

    const traineePagination = ref({ rowsPerPage: 0, sortBy: 'lastname' });
    const traineeEditionModal = ref(false);
    const traineeModalLoading = ref(false);
    const editedTrainee = ref({ identity: {}, contact: {}, local: {} });

    const course = computed(() => $store.state.course.course);

    const traineeColumns = computed(() => [
      {
        name: 'firstname',
        label: 'Prénom',
        align: 'left',
        field: row => get(row, 'identity.firstname') || '',
        classes: 'text-capitalize',
      },
      {
        name: 'lastname',
        label: 'Nom',
        align: 'left',
        field: row => get(row, 'identity.lastname') || '',
        classes: 'text-capitalize',
      },
      { name: 'email', label: 'Email', align: 'left', field: row => get(row, 'local.email') || '', classes: 'email' },
      {
        name: 'phone',
        label: 'Téléphone',
        align: 'left',
        field: row => (get(row, 'contact.phone') ? row.contact : ''),
        format: formatPhone,
      },
      {
        name: 'connectionInfos',
        label: 'Code de connexion à l\'app mobile',
        field: 'loginCode',
        align: 'center',
      },
      ...course.value.hasCertifyingTest
        ? [{
          name: 'certification',
          label: 'Certification',
          field: row => get(course.value, 'certifiedTrainees', []).includes(row._id),
          format: value => (value ? 'Oui' : 'Non'),
          align: 'center',
        }]
        : [],
      { name: 'actions', label: '', align: 'right', field: '', classes: 'table-actions-responsive' },
    ]);

    const traineeRules = {
      editedTrainee: {
        identity: { lastname: { required } },
        contact: { phone: { required, frPhoneNumber }, countryCode: { required, countryCode } },
      },
    };

    const traineeVisibleColumns = computed(() => {
      const col = ['firstname', 'lastname', 'email', 'phone', 'connectionInfos', 'certification'];

      return canUpdateTrainees.value ? [...col, 'actions'] : col;
    });

    const traineeValidation = useVuelidate(traineeRules, { editedTrainee });

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const canUpdateTrainees = computed(() => {
      const ability = defineAbilitiesForCourse(pick(loggedUser.value, ['role']));

      return ability.can('update', subject('Course', course.value), 'trainees');
    });

    const openTraineeEditionModal = async (trainee) => {
      editedTrainee.value = {
        ...editedTrainee.value,
        ...(!trainee.contact.countryCode && { contact: { countryCode: '+33' } }),
        ...pick(
          trainee,
          ['_id', 'identity.firstname', 'identity.lastname', 'local.email', 'contact.phone', 'contact.countryCode']
        ),
      };
      traineeEditionModal.value = true;
    };
    const resetTraineeEditionForm = () => {
      traineeValidation.value.editedTrainee.$reset();
      editedTrainee.value = { identity: {}, local: {}, contact: {} };
    };
    const updateTrainee = async () => {
      try {
        traineeModalLoading.value = true;
        traineeValidation.value.editedTrainee.$touch();
        if (traineeValidation.value.editedTrainee.$error) return NotifyWarning('Champ(s) invalide(s)');
        if (get(editedTrainee.value, 'contact.phone')) {
          editedTrainee.value.contact.phone = formatPhoneForPayload(editedTrainee.value.contact.phone);
        }

        await Users.updateById(editedTrainee.value._id, omit(editedTrainee.value, ['_id', 'local']));
        traineeEditionModal.value = false;

        emit('refresh');
        NotifyPositive('Stagiaire modifié(e).');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification du/de la stagiaire.');
      } finally {
        traineeModalLoading.value = false;
      }
    };

    const validateTraineeDeletion = (traineeId) => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir retirer le/la stagiaire de la formation&nbsp;?',
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => deleteTrainee(traineeId))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

    const deleteTrainee = async (traineeId) => {
      try {
        await Courses.deleteTrainee(course.value._id, traineeId);

        emit('refresh');
        NotifyPositive('Stagiaire supprimé(e).');
      } catch (e) {
        console.error(e);
        if (e.status === 403 && e.data.message) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de la suppression du/de la stagiaire.');
      }
    };

    return {
      // Data
      SINGLE,
      traineeColumns,
      traineePagination,
      traineeEditionModal,
      traineeModalLoading,
      editedTrainee,
      // Validation
      traineeValidation,
      // Computed
      course,
      traineeVisibleColumns,
      canUpdateTrainees,
      // Methods
      openTraineeEditionModal,
      resetTraineeEditionForm,
      updateTrainee,
      validateTraineeDeletion,
    };
  },
};
</script>
<style lang="sass" scoped>
.email
  @media screen and (min-width: 767px)
    width: 20%
.table-actions-responsive
  width: 15%
.q-table tbody td
  height: 35px
.border
  @media screen and (min-width: 767px)
    border-top: 1px solid $copper-grey-200
</style>
