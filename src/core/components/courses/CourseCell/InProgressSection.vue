<template>
  <div class="slots-timeline-container">
    <div :class="['additional-infos', { 'to-plan' : course.slotsToPlan.length }]">
      {{ slotsHappened }} / {{ course.slots.length + course.slotsToPlan.length }}
      {{ course.slotsToPlan.length ? ` - ${course.slotsToPlan.length} à planifier` : '' }}
    </div>
    <q-item>
      <q-item-section>
        <div class="row slots-timeline">
          <div v-for="(slot, index) in course.slots" :key="index"
            :class="['col-3', 'slots', { 'slots-happened': happened(slot) }]" />
          <div v-for="(slot, index) in course.slotsToPlan" :key="course.slots.length + index + 1"
            class="col-3 slots slots-to-plan" />
        </div>
      </q-item-section>
    </q-item>
  </div>
</template>

<script>
import { computed, toRefs } from 'vue';
import { IN_PROGRESS } from '@data/constants';
import { happened } from '@helpers/courses';

export default {
  name: 'InProgressSection',
  props: {
    course: { type: Object, default: () => ({}) },
  },
  emits: ['click'],
  setup (props) {
    const { course } = toRefs(props);

    const slotsHappened = computed(() => course.value.slots.filter(slot => happened(slot)).length);

    return {
      // Data
      IN_PROGRESS,
      // Computed
      slotsHappened,
      // Methods
      happened,
    };
  },
};
</script>

<style lang="sass" scoped>
.slots
  height: 10px
  flex: 1
  background-color: $turquoise
  &-happened
    background-color: $petrol-80
  &-to-plan
    background-color: $secondary

.slots-timeline-container
  display: flex
  flex-direction: column
  padding: 0px
  overflow: hidden
  .q-item
    margin-right: 0px
  .slots-timeline
    width: 104%
    margin-left: -2%
  .slots-timeline > :nth-child(1)
    margin-left: 0px
  .slots-timeline > div
    margin-left: 1px
  .additional-infos
    display: flex
    padding-right: 10px
    justify-content: flex-end
</style>
