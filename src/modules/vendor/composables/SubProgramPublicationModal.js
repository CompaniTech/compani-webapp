import { ref } from 'vue';
import { useQuasar } from 'quasar';
import SubPrograms from '@api/SubPrograms';
import Companies from '@api/Companies';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import { PUBLISHED, DIRECTORY } from '@data/constants';
import { formatAndSortCompanyOptions } from '@helpers/utils';

export const useSubProgramPublicationModal = (program, refreshProgram) => {
  const $q = useQuasar();

  const subProgramToPublish = ref(null);
  const subProgramPublicationModal = ref(false);
  const companyOptions = ref([]);

  const checkPublicationAndOpenModal = async (subProgram) => {
    subProgramToPublish.value = subProgram;

    const eLearningSubProgramAlreadyPublished = program.value.subPrograms.some(
      sp => sp.isStrictlyELearning && sp._id !== subProgram._id && sp.status === PUBLISHED
    );
    if (subProgram.isStrictlyELearning && eLearningSubProgramAlreadyPublished) {
      return NotifyWarning('Un programme ne peut contenir qu\'un seul sous programme eLearning publié.');
    }

    if (!subProgram.areStepsValid) return NotifyWarning('Le sous-programme n\'est pas valide.');

    return subProgram.isStrictlyELearning
      ? openSubProgramPublicationModal()
      : validateSubProgramPublication();
  };

  const openSubProgramPublicationModal = async () => {
    try {
      const companies = await Companies.list({ action: DIRECTORY });
      companyOptions.value = formatAndSortCompanyOptions(companies, 'name');
      subProgramPublicationModal.value = true;
    } catch (e) {
      console.error(e);
      subProgramPublicationModal.value = false;
      companyOptions.value = [];
    }
  };

  const validateSubProgramPublication = (accessCompanies = null) => {
    $q.dialog({
      title: 'Confirmation',
      message: 'Une fois le sous-programme publié, vous ne pourrez plus le modifier.<br />'
        + 'Êtes-vous sûr(e) de vouloir publier ce sous-programme&nbsp;?',
      html: true,
      ok: true,
      cancel: 'Annuler',
    }).onOk(() => publishSubProgram(accessCompanies))
      .onCancel(() => NotifyPositive('Publication annulée.'));
  };

  const publishSubProgram = async (accessCompanies) => {
    const payload = accessCompanies ? { status: PUBLISHED, accessCompanies } : { status: PUBLISHED };
    try {
      await SubPrograms.update(subProgramToPublish.value._id, payload);
      NotifyPositive('Sous programme publié');
      refreshProgram();
      subProgramPublicationModal.value = false;
    } catch (e) {
      console.error(e);
      if (e.status === 409) {
        return NotifyWarning('Un programme ne peut contenir qu\'un seul sous programme eLearning publié.');
      }

      NotifyNegative('Erreur lors de la publication du sous-programme.');
    }
  };

  const resetPublication = () => {
    subProgramToPublish.value = null;
  };

  return {
    // Data
    subProgramPublicationModal,
    companyOptions,
    // Methods
    checkPublicationAndOpenModal,
    validateSubProgramPublication,
    resetPublication,
  };
};
