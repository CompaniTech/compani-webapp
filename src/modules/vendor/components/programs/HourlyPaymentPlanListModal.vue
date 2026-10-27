<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Liste des <span class="text-weight-bold">tarifications au réel</span>
    </template>
    <div v-if="!hourlyPaymentPlans.length" class="no-data text-italic q-my-md">
      Aucune tarification au réel renseignée pour ce sous-programme.
    </div>
    <q-expansion-item v-for="(plan, index) in hourlyPaymentPlans" :key="plan._id" class="q-mb-md">
      <template #header>
        <div class="full-width row items-center justify-between">
          <span class="text-weight-bold">Tarification au réel {{ index + 1 }}</span>
          <div class="plan-actions">
            <ni-button icon="edit" @click.stop="$emit('edit', plan)" />
            <ni-button icon="close" @click.stop="validateDeletion(plan._id)" />
          </div>
        </div>
      </template>
      <div class="q-pa-sm">
        <div v-for="price in plan.prices" :key="price.step" class="q-py-xs">
          {{ getStepName(price.step) }} : {{ price.hourlyAmount }} € / h
        </div>
        <div v-if="plan.elearningPrice" class="q-py-xs">E-learning : {{ plan.elearningPrice }} €</div>
      </div>
    </q-expansion-item>
  </ni-modal>
</template>

<script>
import { toRefs, computed } from 'vue';
import { useQuasar } from 'quasar';
import { NotifyPositive } from '@components/popup/notify';
import Modal from '@components/modal/Modal';
import Button from '@components/Button';

export default {
  name: 'HourlyPaymentPlanListModal',
  props: {
    modelValue: { type: Boolean, default: false },
    subProgram: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-modal': Modal,
    'ni-button': Button,
  },
  emits: ['hide', 'update:model-value', 'edit', 'delete'],
  setup (props, { emit }) {
    const { subProgram } = toRefs(props);
    const $q = useQuasar();

    const hourlyPaymentPlans = computed(() => subProgram.value.hourlyPaymentPlans || []);

    const hide = () => { emit('hide'); };
    const input = (event) => { emit('update:model-value', event); };

    const getStepName = stepId => (subProgram.value.steps || []).find(s => s._id === stepId)?.name || '';

    const validateDeletion = (hourlyPaymentPlanId) => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir supprimer cette tarification&nbsp;?',
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => emit('delete', hourlyPaymentPlanId))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

    return {
      // Computed
      hourlyPaymentPlans,
      // Methods
      hide,
      input,
      getStepName,
      validateDeletion,
    };
  },
};
</script>

<style lang="sass" scoped>
.plan-actions
  display: flex
.no-data
  text-align: center
</style>
