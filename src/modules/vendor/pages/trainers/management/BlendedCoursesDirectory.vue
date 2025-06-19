<template>
  <q-page class="vendor-background" padding>
    <ni-directory-header title="Formations" :display-search-bar="false" />
    <div class="reset-filters" @click="resetFilters">Effacer les filtres</div>
    <div class="filters-container">
      <ni-select :options="companyFilterOptions" :model-value="selectedCompany" clearable
        @update:model-value="updateSelectedCompany" />
      <ni-select :options="programFilterOptions" :model-value="selectedProgram" clearable
        @update:model-value="updateSelectedProgram" />
      <ni-select :options="operationsRepresentativeFilterOptions" clearable
        :model-value="selectedOperationsRepresentative" @update:model-value="updateSelectedOperationsRepresentative" />
      <ni-date-input :model-value="selectedStartDate" @update:model-value="updateSelectedStartDate"
        placeholder="Début de période" :max="selectedEndDate" :error="v$.selectedStartDate.$error"
        error-message="La date de début doit être antérieure à la date de fin" @blur="v$.selectedStartDate.$touch" />
      <ni-date-input :model-value="selectedEndDate" @update:model-value="updateSelectedEndDate"
        placeholder="Fin de période" :min="selectedStartDate" :error="v$.selectedEndDate.$error"
        error-message="La date de fin doit être postérieure à la date de début" @blur="v$.selectedEndDate.$touch" />
      <ni-select :options="typeFilterOptions" clearable :model-value="selectedType"
        @update:model-value="updateSelectedType" />
      <ni-select :options="statusOptions" :model-value="selectedStatus" @update:model-value="updateSelectedStatus" />
    </div>
    <div class="q-mb-lg filters-container checkboxes">
      <q-checkbox dense :model-value="selectedNoAddressInSlots" color="primary" label="Aucune adresse"
        @update:model-value="updateSelectedNoAddressInSlots" />
      <q-checkbox dense :model-value="selectedMissingTrainees" color="primary" label="Apprenant(s) manquant(s) (INTRA)"
        @update:model-value="updateSelectedMissingTrainees" />
    </div>
    <ni-trello :active-courses="activeCourses" :archived-courses="archivedCourses" />
  </q-page>
</template>

<script>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useMeta } from 'quasar';
import { onBeforeRouteLeave } from 'vue-router';
import useVuelidate from '@vuelidate/core';
import Courses from '@api/Courses';
import DirectoryHeader from '@components/DirectoryHeader';
import Trello from '@components/courses/Trello';
import DateInput from '@components/form/DateInput';
import Select from '@components/form/Select';
import { BLENDED, OPERATIONS } from '@data/constants';
import { useCourseFilters } from '@composables/courseFilters';
import { minDate, maxDate } from '@helpers/vuelidateCustomVal';
import store from 'src/store/index';

export default {
  name: 'BlendedCoursesDirectory',
  components: {
    'ni-directory-header': DirectoryHeader,
    'ni-trello': Trello,
    'ni-select': Select,
    'ni-date-input': DateInput,
  },
  setup () {
    const $store = useStore();
    const metaInfo = { title: 'Kanban formations mixtes' };
    useMeta(metaInfo);

    const activeCourses = ref([]);
    const archivedCourses = ref([]);

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const {
      typeFilterOptions,
      selectedCompany,
      companyFilterOptions,
      selectedProgram,
      programFilterOptions,
      selectedOperationsRepresentative,
      operationsRepresentativeFilterOptions,
      selectedStartDate,
      selectedEndDate,
      selectedType,
      selectedNoAddressInSlots,
      selectedMissingTrainees,
      statusOptions,
      selectedStatus,
      updateSelectedCompany,
      updateSelectedProgram,
      updateSelectedOperationsRepresentative,
      updateSelectedStartDate,
      updateSelectedEndDate,
      updateSelectedType,
      updateSelectedNoAddressInSlots,
      updateSelectedMissingTrainees,
      updateSelectedStatus,
      resetFilters,
    } = useCourseFilters(activeCourses, archivedCourses);

    const rules = computed(() => ({
      selectedStartDate: { maxDate: selectedEndDate.value ? maxDate(selectedEndDate.value) : '' },
      selectedEndDate: { minDate: selectedStartDate.value ? minDate(selectedStartDate.value) : '' },
    }));
    const v$ = useVuelidate(rules, { selectedStartDate, selectedEndDate });

    const refreshCourses = async () => {
      try {
        const courseList = await Courses.list({
          trainer: loggedUser.value._id,
          format: BLENDED,
          action: OPERATIONS,
          isArchived: false,
        });
        activeCourses.value = courseList;

        const archivedCourseList = await Courses.list({
          trainer: loggedUser.value._id,
          format: BLENDED,
          action: OPERATIONS,
          isArchived: true,
        });
        archivedCourses.value = archivedCourseList;
      } catch (e) {
        console.error(e);
        activeCourses.value = [];
        archivedCourses.value = [];
      }
    };

    const created = async () => {
      await refreshCourses();
    };

    onBeforeRouteLeave((to) => {
      if (to.name !== 'trainers courses info') resetFilters();
    });

    created();

    return {
      // Validation
      v$,
      // Data
      activeCourses,
      archivedCourses,
      statusOptions,
      typeFilterOptions,
      // Computed
      selectedCompany,
      companyFilterOptions,
      selectedProgram,
      programFilterOptions,
      selectedOperationsRepresentative,
      operationsRepresentativeFilterOptions,
      selectedStartDate,
      selectedEndDate,
      selectedType,
      selectedNoAddressInSlots,
      selectedMissingTrainees,
      selectedStatus,
      // Methods
      updateSelectedCompany,
      updateSelectedProgram,
      updateSelectedOperationsRepresentative,
      updateSelectedStartDate,
      updateSelectedEndDate,
      updateSelectedType,
      updateSelectedNoAddressInSlots,
      updateSelectedMissingTrainees,
      updateSelectedStatus,
      resetFilters,
    };
  },
  beforeRouteEnter (_, from, next) {
    if (from.name !== 'trainers courses info') {
      store.dispatch('course/resetFilters', { isClientInterfaceOrTrainer: true });
    }

    next();
  },
};
</script>

<style lang="sass" scoped>
.checkboxes
  grid-gap: 12px 10px
</style>
