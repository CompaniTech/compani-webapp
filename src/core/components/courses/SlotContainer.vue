<template>
  <div>
    <div class="q-mb-xl">
      <q-item class="slot-section-title">
        <q-item-section side>
          <q-icon color="copper-grey-700" size="xl" :name="formatSlotTitle.icon" flat dense />
        </q-item-section>
        <q-item-section>
          <div class="text-weight-bold">{{ formatSlotTitle.title }}</div>
          <div class="slot-section-title-subtitle">{{ formatSlotTitle.subtitle }}</div>
        </q-item-section>
      </q-item>
      <div v-if="!course.slots.length && isVendorInterface && isRofOrVendorAdmin" class="row gutter-profile">
        <ni-date-input class="col-xs-12 col-md-6" caption="Date de démarrage souhaitée"
          :model-value="estimatedStartDate" @update:model-value="inputTmpEstimatedStartDate($event)"
          @blur="updateEstimatedStartDate" :disabled="course.archivedAt" />
      </div>
      <q-card class="q-pa-md">
        <q-item-section @click="showStepDetails" class="slots cursor-pointer bg-copper-grey-50 copper-grey-700">
          {{ showStepList ? 'Masquer' : 'Afficher' }} la liste des étapes de la formation
          <q-icon size="xs" :name="showStepList ? 'expand_less' : 'expand_more'" color="copper-grey-700" />
        </q-item-section>
        <div v-if="showStepList" class="bg-copper-grey-50 q-px-md">
          <q-item-section v-for="(step, index) in stepList" :key="step.key" class="q-pb-sm flex">
            <div :class="getStepClass(step)">
              <div v-if="isStepToPlan(step)" class="to-plan-header">Créneaux à programmer</div>
              <div class="row q-pa-md">
                <div class="index">{{ index + 1 }}</div>
                <div class="q-mx-md">
                  <div>{{ step.name }}</div>
                  <div class="type text-capitalize">{{ step.typeLabel }}</div>
                </div>
              </div>
              <div v-if="!isElearningStep(step)" class="slots-container">
                <div v-for="day in Object.entries(omit(courseSlotsByStepAndDate[step.key], TO_PLAN_KEY))"
                  :key="day" class="row q-ml-xl q-my-sm">
                  <div class="text-weight-bold q-mr-md">{{ day[0] }}</div>
                  <div>
                    <div v-for="slot in day[1]" :key="slot._id" @click="openEditionModal(slot)"
                      :class="getSlotClass(step)">
                      <div class="q-mr-md">{{ formatSlotSchedule(slot) }}</div>
                      <div v-if="step.type === ON_SITE" class="q-mr-md">{{ getSlotAddress(slot) }}</div>
                      <div v-else class="q-mr-md ellipsis link-container">
                        <a class="link" :href="slot.meetingLink" target="_blank" @click="$event.stopPropagation()">
                          {{ slot.meetingLink }}
                        </a>
                        {{ !slot.meetingLink ? 'Lien vers la visio non renseigné' : '' }}
                      </div>
                      <q-icon v-if="canEdit" name="edit" size="12px" color="copper-grey-500" />
                    </div>
                  </div>
                </div>
                <div v-if="isStepToPlan(step) && !!get(courseSlotsByStepAndDate[step.key], TO_PLAN_KEY)"
                  class="q-mx-md">
                  <div @click="openEditionModal(get(courseSlotsByStepAndDate[step.key], TO_PLAN_KEY)[0])"
                    :class="['to-plan-slot q-mb-sm', canEdit && 'to-plan-slot-container cursor-pointer hover-orange']">
                    <div class="clickable-name text-orange-500 q-mr-md">créneau à planifier</div>
                    <q-icon v-if="canEdit" name="edit" size="12px" color="copper-grey-500" />
                  </div>
                  <div v-if="get(courseSlotsByStepAndDate[step.key], TO_PLAN_KEY).length - 1"
                    class="q-mx-lg bg-peach-100">
                    <q-item-section @click="() => showSlotToPlanDetails(step.key)" class="slots cursor-pointer">
                      <span class="text-orange-500">
                        {{ showSlotToPlan[step.key] ? 'Masquer' : 'Afficher' }} les autres créneaux à planifier
                        ({{ get(courseSlotsByStepAndDate[step.key], TO_PLAN_KEY).length - 1 }})
                      </span>
                      <q-icon :name="showSlotToPlan[step.key] ? 'expand_less' : 'expand_more'" size="20px"
                        class="q-ml-sm" />
                    </q-item-section>
                    <div v-if="showSlotToPlan[step.key]" class="to-plan-slot-container q-pb-sm">
                      <div v-for="slot in tail(get(courseSlotsByStepAndDate[step.key], TO_PLAN_KEY))" :key="slot._id"
                        :class="['to-plan-slot', canEdit && 'cursor-pointer hover-orange']"
                        @click="openEditionModal(slot)">
                        <div class="clickable-name text-orange-500 q-mr-md">créneau à planifier</div>
                        <q-icon v-if="canEdit" name="edit" size="12px" color="copper-grey-500" />
                      </div>
                    </div>
                  </div>
                </div>
                <div class="q-mt-sm" v-if="canEdit && isRofOrVendorAdmin && isVendorInterface" align="right">
                  <ni-button label="Ajouter des créneaux" color="primary" icon="add"
                    @click="openMultipleSlotCreationModal(step.key)" :disable="slotCreationLoading" />
                </div>
              </div>
            </div>
          </q-item-section>
        </div>
      </q-card>
    </div>

    <slot-edition-modal v-model="editionModal" :edited-course-slot="editedCourseSlot" :step-types="stepTypes"
      :validations="v$.editedCourseSlot" @hide="resetEditionModal" :loading="modalLoading" @delete="deleteCourseSlot"
      @submit="updateCourseSlot" @update="setCourseSlot" :is-rof-or-vendor-admin="isRofOrVendorAdmin"
      :is-vendor-interface="isVendorInterface" :is-only-slot="isOnlySlot" :is-planned-slot="isPlannedSlot"
      @unplan-slot="unplanSlot" />

    <multiple-slot-creation-modal v-model="multipleSlotCreationModal" v-model:slots-to-add="slotsToAdd"
      @hide="resetCreationModal" @submit="createCourseSlots" :validations="v$.slotsToAdd"
      :loading="slotCreationLoading" />
  </div>
</template>
<script>
import { useStore } from 'vuex';
import { computed, ref, toRefs } from 'vue';
import get from 'lodash/get';
import has from 'lodash/has';
import set from 'lodash/set';
import pick from 'lodash/pick';
import omit from 'lodash/omit';
import tail from 'lodash/tail';
import groupBy from 'lodash/groupBy';
import useVuelidate from '@vuelidate/core';
import { required, requiredIf } from '@vuelidate/validators';
import CourseSlots from '@api/CourseSlots';
import Button from '@components/Button';
import SlotEditionModal from '@components/courses/SlotEditionModal';
import MultipleSlotCreationModal from '@components/courses/MultipleSlotCreationModal';
import DateInput from '@components/form/DateInput';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import { useCourses } from '@composables/courses';
import { useValidations } from '@composables/validations';
import {
  E_LEARNING,
  ON_SITE,
  REMOTE,
  DAY_MONTH_YEAR,
  HH_MM,
  DD_MM_YYYY,
  SHORT_DURATION_H_MM,
  SINGLE
  } from '@data/constants';
import { formatQuantity } from '@helpers/utils';
import { getStepTypeLabel, formatSlotSchedule } from '@helpers/courses';
import { ascendingSort, getISOTotalDuration } from '@helpers/dates/utils';
import {
  frAddress,
  minDate,
  maxDate,
  urlAddress,
  validHour,
  strictMinHour,
  strictPositiveNumber,
  integerNumber,
} from '@helpers/vuelidateCustomVal';
import CompaniDate from '@helpers/dates/companiDates';
import CompaniDuration from '@helpers/dates/companiDurations';

export default {
  name: 'SlotContainer',
  props: {
    canEdit: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    isRofOrVendorAdmin: { type: Boolean, default: false },
    estimatedStartDate: { type: String, default: '' },
  },
  components: {
    'slot-edition-modal': SlotEditionModal,
    'ni-button': Button,
    'ni-date-input': DateInput,
    'multiple-slot-creation-modal': MultipleSlotCreationModal,
  },
  emits: ['refresh', 'update', 'update:estimatedStartDate'],
  setup (props, { emit }) {
    const { canEdit } = toRefs(props);

    const $store = useStore();

    const slotCreationLoading = ref(false);
    const modalLoading = ref(false);
    const editedCourseSlot = ref({});
    const editionModal = ref(false);
    const TO_PLAN_KEY = 'toPlan';
    const isOnlySlot = ref(false);
    const isPlannedSlot = ref(false);
    const showStepList = ref(true);
    const showSlotToPlan = ref([]);
    const multipleSlotCreationModal = ref(false);

    const { isVendorInterface } = useCourses();
    const { waitForFormValidation } = useValidations();

    const course = computed(() => $store.state.course.course);
    const slotsToAdd = ref({ course: course.value._id, step: '', quantity: 1 });

    const slotsDurationTitle = computed(() => {
      if (!course.value || !course.value.slots) return '0h';

      const totalISO = getISOTotalDuration(course.value.slots);

      return CompaniDuration(totalISO).format(SHORT_DURATION_H_MM);
    });

    const formatSlotTitle = computed(() => {
      const slotsToPlanLength = course.value.slotsToPlan.length;
      const slotDatesWithDuplicate = course.value.slots
        .filter(date => !!date)
        .map(slot => CompaniDate(slot.startDate).startOf('day'))
        .sort(ascendingSort);
      const slotDates = [...new Set(slotDatesWithDuplicate)];

      const totalDate = slotsToPlanLength + slotDates.length;
      if (!totalDate) return { title: 'Pas de date prévue', subtitle: '', icon: 'mdi-calendar-remove' };

      const slotsToPlanTitle = slotsToPlanLength ? ` dont ${slotsToPlanLength} à planifier, ` : '';

      let subtitle = '';
      if (slotDates.length) {
        const firstSlot = CompaniDate(slotDates[0]).format(DAY_MONTH_YEAR);
        const lastSlot = CompaniDate(slotDates[slotDates.length - 1]).format(DAY_MONTH_YEAR);
        subtitle = `du ${firstSlot} au ${lastSlot}`;
      }

      return {
        title: `${formatQuantity('date', totalDate)}, ${slotsToPlanTitle}${slotsDurationTitle.value}`,
        subtitle,
        icon: 'mdi-calendar-range',
      };
    });

    const stepTypes = computed(() => course.value.subProgram.steps.map(step => ({ value: step._id, type: step.type })));

    const courseSlotsByStepAndDate = computed(() => {
      if (!course.value.slots.length && !course.value.slotsToPlan.length) return {};

      const formattedSlots = [...course.value.slots, ...course.value.slotsToPlan];
      const slotsByStep = groupBy(formattedSlots, 'step');
      const slotsByStepAndDateList = Object.keys(slotsByStep)
        .map(key => groupBy(
          slotsByStep[key],
          s => (s.startDate ? CompaniDate(s.startDate).format(DD_MM_YYYY) : TO_PLAN_KEY)
        ));

      return Object.fromEntries(Object.keys(slotsByStep).map((key, index) => [key, slotsByStepAndDateList[index]]));
    });

    const stepList = computed(() => get(course.value, 'subProgram.steps').map(step => ({
      key: step._id,
      name: step.name,
      type: step.type,
      typeLabel: getStepTypeLabel(step.type),
    })));

    const rules = computed(() => ({
      editedCourseSlot: {
        address: {
          zipCode: { required: requiredIf(get(editedCourseSlot.value, 'address.fullAddress')) },
          street: { required: requiredIf(get(editedCourseSlot.value, 'address.fullAddress')) },
          city: { required: requiredIf(get(editedCourseSlot.value, 'address.fullAddress')) },
          fullAddress: { frAddress },
        },
        meetingLink: { urlAddress },
        dates: {
          startDate: { required },
          startHour: { required, validHour },
          endHour: {
            required,
            validHour,
            strictMinHour: strictMinHour(get(editedCourseSlot.value, 'dates.startHour')),
          },
          endDate: {
            required,
            ...(!!get(editedCourseSlot.value, 'dates.startDate') && {
              maxDate: maxDate(CompaniDate(editedCourseSlot.value.dates.startDate).endOf('day').toISO()),
              minDate: minDate(editedCourseSlot.value.dates.startDate),
            }),
          },
        },
      },
      slotsToAdd: { quantity: { required, strictPositiveNumber, integerNumber } },
    }));

    const v$ = useVuelidate(rules, { editedCourseSlot, slotsToAdd });

    const getSlotAddress = slot => get(slot, 'address.fullAddress') || 'Adresse non renseignée';

    const defaultDate = (slot) => {
        if (course.value.type === SINGLE && !has(slot, 'startDate')) {
          return {
            startDate: CompaniDate().set({ hour: 14, minute: 0, seconds: 0, milliseconds: 0 }).toISO(),
            endDate: CompaniDate().set({ hour: 15, minute: 0, seconds: 0, milliseconds: 0 }).toISO(),
          };
        }
        if (has(slot, 'startDate')) {
          return pick(slot, ['startDate', 'endDate']);
        }

        return {
          startDate: CompaniDate().set({ hour: 9, minute: 0, seconds: 0, milliseconds: 0 }).toISO(),
          endDate: CompaniDate().set({ hour: 12, minute: 30, seconds: 0, milliseconds: 0 }).toISO(),
        };
      };

    const openEditionModal = (slot) => {
      if (!canEdit.value) return;
      if (course.value.archivedAt) {
        return NotifyWarning('Vous ne pouvez pas éditer un créneau d\'une formation archivée.');
      }

      const dates = defaultDate(slot);

      editedCourseSlot.value = {
        _id: slot._id,
        dates: {
          ...dates,
          startHour: CompaniDate(dates.startDate).format(HH_MM),
          endHour: CompaniDate(dates.endDate).format(HH_MM),
        },
        address: {},
        meetingLink: get(slot, 'meetingLink') || '',
        step: slot.step,
      };

      if (slot.address) editedCourseSlot.value.address = { ...slot.address };
      isOnlySlot.value = setIsOnlySlot(slot.step);
      isPlannedSlot.value = has(slot, 'startDate');
      editionModal.value = true;
    };

    const resetEditionModal = () => {
      editedCourseSlot.value = {};
      v$.value.editedCourseSlot.$reset();
      isOnlySlot.value = false;
      isPlannedSlot.value = false;
    };

    const formatEditionPayload = (courseSlot) => {
      const stepType = stepTypes.value.find(item => item.value === courseSlot.step).type;

      const startHour = CompaniDate(courseSlot.dates.startHour, 'HH:mm');
      const endHour = CompaniDate(courseSlot.dates.endHour, 'HH:mm');

      return {
        startDate: CompaniDate(courseSlot.dates.startDate).set(startHour.getUnits(['hour', 'minute'])).toISO(),
        endDate: CompaniDate(courseSlot.dates.endDate).set(endHour.getUnits(['hour', 'minute'])).toISO(),
        ...(stepType === ON_SITE && get(courseSlot, 'address.fullAddress') && { address: courseSlot.address }),
        ...(stepType === REMOTE && courseSlot.meetingLink && { meetingLink: courseSlot.meetingLink }),
      };
    };

    const updateCourseSlot = async () => {
      try {
        v$.value.editedCourseSlot.$touch();
        const isValid = await waitForFormValidation(v$.value.editedCourseSlot);
        if (!isValid) return NotifyWarning('Champ(s) invalide(s).');

        modalLoading.value = true;
        const payload = formatEditionPayload(editedCourseSlot.value);
        await CourseSlots.update(editedCourseSlot.value._id, payload);
        NotifyPositive('Créneau modifié.');

        editionModal.value = false;
        emit('refresh');
      } catch (e) {
        console.error(e);
        if ([403, 409].includes(e.status) && e.data.message) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de la modification du créneau.');
      } finally {
        modalLoading.value = false;
      }
    };

    const deleteCourseSlot = async (slotId) => {
      try {
        modalLoading.value = true;
        await CourseSlots.delete(slotId);
        emit('refresh');
        NotifyPositive('Créneau supprimé');
        editionModal.value = false;
      } catch (e) {
        console.error(e);
        if (e.data.statusCode === 409) return NotifyWarning('Créneau émargé : impossible de le supprimer.');
        if (e.data.statusCode === 403) return NotifyWarning('Seul créneau de l\'étape : impossible de le supprimer.');
        NotifyNegative('Erreur lors de la suppression du créneau.');
      } finally {
        modalLoading.value = false;
      }
    };

    const unplanSlot = async (slotId) => {
      try {
        modalLoading.value = true;
        await CourseSlots.update(slotId, { startDate: '', endDate: '' });
        emit('refresh');
        NotifyPositive('Dates supprimées.');
        editionModal.value = false;
      } catch (e) {
        console.error(e);
        if (e.status === 403) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de la suppression des dates.');
      } finally {
        modalLoading.value = false;
      }
    };

    const setCourseSlot = (payload) => {
      const { path, value } = payload;
      set(editedCourseSlot.value, path, value);
    };

    const updateEstimatedStartDate = () => emit('update');

    const inputTmpEstimatedStartDate = event => emit('update:estimatedStartDate', event);

    const isElearningStep = step => step.type === E_LEARNING;

    const isPlannedStep = step => !!courseSlotsByStepAndDate.value[step.key] &&
      Object.keys(courseSlotsByStepAndDate.value[step.key]).every(date => date !== TO_PLAN_KEY);

    const isStepToPlan = step => !(isElearningStep(step) || isPlannedStep(step));

    const getStepClass = (step) => {
      if (isElearningStep(step)) return '';
      if (isPlannedStep(step)) return 'planned';

      return 'to-plan';
    };

    const setIsOnlySlot = (step) => {
      const days = Object.keys(courseSlotsByStepAndDate.value[step]);

      return days.length === 1 && courseSlotsByStepAndDate.value[step][days[0]].length === 1;
    };

    const getSlotClass = step => [
      'row items-center',
      canEdit.value && `cursor-pointer hover-${isPlannedStep(step) ? 'blue' : 'orange'}`,
    ];

    const showStepDetails = () => { showStepList.value = !showStepList.value; };

    const showSlotToPlanDetails = (stepId) => {
      showSlotToPlan.value[stepId] = !showSlotToPlan.value[stepId];
    };

    const openMultipleSlotCreationModal = (stepId) => {
      if (course.value.archivedAt) {
        return NotifyWarning('Vous ne pouvez pas ajouter de créneaux à une formation archivée.');
      }
      set(slotsToAdd.value, 'step', stepId);
      multipleSlotCreationModal.value = true;
    };

    const createCourseSlots = async () => {
      try {
        v$.value.slotsToAdd.$touch();
        if (v$.value.slotsToAdd.$error) return NotifyWarning('Champ invalide');

        slotCreationLoading.value = true;
        await CourseSlots.create(slotsToAdd.value);

        multipleSlotCreationModal.value = false;
        const message = slotsToAdd.value.quantity > 1 ? 'Créneaux à planifier ajoutés.' : 'Créneau à planifier ajouté.';
        NotifyPositive(message);

        emit('refresh');
      } catch (e) {
        console.error(e);

        const message = slotsToAdd.value.quantity > 1
          ? 'Erreur lors de l\'ajout des créneaux à planifier.'
          : 'Erreur lors de l\'ajout du créneau à planifier.';
        NotifyNegative(message);
      } finally {
        slotCreationLoading.value = false;
      }
    };

    const resetCreationModal = () => {
      slotsToAdd.value = { course: course.value._id, step: '', quantity: 1 };
      v$.value.slotsToAdd.$reset();
    };

    const created = async () => {
      if (!course.value) emit('refresh');

      showSlotToPlan.value = stepList.value.map(s => ({ [s.key]: false }));
    };

    created();

    return {
      // Data
      isVendorInterface,
      ON_SITE,
      slotCreationLoading,
      modalLoading,
      editedCourseSlot,
      editionModal,
      TO_PLAN_KEY,
      isOnlySlot,
      isPlannedSlot,
      showStepList,
      showSlotToPlanDetails,
      slotsToAdd,
      multipleSlotCreationModal,
      // Computed
      v$,
      course,
      formatSlotTitle,
      stepTypes,
      courseSlotsByStepAndDate,
      stepList,
      // Methods
      get,
      omit,
      tail,
      getSlotAddress,
      openEditionModal,
      resetEditionModal,
      updateCourseSlot,
      deleteCourseSlot,
      unplanSlot,
      setCourseSlot,
      updateEstimatedStartDate,
      inputTmpEstimatedStartDate,
      isElearningStep,
      isStepToPlan,
      getStepClass,
      getSlotClass,
      formatSlotSchedule,
      showStepDetails,
      showSlotToPlan,
      openMultipleSlotCreationModal,
      resetCreationModal,
      createCourseSlots,
    };
  },
};
</script>

<style lang="sass" scoped>
.slot-section-title
  padding: 0
  margin: 10px 0px
  &-subtitle
    font-style: italic
    font-size: 16px
    @media screen and (max-width: 767px)
      font-size: 13px
.type
  background-color: $copper-grey-100
  border-radius: 15px
  padding: 2px 6px
  width: fit-content
.planned
  background-color: $copper-100
  border-radius: 15px
  padding-bottom: 16px
.to-plan
  background-color: $orange-100
  border-radius: 15px
  padding-bottom: 16px
.to-plan-header
  background-color: $orange-200
  padding: 8px 16px
  border-radius: 15px 15px 0px 0px
  color: $orange-900
.slots
  flex-direction: row
  justify-content: space-between
  padding: 16px
.index
  background-color: $copper-500
  border-radius: 50%
  width: 20px
  height: 20px
  padding: 2px 0px
  text-align: center
  color: white
  margin: 0px 4px
  font-size: 12px
.hover-orange
  &:hover
    background-color: rgba(192, 86, 33, 0.1)
.hover-blue
  &:hover
    background-color: rgba(69, 165, 173, 0.1)
.slots-container
   @media screen and (min-width: 767px)
    margin-left: 32px
.link
  &:hover
    text-decoration: underline
    text-decoration-color: $primary
.link-container
  max-width: 14em
.to-plan-slot-container
  width: fit-content
.to-plan-slot
  display: flex
  flex-wrap: wrap
  align-items: center
  margin-left: 24px
  padding: 8px
.q-item__section
  margin-left: 0px
</style>
