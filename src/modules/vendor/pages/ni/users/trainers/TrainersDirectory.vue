<template>
  <q-page class="vendor-background" padding>
    <ni-directory-header title="Répertoire formateurs" search-placeholder="Rechercher un profil"
      @update-search="updateSearch" :search="searchStr" />
    <ni-table-list :data="filteredTrainers" :columns="columns" :loading="tableLoading" v-model:pagination="pagination"
      :path="path" />
    <q-btn class="fixed fab-custom" no-caps rounded color="primary" icon="add" label="Ajouter une personne"
      @click="trainerCreationModal = true" :disable="tableLoading" />

    <trainer-creation-modal v-model="trainerCreationModal" @hide="resetCreationModal" @submit="createTrainer"
      v-model:new-trainer="newTrainer" :validations="v$.newTrainer" :loading="modalLoading" @go-to-next-step="nextStep"
      :email-error="emailError(v$.newTrainer)" :first-step="firstStep" />
</q-page>
</template>

<script>
import { ref, computed } from 'vue';
import { useMeta } from 'quasar';
import useVuelidate from '@vuelidate/core';
import { required, email } from '@vuelidate/validators';
import get from 'lodash/get';
import escapeRegExp from 'lodash/escapeRegExp';
import Users from '@api/Users';
import Roles from '@api/Roles';
import Email from '@api/Email';
import DirectoryHeader from '@components/DirectoryHeader';
import TableList from '@components/table/TableList';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { useUser } from '@composables/user';
import { TRAINER, TRAINING_ORGANISATION_MANAGER } from '@data/constants';
import { formatIdentity, removeDiacritics } from '@helpers/utils';
import TrainerCreationModal from 'src/modules/vendor/components/trainers/TrainerCreationModal';

export default {
  name: 'TrainersDirectory',
  components: {
    'ni-directory-header': DirectoryHeader,
    'ni-table-list': TableList,
    'trainer-creation-modal': TrainerCreationModal,
  },
  setup () {
    const metaInfo = { title: 'Répertoire formateurs' };
    useMeta(metaInfo);

    const trainers = ref([]);
    const tableLoading = ref(false);
    const columns = ref([{ name: 'name', label: 'Nom', field: 'name', align: 'left', sortable: true }]);
    const pagination = ref({ sortBy: 'name', descending: false, page: 1, rowsPerPage: 15 });
    const searchStr = ref('');
    const trainerCreationModal = ref(false);
    const newTrainer = ref({ identity: { lastname: '', firstname: '', title: '' }, local: { email: '' } });
    const modalLoading = ref(false);
    const firstStep = ref(true);
    const path = ref({ name: 'ni users trainers info', params: 'trainerId' });

    const { emailError } = useUser();

    const rules = computed(() => ({
      newTrainer: { identity: { lastname: { required }, title: { required } }, local: { email: { required, email } } },
    }));

    const v$ = useVuelidate(rules, { newTrainer });

    const filteredTrainers = computed(() => {
      const formattedString = escapeRegExp(removeDiacritics(searchStr.value));
      return trainers.value.filter(trainer => trainer.noDiacriticsName.match(new RegExp(formattedString, 'i')));
    });

    const resetCreationModal = () => {
      firstStep.value = true;
      newTrainer.value = { identity: { lastname: '', firstname: '', title: '' }, local: { email: '' } };
      v$.value.newTrainer.$reset();
    };

    const updateSearch = (value) => { searchStr.value = value; };

    const sendWelcome = async () => {
      try {
        await Email.sendWelcome({ email: newTrainer.value.local.email, type: TRAINER });
        NotifyPositive('Email envoyé');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'envoi du mail.');
      }
    };

    const formatTrainer = (trainer) => {
      const formattedName = formatIdentity(trainer.identity, 'FL');

      return { ...trainer, name: formattedName, noDiacriticsName: removeDiacritics(formattedName) };
    };

    const refreshTrainers = async () => {
      try {
        tableLoading.value = true;
        const trainersAndROFs = await Users.list({ role: [TRAINER, TRAINING_ORGANISATION_MANAGER] });

        trainers.value = trainersAndROFs.map(trainer => formatTrainer(trainer));
      } catch (e) {
        console.error(e);
        trainers.value = [];
        NotifyNegative('Erreur lors de la récupération des formateurs.');
      } finally {
        tableLoading.value = false;
      }
    };

    const createTrainer = async () => {
      try {
        v$.value.newTrainer.$touch();
        if (v$.value.newTrainer.$error) return NotifyWarning('Champ(s) invalide(s)');

        modalLoading.value = true;

        const roles = await Roles.list({ name: TRAINER });
        if (roles.length === 0) throw new Error('Role not found');

        await Users.create({ ...newTrainer.value, role: roles[0]._id });
        trainerCreationModal.value = false;
        NotifyPositive('Compte créé.');

        await sendWelcome();
        await refreshTrainers();
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyNegative('Compte déjà existant.');
        NotifyNegative('Erreur lors de la création du compte.');
      } finally {
        modalLoading.value = false;
      }
    };

    const nextStep = async () => {
      try {
        v$.value.newTrainer.local.email.$touch();
        if (v$.value.newTrainer.local.email.$error) return NotifyWarning('Champ(s) invalide(s)');

        modalLoading.value = true;
        const userInfo = await Users.exists({ email: newTrainer.value.local.email });

        if (!userInfo.exists) firstStep.value = false;
        else if (get(userInfo, 'user.role.vendor')) NotifyNegative('Compte déjà existant.');
        else {
          const roles = await Roles.list({ name: TRAINER });
          if (roles.length === 0) throw new Error('Role not found');

          await Users.updateById(userInfo.user._id, { role: roles[0]._id });
          NotifyPositive('Compte créé');

          await refreshTrainers();
          resetCreationModal();
          trainerCreationModal.value = false;
        }
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création du compte.');
        resetCreationModal();
      } finally {
        modalLoading.value = false;
      }
    };

    const created = async () => {
      await refreshTrainers();
    };

    created();

    return {
      // Validation
      v$,
      // Data
      tableLoading,
      columns,
      pagination,
      searchStr,
      trainerCreationModal,
      newTrainer,
      modalLoading,
      firstStep,
      path,
      // Computed
      filteredTrainers,
      // Method
      resetCreationModal,
      updateSearch,
      createTrainer,
      nextStep,
      emailError,
    };
  },
};
</script>
