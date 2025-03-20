<template>
  <div>
    <div class="q-mb-xl">
      <div class="row">
        <p class="text-weight-bold table-title">Testeurs</p>
      </div>
      <q-card>
        <ni-responsive-table :data="testers" :columns="columns" v-model:pagination="pagination">
          <template #body="{ props }">
            <q-tr :props="props">
              <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props" :class="col.name"
                :style="col.style">
                <template v-if="col.name === 'actions'">
                  <ni-button class="table-actions" icon="close" @click="validateTesterDeletion(col.value)" />
                </template>
                <template v-else>{{ col.value }}</template>
              </q-td>
            </q-tr>
          </template>
        </ni-responsive-table>
        <q-card-actions align="right">
          <ni-button color="primary" icon="add" label="Ajouter une personne" :disable="loading"
            @click="testerCreationModal = true" />
        </q-card-actions>
      </q-card>
    </div>

    <tester-creation-modal v-model="testerCreationModal" v-model:new-tester="newTester" :validations="v$.newTester"
      :first-step="firstStep" :loading="modalLoading" @next-step="nextStepTesterCreationModal"
      @hide="resetTesterCreationModal" @submit="addTester" />
  </div>
</template>

<script>
import { useQuasar } from 'quasar';
import useVuelidate from '@vuelidate/core';
import { ref, computed, toRefs } from 'vue';
import { required, email } from '@vuelidate/validators';
import get from 'lodash/get';
import { TRAINEE } from '@data/constants';
import { formatPhone } from '@helpers/utils';
import { frPhoneNumber, countryCode } from '@helpers/vuelidateCustomVal';
import Button from '@components/Button';
import TesterCreationModal from 'src/modules/vendor/components/programs/TesterCreationModal';
import ResponsiveTable from '@components/table/ResponsiveTable';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import Email from '@api/Email';
import Programs from '@api/Programs';
import Users from '@api/Users';

export default {
  name: 'TesterTable',
  props: {
    programId: { type: String, required: true },
    testers: { type: Array, default: () => [] },
  },
  components: {
    'ni-button': Button,
    'tester-creation-modal': TesterCreationModal,
    'ni-responsive-table': ResponsiveTable,
  },
  emits: ['refresh'],
  setup (props, { emit }) {
    const { programId } = toRefs(props);

    const $q = useQuasar();

    const columns = ref([
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
      { name: 'email', label: 'Email', align: 'left', field: row => get(row, 'local.email') || '' },
      {
        name: 'phone',
        label: 'Téléphone',
        align: 'left',
        field: row => (get(row, 'contact.phone') ? row.contact : ''),
        format: formatPhone,
      },
      { name: 'actions', label: '', field: '_id', align: 'right' },
    ]);
    const loading = ref(false);
    const pagination = ref({ rowsPerPage: 0, sortBy: 'lastname' });
    const testerCreationModal = ref(false);
    const newTester = ref({
      local: { email: '' },
      identity: { firstname: '', lastname: '' },
      contact: { phone: '', countryCode: '+33' },
    });
    const firstStep = ref(true);
    const modalLoading = ref(false);

    const rules = computed(() => ({
      newTester: {
        local: { email: { required, email } },
        identity: { lastname: { required } },
        contact: { phone: { required, frPhoneNumber }, countryCode: { required, countryCode } },
      },
    }));

    const v$ = useVuelidate(rules, { newTester });

    const nextStepTesterCreationModal = async () => {
      try {
        v$.value.newTester.local.email.$touch();
        if (v$.value.newTester.local.email.$error) return NotifyWarning('Champ(s) invalide(s).');

        modalLoading.value = true;
        const userInfo = await Users.exists({ email: newTester.value.local.email });

        if (userInfo.exists) {
          await Programs.addTester(programId.value, { local: { email: newTester.value.local.email } });

          NotifyPositive('Testeur(euse) ajouté(e) avec succès.');
          resetTesterCreationModal();
          emit('refresh');
        } else {
          firstStep.value = false;
        }
      } catch (e) {
        if (e.status === 409) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de l\'ajout du/de la testeur(euse).');
      } finally {
        modalLoading.value = false;
      }
    };

    const addTester = async () => {
      try {
        v$.value.newTester.$touch();
        if (v$.value.newTester.$error) return NotifyWarning('Champ(s) invalide(s)');

        modalLoading.value = true;
        await Programs.addTester(programId.value, newTester.value);
        NotifyPositive('Testeur(euse) ajouté(e) avec succès.');

        await sendWelcome();
        resetTesterCreationModal();
        emit('refresh');
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de l\'ajout du/de la testeur(euse).');
      } finally {
        modalLoading.value = false;
      }
    };

    const sendWelcome = async () => {
      try {
        await Email.sendWelcome({ email: newTester.value.local.email, type: TRAINEE });
        NotifyPositive('Email envoyé.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'envoi de l\' email.');
      }
    };

    const resetTesterCreationModal = () => {
      testerCreationModal.value = false;
      firstStep.value = true;
      newTester.value = {
        local: { email: '' },
        identity: { firstname: '', lastname: '' },
        contact: { phone: '', countryCode: '+33' },
      };
      v$.value.newTester.$reset();
    };

    const validateTesterDeletion = (testerId) => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir retirer le/la testeur(euse) du programme&nbsp;?',
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => deleteTester(testerId))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

    const deleteTester = async (testerId) => {
      try {
        await Programs.removeTester(programId.value, testerId);
        emit('refresh');
        NotifyPositive('Testeur(euse) supprimé(e).');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression du/de la testeur(euse).');
      }
    };

    return {
      // Data
      columns,
      loading,
      pagination,
      testerCreationModal,
      newTester,
      firstStep,
      modalLoading,
      // Computed
      v$,
      // Methods
      nextStepTesterCreationModal,
      addTester,
      resetTesterCreationModal,
      validateTesterDeletion,
    };
  },
};
</script>

<style lang="sass" scoped>
.table-title
  flex: 1
</style>
