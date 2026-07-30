<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Facturer les créneaux sélectionnés
    </template>
    <ni-banner class="bg-copper-grey-100 q-ma-md text-red-800" icon="info_outline">
      <template #message>
        Pour facturer ces créneaux à Compani, chargez une facture du montant TTC total indiqué et validez.
        Toute facture d'un montant différent sera refusée.
      </template>
    </ni-banner>
    <q-expansion-item :label="`Créneaux sélectionnés (${uniqueDateSlots.length})`" header-class="text-weight-bold"
      dense>
      <div v-for="slot of uniqueDateSlots" :key="slot._id" class="row q-my-sm q-mx-md">
        <span>
          {{ CompaniDate(slot.startDate).format(`${DD_MM_YYYY} ${HHhMM}`) }} -
          {{ CompaniDate(slot.endDate).format(HHhMM) }} ({{ formatStringToPrice(slot.amount) }})
        </span>
      </div>
    </q-expansion-item>
    <p class="q-my-md text-weight-bold text-red-800">Montant TTC total à facturer : {{ formattedTotalAmount }}</p>
    <ni-input type="file" in-modal caption="Facture (PDF)" v-model="bill.file" @blur="validations.file.$touch"
      :error="validations.file.$error" :extensions="[DOC_EXTENSIONS]" required-field />
    <ni-input caption="Numéro de facture" in-modal v-model="bill.number" @blur="validations.number.$touch"
      :error="validations.number.$error" last required-field />
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Soumettre la facture" :loading="loading" color="white"
        @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs, computed } from 'vue';
import uniqBy from 'lodash/uniqBy';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import Button from '@components/Button';
import Banner from '@components/Banner';
import { ascendingSortBy } from '@helpers/dates/utils';
import { formatStringToPrice } from '@helpers/utils';
import { add } from '@helpers/numbers';
import CompaniDate from '@helpers/dates/companiDates';
import { DD_MM_YYYY, HHhMM, DOC_EXTENSIONS } from '@data/constants';

export default {
  name: 'CourseSlotBillModal',
  components: {
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-button': Button,
    'ni-banner': Banner,
  },
  props: {
    modelValue: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    courseSlots: { type: Array, default: () => [] },
    bill: { type: Object, required: true },
  },
  emits: ['hide', 'update:model-value', 'submit'],
  setup (props, { emit }) {
    const { courseSlots } = toRefs(props);

    const uniqueDateSlots = computed(
      () => uniqBy(courseSlots.value, slot => `${slot.startDate}_${slot.endDate}`).sort(ascendingSortBy('startDate'))
    );

    const formattedTotalAmount = computed(() => {
      const total = uniqueDateSlots.value.reduce((acc, slot) => add(acc, slot.amount), 0);

      return formatStringToPrice(total);
    });

    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    return {
      // Data
      DOC_EXTENSIONS,
      DD_MM_YYYY,
      HHhMM,
      // Computed
      formattedTotalAmount,
      uniqueDateSlots,
      // Methods
      CompaniDate,
      formatStringToPrice,
      hide,
      input,
      submit,
    };
  },
};
</script>
