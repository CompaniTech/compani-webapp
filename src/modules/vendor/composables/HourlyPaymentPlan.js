import { ref, computed } from 'vue';
import useVuelidate from '@vuelidate/core';
import { required, helpers } from '@vuelidate/validators';
import { strictPositiveNumber } from '@helpers/vuelidateCustomVal';
import SubPrograms from '@api/SubPrograms';
import { E_LEARNING } from '@data/constants';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';

export const useHourlyPaymentPlan = (modalLoading, refreshProgram, program) => {
  const hourlyPaymentPlanAdditionModal = ref(false);
  const hourlyPaymentPlanEditionModal = ref(false);
  const hourlyPaymentPlanListModal = ref(false);
  const selectedSubProgramForHourlyPlan = ref({});

  const emptyPlan = () => ({ subProgram: {}, prices: [], elearningPrice: '' });
  const newHourlyPaymentPlan = ref(emptyPlan());
  const editedHourlyPaymentPlan = ref({ planId: '', ...emptyPlan() });

  const planRules = {
    prices: { $each: helpers.forEach({ step: { required }, hourlyAmount: { required, strictPositiveNumber } }) },
    elearningPrice: {
      required: (value, plan) => !plan.hasELearning || required.$validator(value),
      strictPositiveNumber: (value, plan) => !plan.hasELearning || strictPositiveNumber(value),
    },
  };
  const rules = computed(() => ({
    newHourlyPaymentPlan: planRules,
    editedHourlyPaymentPlan: planRules,
  }));
  const v$ = useVuelidate(rules, { newHourlyPaymentPlan, editedHourlyPaymentPlan });

  const refreshSelectedSubProgram = () => {
    const subPrograms = program.value.subPrograms || [];
    selectedSubProgramForHourlyPlan.value = subPrograms
      .find(sp => sp._id === selectedSubProgramForHourlyPlan.value._id) || {};
  };

  const formatPayload = (plan) => {
    const prices = plan.prices.map(p => ({ step: p.step, hourlyAmount: Number(p.hourlyAmount) }));

    return {
      ...plan.planId && { hourlyPaymentPlanId: plan.planId },
      prices,
      ...plan.hasELearning && { elearningPrice: Number(plan.elearningPrice) },
    };
  };

  const openHourlyPaymentPlanAdditionModal = (subProgram) => {
    const steps = subProgram.steps.filter(s => s.type !== E_LEARNING);
    const hasELearning = subProgram.steps.some(s => s.type === E_LEARNING);

    selectedSubProgramForHourlyPlan.value = subProgram;
    newHourlyPaymentPlan.value = {
      subProgram: { _id: subProgram._id, steps, hourlyPaymentPlansCount: subProgram.hourlyPaymentPlans?.length },
      prices: steps.map(s => ({ step: s._id, hourlyAmount: 0 })),
      hasELearning,
      ...hasELearning && { elearningPrice: 0 },
    };
    hourlyPaymentPlanAdditionModal.value = true;
  };

  const resetHourlyPaymentPlanAdditionModal = () => {
    newHourlyPaymentPlan.value = emptyPlan();
    v$.value.newHourlyPaymentPlan.$reset();
  };

  const openHourlyPaymentPlanListModal = (subProgram) => {
    selectedSubProgramForHourlyPlan.value = subProgram;
    hourlyPaymentPlanListModal.value = true;
  };

  const openHourlyPaymentPlanEditionModal = (plan) => {
    const subProgram = selectedSubProgramForHourlyPlan.value;
    const steps = subProgram.steps.filter(s => s.type !== E_LEARNING);

    editedHourlyPaymentPlan.value = {
      planId: plan._id,
      subProgram: { _id: subProgram._id, steps },
      prices: plan.prices.map(p => ({ step: p.step, hourlyAmount: p.hourlyAmount })),
      hasELearning: subProgram.steps.some(s => s.type === E_LEARNING),
      elearningPrice: plan.elearningPrice,
    };
    hourlyPaymentPlanListModal.value = false;
    hourlyPaymentPlanEditionModal.value = true;
  };

  const resetHourlyPaymentPlanEditionModal = () => {
    editedHourlyPaymentPlan.value = { planId: '', ...emptyPlan() };
    v$.value.editedHourlyPaymentPlan.$reset();
  };

  const saveHourlyPaymentPlan = async (plan, validation, modal, successMessage) => {
    try {
      validation.$touch();
      if (validation.$error) return NotifyWarning('Champ(s) invalide(s).');

      modalLoading.value = true;
      await SubPrograms.update(plan.subProgram._id, { hourlyPaymentPlan: formatPayload(plan) });
      NotifyPositive(successMessage);
      modal.value = false;
    } catch (e) {
      console.error(e);
      if (e.data && e.data.statusCode === 403 && e.data.message) return NotifyWarning(e.data.message);
      NotifyNegative('Erreur lors de l\'enregistrement de la tarification au réel.');
    } finally {
      await refreshProgram();
      refreshSelectedSubProgram();
      modalLoading.value = false;
    }

    return null;
  };

  const addHourlyPaymentPlan = () => saveHourlyPaymentPlan(
    newHourlyPaymentPlan.value,
    v$.value.newHourlyPaymentPlan,
    hourlyPaymentPlanAdditionModal,
    'Tarification au réel créée.'
  );

  const editHourlyPaymentPlan = () => saveHourlyPaymentPlan(
    editedHourlyPaymentPlan.value,
    v$.value.editedHourlyPaymentPlan,
    hourlyPaymentPlanEditionModal,
    'Tarification au réel modifiée.'
  );

  const deleteHourlyPaymentPlan = async (hourlyPaymentPlanId) => {
    try {
      await SubPrograms.update(
        selectedSubProgramForHourlyPlan.value._id,
        { hourlyPaymentPlan: { hourlyPaymentPlanId, prices: [] } }
      );
      NotifyPositive('Tarification au réel supprimée.');
      hourlyPaymentPlanListModal.value = false;
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la suppression de la tarification au réel.');
    } finally {
      await refreshProgram();
      refreshSelectedSubProgram();
    }
  };

  return {
    hourlyPaymentPlanAdditionModal,
    hourlyPaymentPlanEditionModal,
    hourlyPaymentPlanListModal,
    selectedSubProgramForHourlyPlan,
    newHourlyPaymentPlan,
    editedHourlyPaymentPlan,
    v$,
    // Methods
    openHourlyPaymentPlanAdditionModal,
    resetHourlyPaymentPlanAdditionModal,
    openHourlyPaymentPlanListModal,
    openHourlyPaymentPlanEditionModal,
    resetHourlyPaymentPlanEditionModal,
    addHourlyPaymentPlan,
    editHourlyPaymentPlan,
    deleteHourlyPaymentPlan,
  };
};
