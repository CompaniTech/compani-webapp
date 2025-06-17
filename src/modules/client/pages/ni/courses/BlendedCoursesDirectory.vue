<template>
  <q-page class="client-background" padding>
    <ni-directory-header title="Formations" :display-search-bar="false" />
    <div class="reset-filters" @click="resetFilters">Effacer les filtres</div>
    <div class="filters-container">
      <ni-select v-if="companyFilterOptions.length > 2" :options="companyFilterOptions" :model-value="selectedCompany"
        clearable @update:model-value="updateSelectedCompany" />
      <ni-select :options="trainerFilterOptions" :model-value="selectedTrainer" clearable
        @update:model-value="updateSelectedTrainer" />
      <ni-select :options="programFilterOptions" :model-value="selectedProgram" clearable
        @update:model-value="updateSelectedProgram" />
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
import { useMeta } from 'quasar';
import { computed, ref } from 'vue';
import useVuelidate from '@vuelidate/core';
import { useStore } from 'vuex';
import { onBeforeRouteLeave } from 'vue-router';
import get from 'lodash/get';
import Courses from '@api/Courses';
import DateInput from '@components/form/DateInput';
import Select from '@components/form/Select';
import DirectoryHeader from '@components/DirectoryHeader';
import Trello from '@components/courses/Trello';
import { useCourseFilters } from '@composables/courseFilters';
import { BLENDED, OPERATIONS } from '@data/constants';
import { minDate, maxDate } from '@helpers/vuelidateCustomVal';
import store from 'src/store/index';

export default {
  name: 'BlendedCoursesDirectory',
  components: {
    'ni-select': Select,
    'ni-directory-header': DirectoryHeader,
    'ni-trello': Trello,
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
      companyFilterOptions,
      typeFilterOptions,
      statusOptions,
      selectedTrainer,
      trainerFilterOptions,
      selectedProgram,
      programFilterOptions,
      selectedCompany,
      selectedStartDate,
      selectedEndDate,
      selectedType,
      selectedNoAddressInSlots,
      selectedMissingTrainees,
      selectedStatus,
      updateSelectedCompany,
      updateSelectedTrainer,
      updateSelectedProgram,
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
          format: BLENDED,
          action: OPERATIONS,
          isArchived: false,
          ...(get(loggedUser.value, 'role.holding')
            ? { holding: get(loggedUser.value, 'holding._id') }
            : { company: get(loggedUser.value, 'company._id') || '' }
          ),
        });
        activeCourses.value = courseList;

        const archivedCourseList = await Courses.list({
          format: BLENDED,
          action: OPERATIONS,
          isArchived: true,
          ...(get(loggedUser.value, 'role.holding')
            ? { holding: loggedUser.value.holding._id }
            : { company: get(loggedUser.value, 'company._id') || '' }
          ),
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
      if (to.name !== 'ni courses info') resetFilters();
    });

    created();

    return {
      // Validation
      v$,
      // Data
      activeCourses,
      archivedCourses,
      typeFilterOptions,
      statusOptions,
      // Computed
      selectedTrainer,
      trainerFilterOptions,
      selectedProgram,
      programFilterOptions,
      selectedStartDate,
      selectedEndDate,
      selectedType,
      selectedNoAddressInSlots,
      selectedStatus,
      selectedMissingTrainees,
      selectedCompany,
      companyFilterOptions,
      loggedUser,
      // Methods
      updateSelectedTrainer,
      updateSelectedProgram,
      updateSelectedStartDate,
      updateSelectedEndDate,
      updateSelectedType,
      updateSelectedNoAddressInSlots,
      updateSelectedMissingTrainees,
      updateSelectedStatus,
      updateSelectedCompany,
      resetFilters,
    };
  },
  beforeRouteEnter (_, from, next) {
    if (from.name !== 'ni courses info') {
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
