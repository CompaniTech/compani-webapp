<template>
  <div>
    <q-card class="container clickable cursor-pointer" flat>
      <q-item-section @click="showDetails()" class="header">
        {{ showLabels ? 'Cacher' : 'Afficher' }} le détail des légendes
        <q-icon size="xs" :name="iconName" color="navy-80" />
      </q-item-section>
      <div v-if="showLabels" class="q-pb-md">
        <template v-for="labelKey of Object.keys(labels)" :key="labelKey">
          <div class="label">{{ labelKey }} : {{ labels[labelKey] }}</div>
        </template>
      </div>
    </q-card>
  </div>
</template>

<script>
import { computed, toRefs, ref } from 'vue';

export default {
  name: 'LabelsDetails',
  props: {
    areDetailsVisible: { type: Boolean, default: false },
    labels: { type: Object, default: () => {}, required: true },
  },
  setup (props) {
    const { areDetailsVisible } = toRefs(props);
    const showLabels = ref(areDetailsVisible.value);

    const iconName = computed(() => (showLabels.value ? 'expand_less' : 'expand_more'));

    const showDetails = () => { showLabels.value = !showLabels.value; };

    return {
      // Data
      showLabels,
      // Computed
      iconName,
      // Methods
      showDetails,
    };
  },
};
</script>

<style lang="sass" scoped>
.q-item__section
  margin: 0px
  padding: 16px
.container
  margin: 16px 0px
  background-color: $turquoise-10
.header
  display: flex
  flex-direction: row
  justify-content: space-between
  font-size: 14px
.label
  padding: 4px 32px
  font-size: 14px
  color: $petrol-80
</style>
