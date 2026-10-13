<template>
  <div :class="`course-container ${backgroundClass}`">
    <div class="text-weight-bold q-mb-sm">{{ title }} ({{ courseCounter }})</div>
    <course-cell class="q-mb-sm" v-for="(course) in courses" :key="course._id" :course="course" ref="cellRefs" />
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import CourseCell from '@components/courses/CourseCell';

export default {
  name: 'CourseContainer',
  props: {
    title: { type: String, default: '' },
    courses: { type: Array, default: () => [] },
  },
  components: {
    'course-cell': CourseCell,
  },
  setup () {
    const cellRefs = ref([]);

    const courseCounter = computed(() => cellRefs.value
      .flat()
      .map(t => t.isDisplayed)
      .reduce((acc, value) => (value ? acc + 1 : acc), 0));

    return {
      // Data
      backgroundClass: 'bg-petrol text-cream',
      cellRefs,
      // Computed
      courseCounter,
    };
  },
};
</script>

<style lang="sass" scoped>
.course-container
  padding: 10px
  border-radius: 3px
  &:not(:first-child)
    margin-left: 10px
  &:not(:last-child)
    margin-right: 10px
  @media screen and (min-width: 768px)
    width: 33%
  @media screen and (max-width: 767px)
    min-width: 250px
</style>
