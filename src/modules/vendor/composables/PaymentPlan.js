import { ref } from 'vue';
import SubPrograms from '@api/SubPrograms';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';

export const usePaymentPlan = (modalLoading, refreshProgram, program) => {
  const paymentPlanAdditionModal = ref(false);
  const paymentPlanEditionModal = ref(false);
  const paymentPlanListModal = ref(false);
  const editedPaymentPlan = ref({ prices: [] });
  const selectedSubProgramForPlan = ref({});

  const refreshSelectedSubProgram = () => {
    const subPrograms = program.value.subPrograms || [];
    selectedSubProgramForPlan.value = subPrograms.find(sp => sp._id === selectedSubProgramForPlan.value._id) || {};
  };

  const openPaymentPlanAdditionModal = (subProgram) => {
    selectedSubProgramForPlan.value = subProgram;
    paymentPlanAdditionModal.value = true;
  };

  const openPaymentPlanListModal = (subProgram) => {
    selectedSubProgramForPlan.value = subProgram;
    paymentPlanListModal.value = true;
  };

  const openPaymentPlanEditionModal = (paymentPlan) => {
    editedPaymentPlan.value = { _id: paymentPlan._id, prices: [...paymentPlan.prices] };
    paymentPlanListModal.value = false;
    paymentPlanEditionModal.value = true;
  };

  const addPaymentPlan = async ({ prices }) => {
    try {
      modalLoading.value = true;
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

  const editPaymentPlan = async ({ _id: paymentPlanId, prices }) => {
    try {
      modalLoading.value = true;
      await SubPrograms.update(selectedSubProgramForPlan.value._id, { paymentPlan: { paymentPlanId, prices } });
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

  const resetPaymentPlanEditionModal = () => {
    editedPaymentPlan.value = { prices: [] };
  };

  return {
    paymentPlanAdditionModal,
    paymentPlanEditionModal,
    paymentPlanListModal,
    editedPaymentPlan,
    selectedSubProgramForPlan,
    // Methods
    openPaymentPlanAdditionModal,
    openPaymentPlanListModal,
    openPaymentPlanEditionModal,
    addPaymentPlan,
    editPaymentPlan,
    deletePaymentPlan,
    resetPaymentPlanEditionModal,
  };
};
