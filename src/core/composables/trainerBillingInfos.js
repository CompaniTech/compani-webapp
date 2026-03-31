import useVuelidate from '@vuelidate/core';
import pick from 'lodash/pick';
import get from 'lodash/get';
import uniqBy from 'lodash/uniqBy';
import { ref, computed } from 'vue';
import CourseSlots from '@api/CourseSlots';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { MONTH, SLOT_STATUS, MINUTE, NOT_PAID } from '@data/constants';
import { formatAndSortIdentityOptions } from '@helpers/utils';
import CompaniDate from '@helpers/dates/companiDates';
import CompaniDuration from '@helpers/dates/companiDurations';
import { minDate, maxDate } from '@helpers/vuelidateCustomVal';
import { add } from '@helpers/numbers';

export const useTrainerBillingInfos = (trainer, loggedUserIsTrainer = { value: false }) => {
  const slotsLoading = ref(false);
  const trainerBillingInfos = ref({});
  const dateRange = ref({
    startDate: CompaniDate().subtract('P3M').startOf(MONTH).toISO(),
    endDate: CompaniDate().subtract('P1M').endOf(MONTH).toISO(),
  });
  const maxMonthsPeriod = loggedUserIsTrainer.value ? 3 : 4;
  const min = ref(CompaniDate().subtract(`P${maxMonthsPeriod}M`).startOf(MONTH).toISO());
  const max = ref(CompaniDate().add(`P${maxMonthsPeriod}M`).endOf(MONTH).toISO());
  const selectedTrainer = ref('');
  const selectedStatus = ref('');
  const selectedProgram = ref('');

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
        ...get(trainer, 'value') && { trainerId: trainer.value._id },
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
    if (selectedProgram.value) {
      data = Object.fromEntries(Object.entries(data).map(([trainerId, t]) => ([
        trainerId,
        { ...t, courses: t.courses.filter(c => c.program._id === selectedProgram.value) },
      ])));
    }
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

                const filteredStepSlots = step.slots.filter(s => s.status === selectedStatus.value);
                filteredStepSlots.forEach((slot) => {
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
                });

                return [
                  stepName,
                  {
                    slots: filteredStepSlots,
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
    Object.entries(trainerBillingInfos.value).map(([trainerId, t]) => ({
      _id: trainerId,
      identity: t.identity,
    }))
  ));

  const programOptions = computed(() => {
    const programs = Object.values(filteredData.value).flatMap(t => [
      ...t.courses.map(c => c.program),
      ...(t.collectiveSlots
        ? Object.values(t.collectiveSlots.slots).flatMap(slotGroup => slotGroup.slots.map(s => s.program))
        : []),
    ]);

    const uniqPrograms = uniqBy(programs, '_id');

    return [
      { label: 'Tous les programmes', value: '' },
      ...uniqPrograms.map(p => ({ label: p.name, value: p._id })).sort((a, b) => a.label.localeCompare(b.label)),
    ];
  });

  const dateRangeErrorMessage = computed(() => {
    if (CompaniDate(dateRange.value.endDate).isBefore(dateRange.value.startDate)) {
      return 'La date de fin doit être postérieure à la date de début';
    }

    if (CompaniDate(dateRange.value.startDate).add(`P${maxMonthsPeriod}M`).isBefore(dateRange.value.endDate)) {
      return `Date(s) invalide(s) : la période maximale est ${maxMonthsPeriod} mois`;
    }

    return '';
  });

  const input = (date) => {
    min.value = CompaniDate(date.endDate).subtract(`P${maxMonthsPeriod}M`).add('P1D').toISO();
    max.value = CompaniDate(date.startDate).add(`P${maxMonthsPeriod}M`).subtract('P1D').toISO();
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

  return {
    // Data
    dateRange,
    selectedStatus,
    selectedTrainer,
    statusOptions,
    selectedProgram,
    // Computed
    v$,
    filteredData,
    trainerOptions,
    dateRangeErrorMessage,
    programOptions,
    // Methods
    refreshCourseSlots,
    input,
    goToPreviousMonth,
    goToNextMonth,
  };
};
