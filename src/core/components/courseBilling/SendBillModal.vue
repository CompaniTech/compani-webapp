<template>
  <ni-modal :model-value="modelValue" @update:model-value="input" @hide="hide">
    <template #title>
       Envoyer <span class="text-weight-bold">les factures par email</span>
    </template>
    <ni-banner class="bg-copper-grey-100 q-ma-md" icon="info_outline">
      <template #message>
        <div v-for="bill of billListInfos.selectedBills" :key="bill._id" class="banner-details">
          <span class="text-bold">
            {{ bill.number }} ({{ formatPrice(bill.netInclTaxes) }})
          </span>
          : {{ composeCourseName(bill.course) }}
        </div>
      </template>
    </ni-banner>
    <ni-select caption="Destinataires" :model-value="billListInfos.receivers" :options="receiversOptions"
      multiple in-modal @update:model-value="updateBillListInfos($event, 'receivers')" @add-new-value="addNewValue"
      :error="validations.receivers.$error" :error-message="emailError" required-field />
    <ni-option-group in-modal :model-value="billListInfos.type"
      @update:model-value="updateBillListInfos($event, 'type')" caption="Type d'email" :options="EMAIL_OPTIONS"
      type="radio" :error="validations.type.$error" required-field inline />
    <ni-input caption="Corps de l'email" :model-value="billListInfos.text" required-field in-modal
      @update:model-value="updateBillListInfos($event, 'text')" type="textarea" :error="validations.text.$error" />
    <template #footer>
      <ni-button class="bg-primary full-width modal-btn" label="Envoyer par email"
        icon-right="send" color="white" :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs, ref, computed, watch } from 'vue';
import get from 'lodash/get';
import Modal from '@components/modal/Modal';
import Select from '@components/form/Select';
import Input from '@components/form/Input';
import Button from '@components/Button';
import OptionGroup from '@components/form/OptionGroup';
import Banner from '@components/Banner';
import { REQUIRED_LABEL, EMAIL_OPTIONS, END_COURSE, MIDDLE_COURSE, START_COURSE, VAEI } from '@data/constants';
import { composeCourseName } from '@helpers/courses';
import { formatPrice, formatQuantity } from '@helpers/utils';
import CompaniDate from '@helpers/dates/companiDates';
import { set } from 'lodash';

export default {
  name: 'SendBillModal',
  props: {
    modelValue: { type: Boolean, default: false },
    emailOptions: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    billListInfos: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-modal': Modal,
    'ni-button': Button,
    'ni-select': Select,
    'ni-option-group': OptionGroup,
    'ni-input': Input,
    'ni-banner': Banner,
  },
  emits: ['hide', 'update:model-value', 'update:bill-list-infos', 'submit'],
  setup (props, { emit }) {
    const { emailOptions, validations, billListInfos } = toRefs(props);
    const receiversOptions = ref([]);

    const emailError = computed(() => (
      get(validations.value, 'receivers.required.$response') === false ? REQUIRED_LABEL : 'Email non valide'
    ));

    const severalSelectedBills = computed(() => billListInfos.value.selectedBills.length > 1);

    const billListMonth = computed(() => {
      const firstBillMonthDate = CompaniDate(billListInfos.value.selectedBills[0].billedAt).format('MMMM yyyy');
      const everyBillDateOnSameMonth = billListInfos.value.selectedBills
        .every(bill => CompaniDate(bill.billedAt).format('MMMM yyyy') === firstBillMonthDate);

      return everyBillDateOnSameMonth ? firstBillMonthDate : '';
    });

    const billListNumbers = computed(() => billListInfos.value.selectedBills.map(bill => bill.number).join(', '));

    const billListCourseNames = computed(() => billListInfos.value.selectedBills
      .map(bill => `"${composeCourseName(bill.course)}"`).join(', '));

    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');

    const updateBillListInfos = (event, path) => {
      if (path === 'receivers') {
        let newReceivers = event;
        if (event.some(el => typeof el !== 'string')) {
          newReceivers = event.map(el => el.value || el);
        }
        emit('update:bill-list-infos', set({ ...billListInfos.value }, path, newReceivers));
      } else {
        emit('update:bill-list-infos', set({ ...billListInfos.value }, path, event));
      }
    };

    const addNewValue = (value) => {
      if (!value || receiversOptions.value.map(opt => opt.value).includes(value)) return;

      const newOption = { label: value, value, additionalFilters: [value] };
      receiversOptions.value = [...receiversOptions.value, newOption];

      updateBillListInfos([...billListInfos.value.receivers, newOption], 'receivers');
    };

    const displayBillMonth = month => (
      `${['a', 'e', 'i', 'o', 'u', 'y'].includes(month[0].toLowerCase()) ? 'd’' : 'de '}${billListMonth.value}`);

    watch(
      emailOptions,
      (newOptions) => { if (newOptions.length) receiversOptions.value = [...newOptions]; },
      { immediate: true }
    );

    watch(() => billListInfos.value.type, (newType) => {
      let emailText = '';
      switch (newType) {
        case VAEI:
          emailText = 'Madame, Monsieur,\r\n\r\n'
          + `Vous trouverez en PJ ${severalSelectedBills.value ? 'les factures' : 'la facture'} correspondant à`
          + ' l\'accompagnement VAE Inversée du mois'
          + ` ${billListMonth.value ? displayBillMonth(billListMonth.value) : ' **[A REMPLIR]**'}.\r\n\r\n`
          + 'Sauf contre-indication de votre part, je procéderai au prélèvement de ce montant dans les prochains'
          + ' jours ouvrés. \r\n\r\n'
          + 'Restant à votre disposition,\n'
          + 'Bien à vous,';
          break;
        case START_COURSE:
          emailText = 'Madame, Monsieur,\r\n\r\n'
          + `À la suite du démarrage ${severalSelectedBills.value ? 'des formations' : 'de la formation'}`
          + `${billListCourseNames.value}, je vous informe de la mise à disposition`
          + ` ${severalSelectedBills.value ? 'des factures' : 'de la facture'} ${billListNumbers.value} dans`
          + ' votre espace COMPANI.\r\n\r\n'
          + 'Je vous remercie de procéder au règlement de ce montant dans les meilleurs délais, sur le compte dont'
          + ` le RIB est indiqué dans ${severalSelectedBills.value ? 'les factures' : 'la facture'}.\r\n\r\n`
          + 'Restant à votre disposition,\n'
          + 'Bien à vous,';
          break;
        case MIDDLE_COURSE:
          emailText = 'Madame, Monsieur,\r\n\r\n'
          + `${severalSelectedBills.value ? 'Les formations' : 'La formation'} ${billListCourseNames.value} étant`
          + ` ${formatQuantity('arrivée', severalSelectedBills.value ? 2 : 1, 's', false)} à mi-parcours,`
          + ` je vous informe de la mise à disposition ${severalSelectedBills.value ? 'des factures' : 'de la facture'}`
          + ` ${billListNumbers.value} dans votre espace COMPANI.\r\n\r\n`
          + 'Je vous remercie de procéder au règlement de ce montant dans les meilleurs délais, sur le compte dont'
          + ` le RIB est indiqué dans ${severalSelectedBills.value ? 'les factures' : 'la facture'}.\r\n\r\n`
          + 'Restant à votre disposition,\n'
          + 'Bien à vous,';
          break;
        case END_COURSE:
          emailText = 'Madame, Monsieur,\r\n\r\n'
          + `${severalSelectedBills.value ? 'Les formations' : 'La formation'} ${billListCourseNames.value} étant`
          + ` ${formatQuantity('arrivée', severalSelectedBills.value ? 2 : 1, 's', false)} à`
          + ` ${severalSelectedBills.value ? 'leur' : 'son'} terme, je vous informe de la mise à disposition`
          + ` ${severalSelectedBills.value ? 'des factures' : 'de la facture'} ${billListNumbers.value} dans votre`
          + ' espace COMPANI.\r\n\r\n'
          + 'Je vous remercie de procéder au règlement de ce montant dans les meilleurs délais, sur le compte dont'
          + ` le RIB est indiqué dans ${severalSelectedBills.value ? 'les factures' : 'la facture'}.\r\n\r\n`
          + 'Restant à votre disposition,\n'
          + 'Bien à vous,';
          break;
        default:
          emailText = '';
      }

      billListInfos.value.text = emailText;
    });

    return {
      // Data
      receiversOptions,
      EMAIL_OPTIONS,
      // Computed
      emailError,
      // Methods
      hide,
      input,
      submit,
      updateBillListInfos,
      addNewValue,
      composeCourseName,
      formatPrice,
    };
  },
};
</script>
<style lang="sass" scoped>
.details
  font-size: 14px
  color: $copper-grey-500
.banner-details
  font-size: 12px
:deep(.q-option-group)
  .q-radio
    .q-radio__label
      font-size: 12px
</style>
