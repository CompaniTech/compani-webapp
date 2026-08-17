<template>
  <q-page class="vendor-background" padding>
    <ni-directory-header title="Catalogue" search-placeholder="Rechercher un programme" @update-search="updateSearch"
      :search="searchStr" />
    <div class="filters-container">
      <ni-select :options="statusOptions" :model-value="selectedStatus" @update:model-value="updateSelectedStatus" />
    </div>
    <ni-table-list :data="filteredPrograms" :columns="columns" :loading="tableLoading" v-model:pagination="pagination"
      :path="path" />
    <q-btn class="fixed fab-custom" no-caps rounded color="primary" icon="add" label="Ajouter un programme"
      @click="programCreationModal = true" :disable="tableLoading" />

    <program-creation-modal v-model="programCreationModal" @hide="resetCreationModal" @submit="createProgram"
      :validations="v$.newProgram" :loading="modalLoading" v-model:new-program="newProgram" />
  </q-page>
</template>

<script>
import { useMeta } from 'quasar';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import escapeRegExp from 'lodash/escapeRegExp';
import Programs from '@api/Programs';
import DirectoryHeader from '@components/DirectoryHeader';
import TableList from '@components/table/TableList';
import Select from '@components/form/Select';
import ProgramCreationModal from 'src/modules/vendor/components/programs/ProgramCreationModal';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { ARCHIVED_PROGRAMS, UNARCHIVED_PROGRAMS } from '@data/constants';
import { removeDiacritics } from '@helpers/utils';

export default {
  name: 'ProgramDirectory',
  components: {
    'ni-directory-header': DirectoryHeader,
    'ni-table-list': TableList,
    'ni-select': Select,
    'program-creation-modal': ProgramCreationModal,
  },
  setup () {
    const metaInfo = { title: 'Catalogue' };
    useMeta(metaInfo);

    return { v$: useVuelidate() };
  },
  data () {
    return {
      tableLoading: false,
      columns: [
        { name: 'name', label: 'Nom', field: 'name', align: 'left', sortable: true },
        {
          name: 'subPrograms',
          label: 'Sous-programmes',
          field: 'subPrograms',
          format: value => value.length || '0',
          sortable: true,
          sort: (a, b) => b.length - a.length,
          align: 'center',
        },
      ],
      unarchivedPrograms: [],
      archivedPrograms: [],
      modalLoading: false,
      programCreationModal: false,
      newProgram: { name: '', category: '' },
      pagination: { sortBy: 'name', ascending: true, page: 1, rowsPerPage: 15 },
      searchStr: '',
      path: { name: 'ni pedagogy programs info', params: 'programId' },
      selectedStatus: UNARCHIVED_PROGRAMS,
      statusOptions: [
        { label: 'Tous les programmes', value: '' },
        { label: 'Programmes archivés', value: ARCHIVED_PROGRAMS },
        { label: 'Programmes non-archivés', value: UNARCHIVED_PROGRAMS },
      ],
    };
  },
  validations () {
    return {
      newProgram: {
        name: { required },
        category: { required },
      },
    };
  },
  computed: {
    programs () {
      if (this.selectedStatus === UNARCHIVED_PROGRAMS) return this.unarchivedPrograms;
      if (this.selectedStatus === ARCHIVED_PROGRAMS) return this.archivedPrograms;
      return [...this.unarchivedPrograms, ...this.archivedPrograms];
    },
    filteredPrograms () {
      const formattedString = escapeRegExp(removeDiacritics(this.searchStr));
      return this.programs.filter(program => program.noDiacriticsName.match(new RegExp(formattedString, 'i')));
    },
  },
  async created () {
    await this.refreshProgram();
  },
  methods: {
    updateSearch (value) {
      this.searchStr = value;
    },
    async updateSelectedStatus (status) {
      this.selectedStatus = status;

      const needsArchivedPrograms = [ARCHIVED_PROGRAMS, ''].includes(status);
      if (needsArchivedPrograms && !this.archivedPrograms.length) await this.refreshArchivedPrograms();
    },
    formatPrograms (programs) {
      return programs.map(p => ({ ...p, noDiacriticsName: removeDiacritics(p.name) }));
    },
    async refreshProgram () {
      try {
        this.tableLoading = true;
        const programList = await Programs.list({ isArchived: false });

        this.unarchivedPrograms = this.formatPrograms(programList);
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des programmes.');
      } finally {
        this.tableLoading = false;
      }
    },
    async refreshArchivedPrograms () {
      try {
        this.tableLoading = true;
        const programList = await Programs.list({ isArchived: true });

        this.archivedPrograms = this.formatPrograms(programList);
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des programmes archivés.');
      } finally {
        this.tableLoading = false;
      }
    },
    resetCreationModal () {
      this.v$.newProgram.$reset();
      this.newProgram = { name: '' };
    },
    async createProgram () {
      try {
        this.v$.newProgram.$touch();
        if (this.v$.newProgram.$error) return NotifyWarning('Champ(s) invalide(s)');

        this.modalLoading = true;
        await Programs.create({ name: this.newProgram.name, categories: [this.newProgram.category] });

        this.programCreationModal = false;
        NotifyPositive('Programme créé.');
        await this.refreshProgram();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création du programme.');
      } finally {
        this.modalLoading = false;
      }
    },
  },
};
</script>
