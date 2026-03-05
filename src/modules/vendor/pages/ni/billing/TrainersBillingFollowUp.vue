<template>
  <q-page padding class="vendor-background q-pb-xl">
     <ni-profile-header title="Suivi de la facturation des intervenant·es">
      <template #title>
        <ni-button icon="chevron_left" class="no-shadow" @click="goToPreviousMonth" />
        <ni-date-range class="col-md-6 col-xs-12" caption="Période" v-model="dateRange" :error="v$.dateRange.$error"
          @update:model-value="input" :error-message="dateRangeErrorMessage" @blur="v$.dateRange.$touch" />
         <ni-button icon="chevron_right" class="no-shadow" @click="goToNextMonth" />
      </template>
    </ni-profile-header>
    <div class="reset-filters" @click="resetFilters">Effacer les filtres</div>
    <div class="filters-container">
      <ni-select caption="Intervenant·e" clearable :options="trainerOptions" v-model="selectedTrainer" />
      <ni-select caption="Statut des créneaux" clearable :options="statusOptions" v-model="selectedStatus" />
    </div>
    <trainer-billing-infos-card v-for="trainerId of Object.keys(filteredData)" :key="trainerId"
      :trainer-infos="filteredData[trainerId]" @refresh="refreshCourseSlots" :trainer-id="trainerId" />
  </q-page>
</template>
<script>
import { useMeta } from 'quasar';
import useVuelidate from '@vuelidate/core';
import pick from 'lodash/pick';
import { ref, computed, watch } from 'vue';
import CourseSlots from '@api/CourseSlots';
import ProfileHeader from '@components/ProfileHeader';
import DateRange from '@components/form/DateRange';
import Select from '@components/form/Select';
import Button from '@components/Button';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { MONTH, SLOT_STATUS, MINUTE, NOT_PAID } from '@data/constants';
import { formatAndSortIdentityOptions } from '@helpers/utils';
import CompaniDate from '@helpers/dates/companiDates';
import CompaniDuration from '@helpers/dates/companiDurations';
import { minDate, maxDate } from '@helpers/vuelidateCustomVal';
import { add } from '@helpers/numbers';
import TrainerBillingInfosCard from 'src/modules/vendor/components/billing/TrainerBillingInfosCard';

export default {
  name: 'TrainersBillingFollowUp',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-date-range': DateRange,
    'ni-select': Select,
    'ni-button': Button,
    'trainer-billing-infos-card': TrainerBillingInfosCard,
  },
  setup () {
    const metaInfo = { title: 'Suivi de la facturation des intervenant·es' };
    useMeta(metaInfo);

    const slotsLoading = ref(false);
    const trainerBillingInfos = ref({});
    const dateRange = ref({
      startDate: CompaniDate().subtract('P2M').startOf(MONTH).toISO(),
      endDate: CompaniDate().endOf(MONTH).toISO(),
    });
    const min = ref(CompaniDate().endOf(MONTH).subtract('P3M').toISO());
    const max = ref(CompaniDate().startOf(MONTH).add('P3M').toISO());
    const selectedTrainer = ref('');
    const selectedStatus = ref('');

    const statusOptions = [
      ...Object.entries(SLOT_STATUS).map(([value, label]) => ({ label, value })),
      { label: 'Tous', value: '' },
    ];

    const rules = computed(() => ({
      dateRange: {
        startDate: { minDate: minDate(min.value) },
        endDate: { maxDate: maxDate(max.value), minDate: minDate(dateRange.value.startDate) },
      },
    }));

    const v$ = useVuelidate(rules, { dateRange });

    const refreshCourseSlots = async () => {
      try {
        await v$.value.dateRange.$touch();
        if (v$.value.dateRange.$error) return NotifyWarning('Date(s) invalide(s)');

        slotsLoading.value = true;
        const slots = await CourseSlots.list({
          startDate: dateRange.value.startDate,
          endDate: dateRange.value.endDate,
        });
        trainerBillingInfos.value = slots;
        NotifyPositive('Créneaux de l\'intervenant·es récupérés.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des créneaux de l\'intervenant·es.');
      } finally {
        slotsLoading.value = false;
      }
    };

    const filteredData = computed(() => {
      let data = trainerBillingInfos.value;
      if (selectedTrainer.value) data = pick(data, selectedTrainer.value);
      if (!selectedStatus.value) return data;

      return Object.fromEntries(
        Object.entries(data).map(([trainerId, trainerInfos]) => {
          // Single slots
          const courses = trainerInfos.courses
            .map((course) => {
              let paidSingleSlotsDuration = CompaniDuration('PT0S');
              let paidSingleSlotsAbsenceDuration = CompaniDuration('PT0S');
              let notPaidSingleSlotsDuration = CompaniDuration('PT0S');
              let notPaidSingleSlotsAbsenceDuration = CompaniDuration('PT0S');

              const singleTraineeSlots = Object.fromEntries(
                Object.entries(course.singleTraineeSlots).map(([stepName, step]) => {
                  let toPayDuration = CompaniDuration('PT0S');
                  let paidDuration = CompaniDuration('PT0S');
                  let toPayAmount = 0;
                  let paidAmount = 0;

                  const stepSlots = step.slots
                    .filter(s => s.status === selectedStatus.value)
                    .map((slot) => {
                      const duration = CompaniDate(slot.endDate).diff(slot.startDate, MINUTE);
                      const durObj = CompaniDuration(duration);

                      if (slot.status === NOT_PAID) {
                        toPayDuration = toPayDuration.add(durObj);
                        toPayAmount = add(toPayAmount, slot.amount);

                        notPaidSingleSlotsDuration = notPaidSingleSlotsDuration.add(durObj);
                        if (slot.isAbsence) {
                          notPaidSingleSlotsAbsenceDuration = notPaidSingleSlotsAbsenceDuration.add(durObj);
                        }
                      } else {
                        paidDuration = paidDuration.add(durObj);
                        paidAmount = add(paidAmount, slot.amount);

                        paidSingleSlotsDuration = paidSingleSlotsDuration.add(durObj);
                        if (slot.isAbsence) {
                          paidSingleSlotsAbsenceDuration = paidSingleSlotsAbsenceDuration.add(durObj);
                        }
                      }

                      return slot;
                    });

                  return [
                    stepName,
                    {
                      slots: stepSlots,
                      toPayDuration: toPayDuration.toISO(),
                      paidDuration: paidDuration.toISO(),
                      toPayAmount,
                      paidAmount,
                    },
                  ];
                }).filter(([, val]) => val.slots.length)
              );

              return {
                ...course,
                singleTraineeSlots,
                paidSingleSlotsDuration: paidSingleSlotsDuration.toISO(),
                paidSingleSlotsAbsenceDuration: paidSingleSlotsAbsenceDuration.toISO(),
                notPaidSingleSlotsDuration: notPaidSingleSlotsDuration.toISO(),
                notPaidSingleSlotsAbsenceDuration: notPaidSingleSlotsAbsenceDuration.toISO(),
              };
            })
            .filter(c => Object.keys(c.singleTraineeSlots).length);

          // Collective slots
          let totalPaidCollective = CompaniDuration('PT0S');
          let totalPaidCollectiveAbs = CompaniDuration('PT0S');
          let totalNotPaidCollective = CompaniDuration('PT0S');
          let totalNotPaidCollectiveAbs = CompaniDuration('PT0S');

          const collectiveSlots = Object.fromEntries(
            Object.entries(trainerInfos.collectiveSlots.slots).map(([day, daySlotGroup]) => {
              const filteredSlots = daySlotGroup.slots.filter(s => s.status === selectedStatus.value);

              let toPayDuration = CompaniDuration('PT0S');
              let paidDuration = CompaniDuration('PT0S');
              let toPayAmount = 0;
              let paidAmount = 0;

              const slotsByDates = {};
              filteredSlots.forEach((slot) => {
                const dur = CompaniDate(slot.endDate).diff(slot.startDate, MINUTE);
                const durObj = CompaniDuration(dur);
                const dates = `${slot.startDate}_${slot.endDate}`;
                if (!slotsByDates[dates]) {
                  slotsByDates[dates] = {
                    durationObj: durObj,
                    amount: slot.amount,
                    status: slot.status,
                    allAbsent: slot.isAbsence,
                  };
                } else {
                  slotsByDates[dates].allAbsent = slotsByDates[dates].allAbsent && slot.isAbsence;
                }
              });

              Object.values(slotsByDates).forEach(({ durationObj, amount, status, allAbsent }) => {
                if (status === NOT_PAID) {
                  toPayDuration = toPayDuration.add(durationObj);
                  toPayAmount = add(toPayAmount, amount);

                  totalNotPaidCollective = totalNotPaidCollective.add(durationObj);
                  if (allAbsent) totalNotPaidCollectiveAbs = totalNotPaidCollectiveAbs.add(durationObj);
                } else {
                  paidDuration = paidDuration.add(durationObj);
                  paidAmount = add(paidAmount, amount);

                  totalPaidCollective = totalPaidCollective.add(durationObj);
                  if (allAbsent) totalPaidCollectiveAbs = totalPaidCollectiveAbs.add(durationObj);
                }
              });

              return [
                day,
                {
                  slots: filteredSlots,
                  toPayDuration: toPayDuration.toISO(),
                  paidDuration: paidDuration.toISO(),
                  toPayAmount,
                  paidAmount,
                },
              ];
            }).filter(([, val]) => val.slots.length)
          );

          const {
            totalPaidSingle,
            totalPaidSingleAbsence,
            totalNotPaidSingle,
            totalNotPaidSingleAbsence,
          } = courses.reduce((acc, c) => {
            acc.totalPaidSingle = acc.totalPaidSingle.add(CompaniDuration(c.paidSingleSlotsDuration));
            acc.totalPaidSingleAbsence = acc.totalPaidSingleAbsence
              .add(CompaniDuration(c.paidSingleSlotsAbsenceDuration));
            acc.totalNotPaidSingle = acc.totalNotPaidSingle.add(CompaniDuration(c.notPaidSingleSlotsDuration));
            acc.totalNotPaidSingleAbsence = acc.totalNotPaidSingleAbsence
              .add(CompaniDuration(c.notPaidSingleSlotsAbsenceDuration));

            return acc;
          }, {
            totalPaidSingle: CompaniDuration('PT0S'),
            totalPaidSingleAbsence: CompaniDuration('PT0S'),
            totalNotPaidSingle: CompaniDuration('PT0S'),
            totalNotPaidSingleAbsence: CompaniDuration('PT0S'),
          });

          const totalPaid = totalPaidSingle.add(totalPaidCollective);
          const totalPaidAbs = totalPaidSingleAbsence.add(totalPaidCollectiveAbs);
          const totalNotPaid = totalNotPaidSingle.add(totalNotPaidCollective);
          const totalNotPaidAbs = totalNotPaidSingleAbsence.add(totalNotPaidCollectiveAbs);

          return [
            trainerId,
            {
              ...trainerInfos,
              courses,
              collectiveSlots: {
                slots: collectiveSlots,
                totals: {
                  paidCollectiveSlotsDuration: totalPaidCollective.toISO(),
                  paidCollectiveSlotsAbsenceDuration: totalPaidCollectiveAbs.toISO(),
                  notPaidCollectiveSlotsDuration: totalNotPaidCollective.toISO(),
                  notPaidCollectiveSlotsAbsenceDuration: totalNotPaidCollectiveAbs.toISO(),
                },
              },
              totalPaidSlotsDuration: totalPaid.toISO(),
              totalPaidSlotsAbsenceDuration: totalPaidAbs.toISO(),
              totalNotPaidSlotsDuration: totalNotPaid.toISO(),
              totalNotPaidSlotsAbsenceDuration: totalNotPaidAbs.toISO(),
            },
          ];
        })
      );
    });

    const trainerOptions = computed(() => formatAndSortIdentityOptions(
      Object.entries(trainerBillingInfos.value).map(([trainerId, trainer]) => ({
        _id: trainerId,
        identity: trainer.identity,
      }))
    ));

    const dateRangeErrorMessage = computed(() => {
      if (CompaniDate(dateRange.value.endDate).isBefore(dateRange.value.startDate)) {
        return 'La date de fin doit être postérieure à la date de début';
      }
      if (CompaniDate(dateRange.value.startDate).add('P3M').isBefore(dateRange.value.endDate)) {
        return 'Date(s) invalide(s) : la période maximale est 3 mois';
      }

      return '';
    });

    const input = (date) => {
      min.value = CompaniDate(date.endDate).subtract('P3M').add('P1D').toISO();
      max.value = CompaniDate(date.startDate).add('P3M').subtract('P1D').toISO();
    };

    const updateSelectedTrainer = (value) => { selectedTrainer.value = value; };

    const resetFilters = () => {
      selectedTrainer.value = '';
    };

    const goToPreviousMonth = () => {
      const date = CompaniDate(dateRange.value.startDate).startOf(MONTH).subtract('P3M');
      dateRange.value = { startDate: date.toISO(), endDate: date.add('P2M').endOf(MONTH).toISO() };
      input(dateRange.value);
    };

    const goToNextMonth = () => {
      const date = CompaniDate(dateRange.value.startDate).startOf(MONTH).add('P3M');
      dateRange.value = { startDate: date.toISO(), endDate: date.add('P2M').endOf(MONTH).toISO() };
      input(dateRange.value);
    };

    watch(dateRange, async () => {
      selectedTrainer.value = '';
      const promises = [refreshCourseSlots()];

      return Promise.all(promises);
    });

    const created = async () => {
      await Promise.all([refreshCourseSlots()]);
    };

    created();

    return {
      // Data
      dateRange,
      selectedTrainer,
      selectedStatus,
      statusOptions,
      // Computed
      filteredData,
      dateRangeErrorMessage,
      trainerOptions,
      v$,
      // Methods
      input,
      updateSelectedTrainer,
      resetFilters,
      goToPreviousMonth,
      goToNextMonth,
      refreshCourseSlots,
    };
  },
};
</script>

<style lang="sass" scoped>
.details
  flex-direction: row
  justify-content: space-between
  padding: 16px 0px
</style>
