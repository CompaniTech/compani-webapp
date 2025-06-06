<template>
  <div class="row no-wrap container">
    <q-linear-progress class="linear-progress bg-copper-100" size="8px" :value="value" color="primary" />
    <div class="q-mx-xs percentage">{{ percentage }}</div>
  </div>
</template>

<script>
import { toRefs, computed } from 'vue';
import { roundFrenchPercentage } from '@helpers/utils';

export default {
  name: 'NiProgress',
  props: {
    value: { type: Number, default: 0 },
  },
  setup (props) {
    const { value } = toRefs(props);

    const percentage = computed(() => roundFrenchPercentage(value.value * 100, 0));

    return {
      // Computed
      percentage,
    };
  },
};
</script>

<style lang="sass" scoped>
.container
  justify-content: center
  align-items: center

.linear-progress
  border-radius: 4px

.percentage
  color: $primary
  width: 60px
</style>
