<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      Editer un <span class="text-weight-bold">créneau</span>
    </template>
    <div class="modal-icon">
      <ni-button v-if="canUpdateConcernedTrainees && editedCourseSlot.hasDates" class="bg-copper-grey-100 q-mr-md"
        color="copper-grey-800" label="Éditer les apprenants concernés" @click="openConcernedTraineesModal" />
      <ni-button v-if="canCreateSlot && !isPlannedSlot" icon="delete"
        @click="validateDeletion(editedCourseSlot._id)" :disable="isOnlySlot" />
      <ni-button class="bg-copper-grey-100" color="copper-grey-800" v-if="isPlannedSlot" label="Supprimer la date"
        @click="validateDatesDeletion(editedCourseSlot)" />
    </div>
    <ni-btn-toggle in-modal :model-value="selectedDuration" :options="durationOptions"
      @update:model-value="updateDuration" />
      <div class="toggle-container">
        <ni-btn-toggle in-modal :model-value="selectedRange" :options="rangeOptions"
          @update:model-value="updateRange" />
        <span :class="{ verbatim: !editedCourseSlot.wholeDay }" class="text-12 text-italic">
          Un nouveau créneau le {{ CompaniDate(editedCourseSlot.dates.startDate).format(DD_MM_YYYY) }} de 13h30 à 17h00
          sera créé
        </span>
      </div>
    <ni-datetime-range caption="Dates et heures" :model-value="editedCourseSlot.dates" disable-end-date
      :error="validations.dates.$error" @blur="validations.dates.$touch" @update:model-value="update($event, 'dates')"
      required-field :shifted-duration="selectedDuration" />
    <ni-search-address v-if="getType(editedCourseSlot.step) === ON_SITE" :model-value="editedCourseSlot.address"
      error-message="Adresse non valide" in-modal last @blur="validations.address.$touch"
      :error="validations.address.$error" @update:model-value="update($event, 'address')" />
    <ni-input v-if="getType(editedCourseSlot.step) === REMOTE" :model-value="editedCourseSlot.meetingLink"
      @update:model-value="update($event, 'meetingLink')" caption="Lien vers la visio" in-modal
      :error-message="linkErrorMessage" :error="validations.meetingLink.$error" />
    <div v-if="editedCourseSlot.trainees" class="text-italic text-12 q-mb-md">
      {{ formatQuantity('Apprenant concerné', editedCourseSlot.trainees.length, 's', false) }} par le créneau :
      {{ traineeOptions.filter(t => editedCourseSlot.trainees.includes(t.value)).map(t => t.label).join(', ') }}
    </div>
    <ni-select v-if="editedCourseSlot.trainers || canUpdateSlotTrainers" caption="Intervenants concernés"
      :options="allTrainerOptions" :disable="!canUpdateSlotTrainers || trainerOptions.length === 1"
      v-model="editedCourseSlot.trainers" multiple :error="validations.trainers?.$error" required-field />
    <template #footer>
      <ni-button class="bg-primary full-width modal-btn" label="Editer un créneau" icon-right="add" color="white"
        :loading="loading" @click="submit" />
    </template>
  </ni-modal>

  <trainees-update-modal v-model="concernedTraineesModal" @hide="resetConcernedTraineesModal"
    v-model:trainees="concernedTrainees" :trainee-options="traineeOptions" :loading="concernedTraineesLoading"
    @submit="updateConcernedTrainees" title="les apprenants concernés"
    message="les personnes sélectionnées participent au créneau" :validations="traineesValidations" />
</template>

<script>
import { toRefs, ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import get from 'lodash/get';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import CourseSlots from '@api/CourseSlots';
import Modal from '@components/modal/Modal';
import Button from '@components/Button';
import Input from '@components/form/Input';
import DateTimeRange from '@components/form/DatetimeRange';
import SearchAddress from '@components/form/SearchAddress';
import Select from '@components/form/Select';
import ButtonToggle from '@components/ButtonToggle';
import TraineesUpdateModal from '@components/courses/TraineesUpdateModal';
import { NotifyPositive, NotifyNegative, NotifyWarning } from '@components/popup/notify';
import { ON_SITE, REMOTE, DD_MM_YYYY, MINUTE, HH_MM, MORNING, AFTERNOON, WHOLE_DAY } from '@data/constants';
import CompaniDate from '@helpers/dates/companiDates';
import { formatQuantity } from '@helpers/utils';
import { formatIntervalHourly } from '@helpers/dates/utils';

export default {
  name: 'SlotEditionModal',
  props: {
    modelValue: { type: Boolean, default: false },
    editedCourseSlot: { type: Object, default: () => ({}) },
    stepTypes: { type: Array, default: () => [] },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    isOnlySlot: { type: Boolean, default: false },
    isPlannedSlot: { type: Boolean, default: false },
    canCreateSlot: { type: Boolean, default: false },
    canUpdateConcernedTrainees: { type: Boolean, default: false },
    traineeOptions: { type: Array, default: () => [] },
    trainerOptions: { type: Array, default: () => [] },
    canUpdateSlotTrainers: { type: Boolean, default: false },
  },
  components: {
    'ni-button': Button,
    'ni-datetime-range': DateTimeRange,
    'ni-search-address': SearchAddress,
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-btn-toggle': ButtonToggle,
    'trainees-update-modal': TraineesUpdateModal,
    'ni-select': Select,
  },
  emits: ['hide', 'update:model-value', 'submit', 'delete', 'update', 'unplan-slot'],
  setup (props, { emit }) {
    const { stepTypes, editedCourseSlot, traineeOptions, trainerOptions } = toRefs(props);
    const $q = useQuasar();
    const selectedRange = ref('');
    const rangeOptions = [
      { label: 'matin', value: MORNING },
      { label: 'après-midi', value: AFTERNOON },
      { label: 'journée entière', value: WHOLE_DAY },
    ];

    const linkErrorMessage = 'Le lien doit commencer par http:// ou https://';
    const selectedDuration = ref(editedCourseSlot.value.dates
      ? CompaniDate(editedCourseSlot.value.dates.endHour, HH_MM)
        .diff(CompaniDate(editedCourseSlot.value.dates.startHour, HH_MM), MINUTE)
      : 'PT0M');
    const concernedTraineesModal = ref(false);
    const concernedTrainees = ref([]);
    const concernedTraineesLoading = ref(false);
    const shouldRefresh = ref(false);

    const durationOptions = computed(() => ([
      { label: '0H30', value: 'PT30M' },
      { label: '1H', value: 'PT60M' },
      { label: '1H30', value: 'PT90M' },
      { label: '2H', value: 'PT120M' },
      { label: '2H30', value: 'PT150M' },
      { label: '3H', value: 'PT180M' },
      { label: '3H30', value: 'PT210M' },
    ]));

    const rangeData = computed(() => (
      {
        morning: {
          startDate: CompaniDate(editedCourseSlot.value.dates.startDate)
            .set({ hour: 9, minute: 0, seconds: 0, milliseconds: 0 }).toISO(),
          endDate: CompaniDate(editedCourseSlot.value.dates.endDate)
            .set({ hour: 12, minute: 30, seconds: 0, milliseconds: 0 }).toISO(),
          startHour: '09:00',
          endHour: '12:30',
        },
        afternoon: {
          startDate: CompaniDate(editedCourseSlot.value.dates.startDate)
            .set({ hour: 13, minute: 30, seconds: 0, milliseconds: 0 }).toISO(),
          endDate: CompaniDate(editedCourseSlot.value.dates.endDate)
            .set({ hour: 17, minute: 0, seconds: 0, milliseconds: 0 }).toISO(),
          startHour: '13:30',
          endHour: '17:00',
        },
      }
    ));

    const allTrainerOptions = computed(() => {
      const tOptions = [...trainerOptions.value];

      (editedCourseSlot.value.trainers || []).forEach((tId) => {
        const isTrainerInOptions = tOptions.some(opt => opt.value === tId);

        if (!isTrainerInOptions) tOptions.push({ label: 'Intervenant·e supprimé·e', value: tId });
      });

      return tOptions;
    });

    watch(() => selectedDuration.value, (newDuration) => {
      if (get(editedCourseSlot.value, 'dates.startHour') && newDuration) {
        editedCourseSlot.value.dates.endHour = CompaniDate(editedCourseSlot.value.dates.startHour, HH_MM)
          .add(newDuration).format(HH_MM);
      }
    });

    watch(() => [get(editedCourseSlot.value, 'dates.startHour'), get(editedCourseSlot.value, 'dates.endHour')], () => {
      const startHour = get(editedCourseSlot.value, 'dates.startHour');
      const endHour = get(editedCourseSlot.value, 'dates.endHour');
      if (startHour && endHour) {
        selectedDuration.value = CompaniDate(endHour, HH_MM).diff(CompaniDate(startHour, HH_MM), MINUTE);
        if (CompaniDate(startHour).isSame(rangeData.value.morning.startHour) &&
        CompaniDate(endHour).isSame(rangeData.value.morning.endHour)) {
          if (selectedRange.value !== WHOLE_DAY) selectedRange.value = MORNING;
        } else if (startHour && endHour && CompaniDate(startHour).isSame(rangeData.value.afternoon.startHour) &&
        CompaniDate(endHour).isSame(rangeData.value.afternoon.endHour)) {
          selectedRange.value = AFTERNOON;
        } else {
          selectedRange.value = '';
          update(false, 'wholeDay');
        }
      }
    });

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

    const hide = () => {
      emit('hide', shouldRefresh.value);
      shouldRefresh.value = false;
      selectedRange.value = '';
    };

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    const deleteSlotId = slotId => emit('delete', slotId);

    const update = (value, path) => emit('update', { path, value });

    const getType = step => (step ? stepTypes.value.find(item => item.value === step).type : '');

    const unplanSlot = slotId => emit('unplan-slot', slotId);

    const updateDuration = (value) => { selectedDuration.value = value; };

    const openConcernedTraineesModal = () => {
      concernedTrainees.value = editedCourseSlot.value.trainees || traineeOptions.value.map(t => t.value);
      concernedTraineesModal.value = true;
    };

    const resetConcernedTraineesModal = () => { concernedTrainees.value = []; };

    const rules = computed(() => ({ required }));
    const traineesValidations = useVuelidate(rules, concernedTrainees);

    const updateConcernedTrainees = async () => {
      try {
        traineesValidations.value.$touch();
        if (traineesValidations.value.$error) return NotifyWarning('Champ(s) invalide(s)');

        concernedTraineesLoading.value = true;
        const tempValue = concernedTrainees.value.length !== traineeOptions.value.length ? concernedTrainees.value : [];
        const dbTrainees = editedCourseSlot.value.trainees || [];
        const isSameList = dbTrainees.length === tempValue.length && dbTrainees.every(item => tempValue.includes(item));
        if (!isSameList) {
          await CourseSlots.update(editedCourseSlot.value._id, { trainees: concernedTrainees.value });
          await update(tempValue, 'trainees');
          shouldRefresh.value = true;
          NotifyPositive('Apprenants concernés modifiés.');
        }
        concernedTraineesModal.value = false;
      } catch (e) {
        console.error(e);
        if (e.status === 403 && e.data.message) NotifyNegative(e.data.message);
        else NotifyNegative('Erreur lors de la modification des apprenants concernés.');
      } finally {
        concernedTraineesLoading.value = false;
      }
    };

    const updateRange = (value) => {
      selectedRange.value = value;
      const isWholeDay = value === WHOLE_DAY;
      editedCourseSlot.value.dates = isWholeDay ? rangeData.value.morning : rangeData.value[value];
      update(isWholeDay, 'wholeDay');
    };

    return {
      // Data
      linkErrorMessage,
      ON_SITE,
      REMOTE,
      DD_MM_YYYY,
      rangeOptions,
      selectedDuration,
      selectedRange,
      concernedTraineesModal,
      concernedTrainees,
      concernedTraineesLoading,
      // Computed
      durationOptions,
      traineesValidations,
      allTrainerOptions,
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
      updateDuration,
      openConcernedTraineesModal,
      resetConcernedTraineesModal,
      updateConcernedTrainees,
      updateRange,
      formatQuantity,
      CompaniDate,
    };
  },
};
</script>

<style lang="sass" scoped>
  .modal-icon
    display: flex
    justify-content: flex-end
    margin-bottom: 16px
  .toggle-container
    margin-bottom: 10px
    .verbatim
      visibility: hidden
    .q-btn-toggle
      margin-bottom: 0px
</style>
