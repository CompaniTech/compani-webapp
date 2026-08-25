<template>
  <q-page class="vendor-background" padding>
    <ni-directory-header title="Catalogue" search-placeholder="Rechercher un programme" @update-search="updateSearch"
      :search="searchStr" />
    <div class="filters-container">
      <ni-select :options="statusOptions" :model-value="selectedStatus" @update:model-value="updateSelectedStatus" />
    </div>
    <ni-table-list :data="filteredPrograms" :columns="columns" :loading="tableLoading" v-model:pagination="pagination"
      :path="path">
      <template #body="{ col }">
        <q-item v-if="col.name === 'status'" class="items-center">
          <div v-if="col.value">
            <q-icon size="12px" name="circle" class="info-archived" />
            Archivée
          </div>
        </q-item>
        <template v-else>{{ col.value }}</template>
      </template>
    </ni-table-list>
    <q-btn class="fixed fab-custom" no-caps rounded color="primary" icon="add" label="Ajouter un programme"
      @click="programCreationModal = true" :disable="tableLoading" />

    <program-creation-modal v-model="programCreationModal" @hide="resetCreationModal" @submit="createProgram"
      :validations="v$.newProgram" :loading="modalLoading" v-model:new-program="newProgram" />
  </q-page>
</template>

<script>
import { ref, computed } from 'vue';
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

    const tableLoading = ref(false);
    const columns = ref([
      { name: 'name', label: 'Nom', field: 'name', align: 'left', sortable: true, style: 'width: 80%' },
      {
        name: 'subPrograms',
        label: 'Sous-programmes',
        field: 'subPrograms',
        format: value => value.length || '0',
        sortable: true,
        sort: (a, b) => b.length - a.length,
        align: 'center',
      },
      { name: 'status', label: '', field: row => row.archivedAt, align: 'right', style: 'width: 10%' },
    ]);
    const unarchivedPrograms = ref([]);
    const archivedPrograms = ref([]);
    const modalLoading = ref(false);
    const programCreationModal = ref(false);
    const newProgram = ref({ name: '', category: '' });
    const pagination = ref({ sortBy: 'name', ascending: true, page: 1, rowsPerPage: 15 });
    const searchStr = ref('');
    const path = ref({ name: 'ni pedagogy programs info', params: 'programId' });
    const selectedStatus = ref(UNARCHIVED_PROGRAMS);
    const statusOptions = ref([
      { label: 'Tous les programmes', value: '' },
      { label: 'Programmes archivés', value: ARCHIVED_PROGRAMS },
      { label: 'Programmes non-archivés', value: UNARCHIVED_PROGRAMS },
    ]);

    const rules = computed(() => ({ newProgram: { name: { required }, category: { required } } }));
    const v$ = useVuelidate(rules, { newProgram });

    const programs = computed(() => {
      if (selectedStatus.value === UNARCHIVED_PROGRAMS) return unarchivedPrograms.value;
      if (selectedStatus.value === ARCHIVED_PROGRAMS) return archivedPrograms.value;
      return [...unarchivedPrograms.value, ...archivedPrograms.value];
    });

    const filteredPrograms = computed(() => {
      const formattedString = escapeRegExp(removeDiacritics(searchStr.value));
      return programs.value.filter(program => program.noDiacriticsName.match(new RegExp(formattedString, 'i')));
    });

    const updateSearch = (value) => { searchStr.value = value; };

    const refreshProgram = async () => {
      try {
        tableLoading.value = true;
        const programList = await Programs.list({ isArchived: false });

        unarchivedPrograms.value = programList.map(p => ({ ...p, noDiacriticsName: removeDiacritics(p.name) }));
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des programmes.');
      } finally {
        tableLoading.value = false;
      }
    };

    const refreshArchivedPrograms = async () => {
      try {
        tableLoading.value = true;
        const programList = await Programs.list({ isArchived: true });

        archivedPrograms.value = programList.map(p => ({ ...p, noDiacriticsName: removeDiacritics(p.name) }));
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des programmes archivés.');
      } finally {
        tableLoading.value = false;
      }
    };

    const updateSelectedStatus = async (status) => {
      selectedStatus.value = status;

      if ([ARCHIVED_PROGRAMS, ''].includes(status) && !archivedPrograms.value.length) await refreshArchivedPrograms();
    };

    const resetCreationModal = () => {
      v$.value.newProgram.$reset();
      newProgram.value = { name: '' };
    };

    const createProgram = async () => {
      try {
        v$.value.newProgram.$touch();
        if (v$.value.newProgram.$error) return NotifyWarning('Champ(s) invalide(s)');

        modalLoading.value = true;
        await Programs.create({ name: newProgram.value.name, categories: [newProgram.value.category] });

        programCreationModal.value = false;
        NotifyPositive('Programme créé.');
        await refreshProgram();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création du programme.');
      } finally {
        modalLoading.value = false;
      }
    };

    const created = async () => {
      await refreshProgram();
    };

    created();

    return {
      // Validation
      v$,
      // Data
      tableLoading,
      columns,
      modalLoading,
      programCreationModal,
      newProgram,
      pagination,
      searchStr,
      path,
      selectedStatus,
      statusOptions,
      // Computed
      filteredPrograms,
      // Method
      updateSearch,
      updateSelectedStatus,
      resetCreationModal,
      createProgram,
    };
  },
};
</script>
