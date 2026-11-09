<template>
  <q-card class="container clickable cursor-pointer" flat>
    <q-expansion-item class="q-my-md" v-model="displayDetails">
      <template #header>
        <div class="full-width items-center">
          <span class="text-copper-500">{{ formatIdentity(trainer.identity, 'FL') }}</span>
          <div class="q-py-sm">
            <span class="text-weight-bold text-orange-500">
              Non facturé : {{ formatPrice(totals.notInvoiced) }}
              <template v-if="hasMissingPlannedSalary">&nbsp;(honoraires manquants)</template>
            </span>
            <span class="text-weight-bold text-copper-500">&nbsp;/ Facturé : {{ formatPrice(totals.invoiced) }}</span>
            <span class="text-weight-bold text-green-600">&nbsp;/ Réglé : {{ formatPrice(totals.paid) }}</span>
          </div>
        </div>
      </template>
      <div class="q-pa-sm bg-peach-200">
        <collective-course-billing-item v-for="course of trainer.courses" :key="course._id" :course="course" />
      </div>
    </q-expansion-item>
  </q-card>
</template>

<script>
import { computed, ref, toRefs } from 'vue';
import { formatIdentity, formatPrice } from '@helpers/utils';
import { add, subtract, isGreaterThan, toNumber } from '@helpers/numbers';
import CollectiveCourseBillingItem from 'src/modules/vendor/components/billing/CollectiveCourseBillingItem';

export default {
  name: 'CollectiveCoursesBillingCard',
  props: {
    trainer: { type: Object, default: () => ({}) },
  },
  components: {
    'collective-course-billing-item': CollectiveCourseBillingItem,
  },
  setup (props) {
    const { trainer } = toRefs(props);

    const displayDetails = ref(false);

    const totals = computed(() => {
      const { invoiced, notInvoiced, paid } = (trainer.value.courses || []).reduce((acc, course) => {
        const remaining = subtract(course.plannedSalary || 0, course.invoicedAmount);

        return {
          invoiced: add(acc.invoiced, course.invoicedAmount),
          notInvoiced: isGreaterThan(remaining, 0) ? add(acc.notInvoiced, remaining) : acc.notInvoiced,
          paid: add(acc.paid, course.paidAmount),
        };
      }, { invoiced: 0, notInvoiced: 0, paid: 0 });

      return { invoiced: toNumber(invoiced), notInvoiced: toNumber(notInvoiced), paid: toNumber(paid) };
    });

    const hasMissingPlannedSalary = computed(() => (trainer.value.courses || []).some(c => !c.plannedSalary));

    return {
      // Data
      displayDetails,
      // Computed
      totals,
      hasMissingPlannedSalary,
      // Methods
      formatIdentity,
      formatPrice,
    };
  },
};
</script>
