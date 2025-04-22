<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Editer un <span class="text-weight-bold">créneau</span>
    </template>
    <div class="modal-icon">
      <ni-button v-if="isRofOrVendorAdmin && isVendorInterface && !isPlannedSlot" icon="delete"
        @click="validateDeletion(editedCourseSlot._id)" :disable="isOnlySlot" />
      <ni-button class="bg-copper-grey-100" color="copper-grey-800" v-if="isPlannedSlot" label="Supprimer la date"
      @click="validateDatesDeletion(editedCourseSlot)" />
    </div>
    <ni-datetime-range caption="Dates et heures" :model-value="editedCourseSlot.dates" disable-end-date
      :error="validations.dates.$error" @blur="validations.dates.$touch" @update:model-value="update($event, 'dates')"
      required-field />
    <ni-search-address v-if="getType(editedCourseSlot.step) === ON_SITE" :model-value="editedCourseSlot.address"
      error-message="Adresse non valide" in-modal last @blur="validations.address.$touch"
      :error="validations.address.$error" @update:model-value="update($event, 'address')" />
    <ni-input v-if="getType(editedCourseSlot.step) === REMOTE" :model-value="editedCourseSlot.meetingLink"
      @update:model-value="update($event, 'meetingLink')" caption="Lien vers la visio" in-modal
      :error-message="linkErrorMessage" :error="validations.meetingLink.$error" />
    <template #footer>
      <ni-button class="bg-primary full-width modal-btn" label="Editer un créneau" icon-right="add" color="white"
        :loading="loading" @click="submit" />
    </template>
  </ni-modal>
</template>

<script>
import { toRefs, ref } from 'vue';
import Modal from '@components/modal/Modal';
import Button from '@components/Button';
import Input from '@components/form/Input';
import DateTimeRange from '@components/form/DatetimeRange';
import SearchAddress from '@components/form/SearchAddress';
import { NotifyPositive } from '@components/popup/notify';
import { ON_SITE, REMOTE, DD_MM_YYYY } from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';
import { formatIntervalHourly } from '@helpers/dates/utils';
import { useQuasar } from 'quasar';

export default {
  name: 'SlotEditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    editedCourseSlot: { type: Object, default: () => ({}) },
    stepTypes: { type: Array, default: () => [] },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    isRofOrVendorAdmin: { type: Boolean, default: false },
    isVendorInterface: { type: Boolean, default: false },
    isOnlySlot: { type: Boolean, default: false },
    isPlannedSlot: { type: Boolean, default: false },
  },
  components: {
    'ni-button': Button,
    'ni-datetime-range': DateTimeRange,
    'ni-search-address': SearchAddress,
    'ni-modal': Modal,
    'ni-input': Input,
  },
  emits: ['hide', 'update:model-value', 'submit', 'delete', 'update', 'unplan-slot'],
  setup (props, { emit }) {
    const { stepTypes } = toRefs(props);
    const $q = useQuasar();

    const linkErrorMessage = ref('Le lien doit commencer par http:// ou https://');

    const validateDatesDeletion = (slot) => {
      $q.dialog({
        title: 'Supprimer une date',
        message: `Êtes-vous sûr(e) de vouloir supprimer la date du 
          ${CompaniDate(slot.dates.startDate).format(DD_MM_YYYY)} (${formatIntervalHourly(slot.dates)})&nbsp;?<br />
          <br />Le créneau repassera en "à planifier".`,
        html: true,
        ok: 'Oui',
        cancel: 'Non',
      }).onOk(() => unplanSlot(slot._id))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

    const validateDeletion = (slotId) => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir supprimer ce créneau&nbsp;?',
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => deleteSlotId(slotId))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    const deleteSlotId = slotId => emit('delete', slotId);

    const update = (value, path) => emit('update', { path, value });

    const getType = step => (step ? stepTypes.value.find(item => item.value === step).type : '');

    const unplanSlot = slotId => emit('unplan-slot', slotId);

    return {
      // Data
      linkErrorMessage,
      ON_SITE,
      REMOTE,
      // Methods
      validateDatesDeletion,
      validateDeletion,
      hide,
      input,
      submit,
      deleteSlotId,
      update,
      getType,
      unplanSlot,
    };
  },
};
</script>

<style lang="sass" scoped>
  .modal-icon
    display: flex
    justify-content: flex-end
</style>
