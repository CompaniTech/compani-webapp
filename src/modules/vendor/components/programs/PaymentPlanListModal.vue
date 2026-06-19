<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input">
    <template #title>
      Liste des <span class="text-weight-bold">échéanciers</span>
    </template>
    <div v-if="!paymentPlans.length" class="no-data text-italic q-my-md">
      Aucun échéancier renseigné pour ce sous-programme.
    </div>
    <q-expansion-item v-for="(plan, index) in paymentPlans" :key="plan._id" class="q-mb-md">
      <template #header>
        <div class="full-width row items-center justify-between">
          <span class="text-weight-bold">Échéancier {{ index + 1 }}</span>
          <div class="payment-plan-actions">
            <ni-button icon="edit" @click.stop="$emit('edit', plan)" />
            <ni-button icon="close" @click.stop="validateDeletion(plan._id)" />
          </div>
        </div>
      </template>
      <div class="q-pa-sm">
        <div v-for="(price, monthIndex) in plan.prices" :key="monthIndex" class="q-py-xs">
          Mois {{ monthIndex + 1 }} : {{ price }} €
        </div>
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
      hide,
      input,
      validateDeletion,
    };
  },
};
</script>

<style lang="sass" scoped>
.payment-plan-actions
  display: flex
.no-data
  text-align: center
</style>
