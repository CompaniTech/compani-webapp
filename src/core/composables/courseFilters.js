import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import sortedUniqBy from 'lodash/sortedUniqBy';
import get from 'lodash/get';
import CompaniDate from '@helpers/dates/companiDates';
import { formatAndSortIdentityOptions, formatAndSortCompanyOptions } from '@helpers/utils';
import {
  WITHOUT_TRAINER,
  ARCHIVED_COURSES,
  COURSE_TYPES,
  UNARCHIVED_COURSES,
  WITHOUT_SALES_REPRESENTATIVE,
  TRAINER,
} from '@data/constants';

export const useCourseFilters = (activeCourses, archivedCourses, holdingsOptions = [], courseTypes = COURSE_TYPES) => {
  const $store = useStore();
  const $router = useRouter();

  const isVendorInterface = /\/ad\//.test($router.currentRoute.value.path);

  const loggedUser = computed(() => $store.state.main.loggedUser);

  const loggedUserIsTrainer = computed(() => get(loggedUser.value, 'role.vendor.name') === TRAINER);

  const courses = computed(() => [...activeCourses.value, ...archivedCourses.value]);

  /* TRAINER */
  const selectedTrainer = computed(() => $store.state.course.selectedTrainer);

  const trainerFilterOptions = computed(() => {
    const filteredCourses = courses.value.filter(course => get(course, 'trainers', []).length);
    const trainers = filteredCourses
      .flatMap(course => formatAndSortIdentityOptions(course.trainers))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [
      { label: 'Tous les intervenants', value: '' },
      { label: 'Sans intervenant(e)', value: WITHOUT_TRAINER },
      ...sortedUniqBy(trainers, 'value'),
    ];
  });

  const updateSelectedTrainer = trainerId => $store.dispatch('course/setSelectedTrainer', { trainerId });

  /* TRAINEE */
  const selectedTrainee = computed(() => $store.state.course.selectedTrainee);

  const traineeFilterOptions = computed(() => {
    const trainees = courses.value
      .flatMap(course => formatAndSortIdentityOptions(course.trainees))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [
      { label: 'Tous les stagiaires', value: '' },
      ...sortedUniqBy(trainees, 'value'),
    ];
  });

  const updateSelectedTrainee = traineeId => $store.dispatch('course/setSelectedTrainee', { traineeId });

  /* PROGRAM */
  const selectedProgram = computed(() => $store.state.course.selectedProgram);

  const programFilterOptions = computed(() => {
    const programs = courses.value
      .map(course => ({ label: course.subProgram.program.name, value: course.subProgram.program._id }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ label: 'Tous les programmes', value: '' }, ...sortedUniqBy(programs, 'value')];
  });

  const updateSelectedProgram = programId => $store.dispatch('course/setSelectedProgram', { programId });

  /* HOLDING */
  const selectedHolding = computed(() => $store.state.course.selectedHolding);

  const holdingFilterOptions = computed(() => [
    { label: 'Toutes les sociétés mères', value: '' },
    ...sortedUniqBy(holdingsOptions.value, 'value'),
  ]);

  const updateSelectedHolding = holdingId => $store.dispatch('course/setSelectedHolding', { holdingId });

  /* COMPANY */
  const selectedCompany = computed(() => $store.state.course.selectedCompany);

  const companyFilterOptions = computed(() => {
    const companies = courses.value
      .flatMap((course) => {
        if (isVendorInterface) return formatAndSortCompanyOptions(course.companies);
        if (loggedUser.value.role.holding) {
          return course.companies
            .filter(company => loggedUser.value.holding.companies.includes(company._id))
            .map(company => ({ label: company.name, value: company._id }));
        }
        return [];
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ label: 'Toutes les structures', value: '' }, ...sortedUniqBy(companies, 'value')];
  });

  const updateSelectedCompany = companyId => $store.dispatch('course/setSelectedCompany', { companyId });

  /* OPERATIONS REPRESENTATIVE */
  const selectedOperationsRepresentative = computed(() => $store.state.course.selectedOperationsRepresentative);

  const operationsRepresentativeFilterOptions = computed(() => {
    const filteredCourses = courses.value.filter(course => !!course.operationsRepresentative);
    const operationsRepresentatives = formatAndSortIdentityOptions(filteredCourses, 'operationsRepresentative');

    return [
      { label: 'Tous les chargés des opérations', value: '' },
      ...sortedUniqBy(operationsRepresentatives, 'value'),
    ];
  });

  const updateSelectedOperationsRepresentative = (operationsRepresentativeId) => {
    $store.dispatch('course/setSelectedOperationsRepresentative', { operationsRepresentativeId });
  };

  /* DATES */
  const selectedStartDate = computed(() => $store.state.course.selectedStartDate);
  const selectedEndDate = computed(() => $store.state.course.selectedEndDate);

  const updateSelectedStartDate = (startDate) => {
    $store.dispatch('course/setSelectedStartDate', { startDate: CompaniDate(startDate).startOf('day').toISO() });
  };

  const updateSelectedEndDate = (endDate) => {
    $store.dispatch('course/setSelectedEndDate', { endDate: CompaniDate(endDate).endOf('day').toISO() });
  };

  /* TYPE */
  const selectedType = computed(() => $store.state.course.selectedType);

  const typeFilterOptions = ref([{ label: 'Tous les types', value: '' }, ...courseTypes]);

  const updateSelectedType = type => $store.dispatch('course/setSelectedType', { type });

  /* NO ADDRESS IN SLOTS */
  const selectedNoAddressInSlots = computed(() => $store.state.course.selectedNoAddressInSlots);

  const updateSelectedNoAddressInSlots = (isSelected) => {
    $store.dispatch('course/setSelectedNoAddressInSlots', { isSelected });
  };

  /* MISSING TRAINEES */
  const selectedMissingTrainees = computed(() => $store.state.course.selectedMissingTrainees);

  const updateSelectedMissingTrainees = (isSelected) => {
    $store.dispatch('course/setSelectedMissingTrainees', { isSelected });
  };

  /* ARCHIVED COURSES */
  const archiveStatusOptions = ref([
    { label: 'Toutes les formations', value: '' },
    { label: 'Formations archivées', value: ARCHIVED_COURSES },
    { label: 'Formations non-archivées', value: UNARCHIVED_COURSES },
  ]);
  const selectedArchiveStatus = computed(() => $store.state.course.selectedArchiveStatus);

  const updateSelectedArchiveStatus = (status) => {
    $store.dispatch('course/setSelectedArchiveStatus', { status });
  };

  const resetFilters = () => {
    const isClientInterfaceOrTrainer = !isVendorInterface || loggedUserIsTrainer.value;
    $store.dispatch('course/resetFilters', { isClientInterfaceOrTrainer });
  };

  /* SALES REPRESENTATIVE */
  const selectedSalesRepresentative = computed(() => $store.state.course.selectedSalesRepresentative);

  const salesRepresentativeFilterOptions = computed(() => {
    const filteredCourses = courses.value.filter(course => !!course.salesRepresentative);
    const salesRepresentative = formatAndSortIdentityOptions(filteredCourses, 'salesRepresentative');

    return [
      { label: 'Tous les chargés d\'accompagnement', value: '' },
      { label: 'Sans chargé d\'accompagnement', value: WITHOUT_SALES_REPRESENTATIVE },
      ...sortedUniqBy(salesRepresentative, 'value'),
    ];
  });

  const updateSelectedSalesRepresentative = (salesRepresentativeId) => {
    $store.dispatch('course/setSelectedSalesRepresentative', { salesRepresentativeId });
  };

  return {
    // data
    typeFilterOptions,
    archiveStatusOptions,
    // Computed
    selectedTrainer,
    trainerFilterOptions,
    selectedTrainee,
    traineeFilterOptions,
    selectedProgram,
    programFilterOptions,
    selectedHolding,
    holdingFilterOptions,
    selectedCompany,
    companyFilterOptions,
    selectedOperationsRepresentative,
    operationsRepresentativeFilterOptions,
    selectedStartDate,
    selectedEndDate,
    selectedType,
    selectedNoAddressInSlots,
    selectedMissingTrainees,
    selectedArchiveStatus,
    selectedSalesRepresentative,
    salesRepresentativeFilterOptions,
    // Methods
    updateSelectedTrainer,
    updateSelectedTrainee,
    updateSelectedProgram,
    updateSelectedHolding,
    updateSelectedCompany,
    updateSelectedOperationsRepresentative,
    updateSelectedStartDate,
    updateSelectedEndDate,
    updateSelectedType,
    updateSelectedNoAddressInSlots,
    updateSelectedMissingTrainees,
    updateSelectedArchiveStatus,
    resetFilters,
    updateSelectedSalesRepresentative,
  };
};
