<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Éditer les <span class="text-weight-bold">factures</span>
    </template>
    <div class="course-bill-infos">
      <div>{{ courseInfos.courseName }} </div>
      <ni-banner v-if="severalPayers" class="bg-copper-grey-100 q-mt-sm" icon="warning">
        <template #message>Les payeurs des factures sélectionnées sont différents.</template>
      </ni-banner>
      <div v-for="companies of courseInfos.companiesName" :key="companies">
        <ni-banner class="bg-copper-grey-100 q-mt-sm" icon="info_outline">
          <template #message>Facture pour le compte de {{ companies }}</template>
        </ni-banner>
      </div>
    </div>
    <div class="column">
      <company-select v-if="has(billsToUpdate, 'payer')" in-modal caption="Payeur" :company-options="payerOptions"
        :company="billsToUpdate.payer" required-field @update:model-value="update($event, 'payer')"
        :error="validations.payer.$error" @blur="validations.payer.$touch" />
      <ni-secondary-button v-else label="Éditer le payeur" icon="edit" @click="update('', 'payer')"
        class="full-width modal-btn q-my-sm" />
      <div v-if="isSingleCourse">
        <ni-input v-if="has(billsToUpdate, 'mainFee.price')" in-modal caption="Prix" type="number" suffix="€"
          :model-value="billsToUpdate.mainFee.price" @update:model-value="update($event, 'mainFee.price')"
          :error="get(validations, 'mainFee.price.$error', false)" @blur="get(validations, 'mainFee.price.$touch')"
          required-field />
        <ni-secondary-button v-else label="Éditer le prix" icon="edit" class="full-width modal-btn q-my-sm"
          @click="update('', 'mainFee.price')" />
        <ni-banner v-if="severalBillsToEdit && maturityDateDiffMessage" class="bg-copper-grey-100 q-mt-sm"
          icon="info_outline">
          <template #message>{{ maturityDateDiffMessage }}</template>
        </ni-banner>
        <ni-date-input v-if="has(billsToUpdate, 'maturityDate')" in-modal caption="Date d'échéance"
          :model-value="billsToUpdate.maturityDate" @update:model-value="update($event, 'maturityDate')"
          required-field />
      </div>
      <ni-input v-if="has(billsToUpdate, 'mainFee.description')" in-modal caption="Description" type="textarea"
        :model-value="billsToUpdate.mainFee.description" @update:model-value="update($event, 'mainFee.description')"
        :disable="isSingleCourse && severalBillsToEdit" />
      <ni-secondary-button v-else-if="!isSingleCourse" label="Éditer la description" icon="edit"
        class="full-width modal-btn q-my-sm" @click="update('', 'mainFee.description')" />
    </div>
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Éditer la facture" icon-right="add" color="white"
        :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs, computed } from 'vue';
import set from 'lodash/set';
import get from 'lodash/get';
import has from 'lodash/has';
import Modal from '@components/modal/Modal';
import Button from '@components/Button';
import Input from '@components/form/Input';
import Banner from '@components/Banner';
import CompanySelect from '@components/form/CompanySelect';
import DateInput from '@components/form/DateInput';
import { SINGLE } from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';
import CompaniDuration from '@helpers/dates/companiDurations';
import { formatQuantity } from '@helpers/utils';
import SecondaryButton from '../../../../core/components/SecondaryButton.vue';

export default {
  name: 'MultipleCourseBillEditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    billsToUpdate: { type: Object, default: () => ({}) },
    payerOptions: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    validations: { type: Object, default: () => ({}) },
    courseInfos: { type: Object, default: () => ({}) },
    severalPayers: { type: Boolean, default: false },
  },
  components: {
    'ni-modal': Modal,
    'ni-button': Button,
    'ni-secondary-button': SecondaryButton,
    'ni-banner': Banner,
    'company-select': CompanySelect,
    'ni-date-input': DateInput,
    'ni-input': Input,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:bills-to-update'],
  setup (props, { emit }) {
    const { billsToUpdate, courseInfos } = toRefs(props);

    const maturityDateDiff = computed(() => {
      const { firstMaturityDate } = billsToUpdate.value;
      const newMaturityDate = billsToUpdate.value.maturityDate;

      if (firstMaturityDate) {
        const monthDuration = CompaniDate(newMaturityDate).diff(firstMaturityDate, 'months');
        const month = Math.trunc(CompaniDuration(monthDuration).asMonths());
        const intermediate = CompaniDate(firstMaturityDate).add(`P${month}M`);
        const dayDuration = CompaniDate(newMaturityDate).diff(intermediate, 'days');

        return { months: month, days: CompaniDuration(dayDuration).asDays() };
      }

      return { months: 0, days: 0 };
    });

    const maturityDateDiffMessage = computed(() => {
      const { months, days } = maturityDateDiff.value;
      if (!months && !days) return '';

      const duration = [];
      if (months) duration.push(`${months} mois`);
      if (days) duration.push(`${days} ${formatQuantity('jour', Math.abs(days), 's', false)}`);

      return `La date d'échéance de toutes les factures sélectionnées va être décalée de ${duration.join(' et ')}, et
        la description sera mise à jour en fonction du mois et de l’année correspondants à chaque facture.`;
    });

    const severalBillsToEdit = computed(() => billsToUpdate.value._ids.length > 1);

    const isSingleCourse = computed(() => courseInfos.value.courseType === SINGLE);

    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    const update = (value, path) => {
      if (path === 'maturityDate') {
        const description = 'Facture liée à des frais pédagogiques \r\n'
          + 'Contrat de professionnalisation \r\n'
          + `ACCOMPAGNEMENT ${CompaniDate(value).format('LLLL yyyy')} \r\n`
          + `Nom de l'apprenant·e: ${courseInfos.value.traineeName} \r\n`
          + `Nom du / des intervenants: ${courseInfos.value.trainersName}`;
        emit(
          'update:bills-to-update',
          set({ ...billsToUpdate.value, mainFee: { ...billsToUpdate.value.mainFee, description } }, path, value)
        );
      } else emit('update:bills-to-update', set({ ...billsToUpdate.value }, path, value));
    };

    return {
      // Data
      SINGLE,
      // Computed
      maturityDateDiffMessage,
      severalBillsToEdit,
      isSingleCourse,
      // Methods
      hide,
      input,
      submit,
      update,
      has,
      get,
    };
  },
};
</script>
