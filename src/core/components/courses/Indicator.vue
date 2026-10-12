<template>
  <div v-if="!indicator && displayDefaultIndicator" class="indicator text-weight-bold text-petrol">-</div>
  <div v-else class="indicator text-weight-bold text-petrol">{{ isPercentage ? `${indicator} %` : indicator }}</div>
</template>

<script>
export default {
  name: 'Indicator',
  props: {
    indicator: { type: Number, default: 0 },
    isPercentage: { type: Boolean, default: false },
    displayDefaultIndicator: { type: Boolean, default: false },
  },
};
</script>

<style lang="sass" scoped>
.indicator
  font-size: 36px
</style>
