import { ref, computed } from 'vue';
import useVuelidate from '@vuelidate/core';
import { required, helpers } from '@vuelidate/validators';
import { strictPositiveNumber } from '@helpers/vuelidateCustomVal';
import SubPrograms from '@api/SubPrograms';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';

export const usePaymentPlan = (modalLoading, refreshProgram, program) => {
  const paymentPlanAdditionModal = ref(false);
  const paymentPlanEditionModal = ref(false);
  const paymentPlanListModal = ref(false);
  const selectedSubProgramForPlan = ref({});

  const newPaymentPlan = ref({ priceLines: [{ amount: null }] });
  const editedPaymentPlan = ref({ priceLines: [] });

  const rules = computed(() => ({
    newPaymentPlan: { priceLines: { $each: helpers.forEach({ amount: { required, strictPositiveNumber } }) } },
    editedPaymentPlan: { priceLines: { $each: helpers.forEach({ amount: { required, strictPositiveNumber } }) } },
  }));
  const v$ = useVuelidate(rules, { newPaymentPlan, editedPaymentPlan });

  const refreshSelectedSubProgram = () => {
    const subPrograms = program.value.subPrograms || [];
    selectedSubProgramForPlan.value = subPrograms.find(sp => sp._id === selectedSubProgramForPlan.value._id) || {};
  };

  const openPaymentPlanAdditionModal = (subProgram) => {
    selectedSubProgramForPlan.value = subProgram;
    newPaymentPlan.value = { priceLines: [{ amount: null }] };
    paymentPlanAdditionModal.value = true;
  };

  const resetPaymentPlanAdditionModal = () => {
    newPaymentPlan.value = { priceLines: [{ amount: null }] };
    v$.value.newPaymentPlan.$reset();
  };

  const openPaymentPlanListModal = (subProgram) => {
    selectedSubProgramForPlan.value = subProgram;
    paymentPlanListModal.value = true;
  };

  const openPaymentPlanEditionModal = (paymentPlan) => {
    const priceLines = paymentPlan.prices.map(price => ({ amount: price }));
    editedPaymentPlan.value = { _id: paymentPlan._id, priceLines };
    paymentPlanListModal.value = false;
    paymentPlanEditionModal.value = true;
  };

  const resetPaymentPlanEditionModal = () => {
    editedPaymentPlan.value = { priceLines: [] };
    v$.value.editedPaymentPlan.$reset();
  };

  const addPaymentPlan = async () => {
    try {
      v$.value.newPaymentPlan.$touch();
      if (v$.value.newPaymentPlan.$error) return NotifyWarning('Champ(s) invalide(s).');

      modalLoading.value = true;
      const prices = newPaymentPlan.value.priceLines.map(line => Number(line.amount));
      await SubPrograms.update(selectedSubProgramForPlan.value._id, { paymentPlan: { prices } });
      NotifyPositive('Échéancier créé.');
      paymentPlanAdditionModal.value = false;
    } catch (e) {
      console.error(e);
      if (e.data && e.data.statusCode === 403 && e.data.message) return NotifyWarning(e.data.message);
      NotifyNegative('Erreur lors de l\'enregistrement de l\'échéancier.');
    } finally {
      await refreshProgram();
      refreshSelectedSubProgram();
      modalLoading.value = false;
    }
  };

  const editPaymentPlan = async () => {
    try {
      v$.value.editedPaymentPlan.$touch();
      if (v$.value.editedPaymentPlan.$error) return NotifyWarning('Champ(s) invalide(s).');

      modalLoading.value = true;
      const prices = editedPaymentPlan.value.priceLines.map(line => Number(line.amount));
      await SubPrograms.update(
        selectedSubProgramForPlan.value._id,
        { paymentPlan: { paymentPlanId: editedPaymentPlan.value._id, prices } }
      );
      NotifyPositive('Échéancier modifié.');
      paymentPlanEditionModal.value = false;
    } catch (e) {
      console.error(e);
      if (e.data && e.data.statusCode === 403 && e.data.message) return NotifyWarning(e.data.message);
      NotifyNegative('Erreur lors de l\'enregistrement de l\'échéancier.');
    } finally {
      await refreshProgram();
      refreshSelectedSubProgram();
      modalLoading.value = false;
    }
  };

  const deletePaymentPlan = async (paymentPlanId) => {
    try {
      await SubPrograms.update(
        selectedSubProgramForPlan.value._id,
        { paymentPlan: { paymentPlanId, prices: [] } }
      );
      NotifyPositive('Échéancier supprimé.');
      paymentPlanListModal.value = false;
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la suppression de l\'échéancier.');
    } finally {
      await refreshProgram();
      refreshSelectedSubProgram();
    }
  };

  return {
    paymentPlanAdditionModal,
    paymentPlanEditionModal,
    paymentPlanListModal,
    selectedSubProgramForPlan,
    newPaymentPlan,
    editedPaymentPlan,
    v$,
    // Methods
    openPaymentPlanAdditionModal,
    resetPaymentPlanAdditionModal,
    openPaymentPlanListModal,
    openPaymentPlanEditionModal,
    resetPaymentPlanEditionModal,
    addPaymentPlan,
    editPaymentPlan,
    deletePaymentPlan,
  };
};
