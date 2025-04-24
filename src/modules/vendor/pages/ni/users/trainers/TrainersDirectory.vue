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
import { formatIdentity, removeDiacritics } from '@helpers/utils';
import { TRAINER, TRAINING_ORGANISATION_MANAGER } from '@data/constants';
import { userMixin } from '@mixins/userMixin';
import TrainerCreationModal from 'src/modules/vendor/components/trainers/TrainerCreationModal';

export default {
  name: 'TrainersDirectory',
  components: {
    'ni-directory-header': DirectoryHeader,
    'ni-table-list': TableList,
    'trainer-creation-modal': TrainerCreationModal,
  },
  mixins: [userMixin],
  setup () {
    const metaInfo = { title: 'Répertoire formateurs' };
    useMeta(metaInfo);

    return { v$: useVuelidate() };
  },
  data () {
    return {
      trainers: [],
      tableLoading: false,
      columns: [{ name: 'name', label: 'Nom', field: 'name', align: 'left', sortable: true }],
      pagination: { sortBy: 'name', descending: false, page: 1, rowsPerPage: 15 },
      searchStr: '',
      trainerCreationModal: false,
      newTrainer: { identity: { lastname: '', firstname: '', title: '' }, local: { email: '' } },
      modalLoading: false,
      firstStep: true,
      path: { name: 'ni users trainers info', params: 'trainerId' },
    };
  },
  validations () {
    return {
      newTrainer: { identity: { lastname: { required }, title: { required } }, local: { email: { required, email } } },
    };
  },
  computed: {
    filteredTrainers () {
      const formattedString = escapeRegExp(removeDiacritics(this.searchStr));
      return this.trainers.filter(trainer => trainer.noDiacriticsName.match(new RegExp(formattedString, 'i')));
    },
  },
  async created () {
    await this.refreshTrainers();
  },
  methods: {
    async nextStep () {
      try {
        this.v$.newTrainer.local.email.$touch();
        if (this.v$.newTrainer.local.email.$error) return NotifyWarning('Champ(s) invalide(s)');

        this.modalLoading = true;
        const userInfo = await Users.exists({ email: this.newTrainer.local.email });

        if (!userInfo.exists) this.firstStep = false;
        else if (get(userInfo, 'user.role.vendor')) NotifyNegative('Compte déjà existant.');
        else {
          const roles = await Roles.list({ name: TRAINER });
          if (roles.length === 0) throw new Error('Role not found');

          await Users.updateById(userInfo.user._id, { role: roles[0]._id });
          NotifyPositive('Compte créé');

          await this.refreshTrainers();
          this.resetCreationModal();
          this.trainerCreationModal = false;
        }
      } catch (e) {
        NotifyNegative('Erreur lors de la création du compte.');
        this.resetCreationModal();
      } finally {
        this.modalLoading = false;
      }
    },
    resetCreationModal () {
      this.firstStep = true;
      this.newTrainer = { identity: { lastname: '', firstname: '', title: '' }, local: { email: '' } };
      this.v$.newTrainer.$reset();
    },
    updateSearch (value) {
      this.searchStr = value;
    },
    formatTrainer (trainer) {
      const formattedName = formatIdentity(trainer.identity, 'FL');

      return { ...trainer, name: formattedName, noDiacriticsName: removeDiacritics(formattedName) };
    },
    async refreshTrainers () {
      try {
        this.tableLoading = true;
        const trainersAndROFs = await Users.list({ role: [TRAINER, TRAINING_ORGANISATION_MANAGER] });

        this.trainers = trainersAndROFs.map(trainer => this.formatTrainer(trainer));
      } catch (e) {
        console.error(e);
        this.trainers = [];
        NotifyNegative('Erreur lors de la récupération des formateurs.');
      } finally {
        this.tableLoading = false;
      }
    },
    async createTrainer () {
      try {
        this.v$.newTrainer.$touch();
        if (this.v$.newTrainer.$error) return NotifyWarning('Champ(s) invalide(s)');

        this.modalLoading = true;

        const roles = await Roles.list({ name: TRAINER });
        if (roles.length === 0) throw new Error('Role not found');

        await Users.create({ ...this.newTrainer, role: roles[0]._id });
        this.trainerCreationModal = false;
        NotifyPositive('Compte créé.');

        await this.sendWelcome();
        await this.refreshTrainers();
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyNegative('Compte déjà existant.');
        NotifyNegative('Erreur lors de la création du compte.');
      } finally {
        this.modalLoading = false;
      }
    },
    async sendWelcome () {
      try {
        await Email.sendWelcome({ email: this.newTrainer.local.email, type: TRAINER });
        NotifyPositive('Email envoyé');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'envoi du mail.');
      }
    },
  },
};
</script>
