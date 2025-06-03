<template>
  <q-card class="card" flat>
    <div class="text-weight-bold">{{ card.question }}</div>
    <div class="q-mb-lg subtitle">{{ subtitle }}</div>
    <ni-banner v-if="isRofOrVendorAdmin" icon="info_outline" class="bg-peach-100">
      <template #message>
        Moyenne des réponses : <a class="text-weight-bold text-copper-grey-700">{{ average }} / 5</a>
      </template>
    </ni-banner>
    <div class="container">
      <div class="info-container">
        <div class="bar-container">
          <div v-for="(line, index) in lines" :key="index">
            <div class="bar bg-peach-100">
              <div class="bar-fill bg-peach-200" :style="`height: ${line.percentage * 100}%`" />
              <div class="q-mt-sm bar-label">{{ index + 1 }}</div>
            </div>
            <div class="percentage">{{ formatPercentage(line.percentage) }}</div>
          </div>
        </div>
        <div class="labels-container">
          <ni-labels-details :are-details-visible="!isRofOrVendorAdmin" :labels="card.labels" />
        </div>
      </div>
    </div>
  </q-card>
</template>

<script>
import { toRefs, computed } from 'vue';
import { useStore } from 'vuex';
import { formatQuantity, formatPercentage } from '@helpers/utils';
import LabelsDetails from '@components/LabelsDetails';
import Banner from '@components/Banner';
import { add, multiply, toFixedToFloat } from '@helpers/numbers';
import { TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN } from '@data/constants';

export default {
  name: 'SurveyChart',
  props: {
    card: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-labels-details': LabelsDetails,
    'ni-banner': Banner,
  },
  setup (props) {
    const { card } = toRefs(props);

    const $store = useStore();

    const vendorRole = computed(() => $store.getters['main/getVendorRole']);

    const isRofOrVendorAdmin = computed(() => [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(vendorRole.value));

    const subtitle = computed(() => `${formatQuantity('réponse', card.value.answers.length)} à ce sondage`);

    const lines = computed(() => ['1', '2', '3', '4', '5'].map((pa) => {
      const total = card.value.answers.filter(a => a === pa).length;

      return { title: pa, total, percentage: total / card.value.answers.length || 0 };
    }));

    const average = computed(() => {
      const total = lines.value.reduce((acc, val) => add(acc, multiply(val.title, val.percentage)), 0);

      return toFixedToFloat(total);
    });

    return {
      // Computed
      subtitle,
      lines,
      average,
      isRofOrVendorAdmin,
      // Methods
      formatPercentage,
    };
  },
};
</script>

<style lang="sass" scoped>
.card
  padding: 16px 32px

.subtitle
  color: $copper-grey-800
  font-size: 14px

.percentage
  text-align: center
  @media screen and (max-width: 420px)
    font-size: 12px

.bar-container
  display: flex
  justify-content: space-between
  width: 312px
  align-items: center
  @media screen and (max-width: 420px)
    width: 100%

.bar
  position: relative
  border-radius: 8px
  width: 56px
  height: 160px
  @media screen and (max-width: 420px)
    width: 32px

.first-label
  width: 30%

.last-label
  width: 30%
  text-align: right

.bar-fill
  position: absolute
  border-radius: 8px
  bottom: 0px
  width: 100%

.bar-label
  position: absolute
  font-size: 16px
  text-align: center
  width: 100%

.container
  container-type: inline-size

.info-container
  display: flex
  flex: 1
  justify-content: space-around
  align-items: center
  @container (max-width: 767px)
    flex-direction: column

.labels-container
  width: 30vw
  @container (min-width: 767px )
    width: 40vw
  @container (max-width: 250px)
    width: 60vw
</style>
