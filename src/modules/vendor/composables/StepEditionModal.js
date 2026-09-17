import { ref, computed } from 'vue';
import useVuelidate from '@vuelidate/core';
import pick from 'lodash/pick';
import { required } from '@vuelidate/validators';
import Steps from '@api/Steps';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import CompaniDuration from '@helpers/dates/companiDurations';
import { PT0S, PUBLISHED } from '@data/constants';

export const useStepEditionModal = (
  isLocked,
  openValidateUnlockingEditionModal,
  refreshProgram,
  modalLoading,
  openNextModalAfterUnlocking
) => {
  const editedStep = ref({ name: '', type: '', theoreticalDuration: PT0S, durationCountedPerTrainer: false });
  const stepEditionModal = ref(false);

  const positiveIntDuration = value => !CompaniDuration(value).isEquivalentTo(PT0S) &&
    value.match(/(PT\d*H\d*M|PT\d*S)/);

  const rules = computed(() => ({
    name: { required },
    theoreticalDuration: { positiveIntDuration },
  }));
  const v$ = useVuelidate(rules, editedStep);

  const openStepEditionModal = async (step) => {
    if (isLocked(step)) {
      openNextModalAfterUnlocking.value = () => openStepEditionModal(step);
      openValidateUnlockingEditionModal(step);
    } else {
      editedStep.value = {
        ...pick(step, ['_id', 'status', 'type', 'name', 'theoreticalDuration', 'durationCountedPerTrainer']),
      };
      stepEditionModal.value = true;
    }
  };

  const editStep = async () => {
    try {
      modalLoading.value = true;
      v$.value.$touch();
      if (v$.value.$error) return NotifyWarning('Champ(s) invalide(s)');

      const payload = editedStep.value.status === PUBLISHED
        ? pick(editedStep.value, ['name', 'theoreticalDuration'])
        : pick(editedStep.value, ['name', 'theoreticalDuration', 'durationCountedPerTrainer']);
      await Steps.updateById(editedStep.value._id, payload);
      stepEditionModal.value = false;
      await refreshProgram();
      NotifyPositive('Étape modifiée.');
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la modification de l\'étape.');
    } finally {
      modalLoading.value = false;
    }
  };

  const resetStepEditionModal = () => {
    editedStep.value = { name: '', type: '', theoreticalDuration: PT0S, durationCountedPerTrainer: false };
    v$.value.$reset();
  };

  return {
    // Data
    editedStep,
    stepEditionModal,
    v$,
    // Methods
    openStepEditionModal,
    editStep,
    resetStepEditionModal,
  };
};
