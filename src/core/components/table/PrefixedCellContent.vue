<template>
  <div class="row no-wrap items-center">
    <q-icon v-if="cellValue > 0" name="mdi-plus-circle-outline" color="petrol-60" class="balance-icon" />
    <q-icon v-if="cellValue < 0" name="mdi-minus-circle-outline" color="secondary" class="balance-icon" />
    <div>{{ content }}</div>
  </div>
</template>

<script>
import { formatPrice } from '@helpers/utils';

export default {
  name: 'PrefixedCellContent',
  props: {
    cellValue: { type: Number, default: () => 0 },
  },
  computed: {
    content () {
      return formatPrice(Math.abs(this.cellValue));
    },
  },
};
</script>
