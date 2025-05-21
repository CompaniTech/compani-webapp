import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import Companies from '@api/Companies';
import Courses from '@api/Courses';
import { INTRA_HOLDING, DIRECTORY } from '@data/constants';
import { formatAndSortCompanyOptions } from '@helpers/utils';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';

export const useCompaniesCoursesLink = (course, emit) => {
  const $q = useQuasar();

  const selectedCompany = ref('');
  const companyAdditionModal = ref(false);
  const companyModalLoading = ref(false);
  const selectCompanyOptions = ref([]);

  const companiesCount = computed(() => course.value.companies.length);

  const rules = { selectedCompany: { required } };

  const companyValidation = useVuelidate(rules, { selectedCompany });

  const resetCompanyAdditionModal = () => {
    selectedCompany.value = '';
    companyValidation.value.selectedCompany.$reset();
  };

  const getPotentialCompanies = async () => {
    try {
      const query = course.value.type === INTRA_HOLDING ? { holding: course.value.holding } : { action: DIRECTORY };
      const potentialCompanies = Object.freeze(await Companies.list(query));
      selectCompanyOptions.value = formatAndSortCompanyOptions(potentialCompanies);
    } catch (error) {
      selectCompanyOptions.value = [];
      console.error(error);
    }
  };

  const openCompanyAdditionModal = () => {
    if (course.value.archivedAt) {
      return NotifyWarning('Vous ne pouvez pas rattacher de structure à une formation archivée.');
    }

    companyAdditionModal.value = true;
  };

  const addCompany = async () => {
    try {
      companyModalLoading.value = true;
      companyValidation.value.selectedCompany.$touch();
      if (companyValidation.value.selectedCompany.$error) return NotifyWarning('Champ(s) invalide(s)');

      await Courses.addCompany(course.value._id, { company: selectedCompany.value });
      companyAdditionModal.value = false;
      emit('refresh');
      NotifyPositive('Structure rattachée.');
    } catch (e) {
      console.error(e);
      if (e.status === 409) return NotifyNegative(e.data.message);
      if (e.status === 403) return NotifyWarning(e.data.message);
      NotifyNegative('Erreur lors du rattachement de la structure.');
    } finally {
      companyModalLoading.value = false;
    }
  };

  const validateCompanyDeletion = (companyId) => {
    $q.dialog({
      title: 'Confirmation',
      message: 'Êtes-vous sûr(e) de vouloir détacher la structure de la formation&nbsp;? <br /><br /> Les éventuelles '
        + 'conventions de formation associées seront supprimées.',
      html: true,
      ok: true,
      cancel: 'Annuler',
    }).onOk(() => deleteCompany(companyId))
      .onCancel(() => NotifyPositive('Détachement annulé.'));
  };

  const deleteCompany = async (companyId) => {
    try {
      await Courses.deleteCompany(course.value._id, companyId);
      emit('refresh');
      NotifyPositive('Structure détachée.');
    } catch (e) {
      console.error(e);
      if (e.status === 403 && e.data.message) return NotifyNegative(e.data.message);
      NotifyNegative('Erreur lors du détachement de la structure.');
    }
  };

  return {
    // Data
    selectedCompany,
    companyAdditionModal,
    companyModalLoading,
    selectCompanyOptions,
    // Computed
    companiesCount,
    // Validations
    companyValidation,
    // Methods
    resetCompanyAdditionModal,
    getPotentialCompanies,
    openCompanyAdditionModal,
    addCompany,
    validateCompanyDeletion,
  };
};
