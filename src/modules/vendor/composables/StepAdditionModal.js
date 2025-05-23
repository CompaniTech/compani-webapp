import { ref, computed } from 'vue';
import useVuelidate from '@vuelidate/core';
import { E_LEARNING, CREATE_STEP } from '@data/constants';
import { required } from '@vuelidate/validators';
import SubPrograms from '@api/SubPrograms';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';

export const useStepAdditionModal = (setStepLocking, modalLoading, refreshProgram) => {
  const currentSubProgramId = ref('');
  const additionType = ref(CREATE_STEP);
  const newStep = ref({ name: '', type: E_LEARNING });
  const stepAdditionModal = ref(false);
  const reusedStep = ref({ _ids: [], program: '' });

  const rules = computed(() => ({
    newStep: { name: { required }, type: { required } },
    reusedStep: { _ids: { required }, program: { required } },
  }));
  const v$ = useVuelidate(rules, { newStep, reusedStep });

  const openStepAdditionModal = async (subProgramId) => {
    stepAdditionModal.value = true;
    currentSubProgramId.value = subProgramId;
  };

  const addStep = async () => {
    try {
      modalLoading.value = true;

      if (additionType.value === CREATE_STEP) {
        v$.value.newStep.$touch();
        if (v$.value.newStep.$error) return NotifyWarning('Champ(s) invalide(s)');

        await SubPrograms.addStep(currentSubProgramId.value, newStep.value);
        NotifyPositive('Étape créée.');
      } else {
        v$.value.reusedStep.$touch();
        if (v$.value.reusedStep.$error) return NotifyWarning('Champ(s) invalide(s)');

        await SubPrograms.reuseStep(currentSubProgramId.value, { steps: reusedStep.value._ids });
        setStepLocking(reusedStep.value, true);
        NotifyPositive('Étape réutilisée.');
      }

      await refreshProgram();
      stepAdditionModal.value = false;
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de l\'ajout de l\'étape.');
    } finally {
      modalLoading.value = false;
    }
  };

  const resetStepAdditionModal = () => {
    newStep.value = { name: '', type: E_LEARNING };
    additionType.value = CREATE_STEP;
    reusedStep.value = { _ids: [], program: '' };
    v$.value.newStep.$reset();
    v$.value.reusedStep.$reset();
  };

  return {
    // DATA
    currentSubProgramId,
    additionType,
    stepAdditionModal,
    newStep,
    reusedStep,
    v$,
    // Methods
    openStepAdditionModal,
    addStep,
    resetStepAdditionModal,
  };
};
