<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Liste des <span class="text-weight-bold">échéanciers</span>
    </template>
    <div v-if="!paymentPlans.length" class="no-data">Aucun échéancier renseigné pour ce sous-programme.</div>
    <div v-for="(plan, index) in paymentPlans" :key="plan._id" class="payment-plan-line">
      <div>Échéancier {{ index + 1 }} : {{ formatPrices(plan.prices) }}</div>
      <div class="payment-plan-actions">
        <ni-button icon="edit" @click="$emit('edit', plan)" />
        <ni-button icon="close" @click="validateDeletion(plan._id)" />
      </div>
    </div>
  </ni-modal>
</template>

<script>
import { toRefs, computed } from 'vue';
import { useQuasar } from 'quasar';
import { NotifyPositive } from '@components/popup/notify';
import Modal from '@components/modal/Modal';
import Button from '@components/Button';

export default {
  name: 'PaymentPlanListModal',
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

    const paymentPlans = computed(() => subProgram.value.paymentPlans || []);

    const formatPrices = prices => prices.map(price => `${price} €`).join(' + ');

    const hide = () => { emit('hide'); };
    const input = (event) => { emit('update:model-value', event); };

    const validateDeletion = (paymentPlanId) => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir supprimer cet échéancier&nbsp;?',
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => emit('delete', paymentPlanId))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

    return {
      // Computed
      paymentPlans,
      // Methods
      formatPrices,
      hide,
      input,
      validateDeletion,
    };
  },
};
</script>

<style lang="sass" scoped>
.payment-plan-line
  display: flex
  align-items: center
  justify-content: space-between
  margin-bottom: 8px
.payment-plan-actions
  display: flex
.no-data
  text-align: center
  margin: 16px 0
</style>
