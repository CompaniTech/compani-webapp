<template>
  <div class="course-link">
    <ni-bi-color-button icon="file_download" label="Convocation papier" :disable="disableLink" size="16px"
      @click="$emit('download')" />
    <ni-button color="primary" :disable="disableLink" icon="link" label="Lien de partage"
      @click="copy" />
</div>
</template>

<script>
import { computed, toRefs } from 'vue';
import { useStore } from 'vuex';
import { copyToClipboard } from 'quasar';
import { NotifyPositive, NotifyNegative } from '@components/popup/notify';
import Button from '@components/Button';
import BiColorButton from '@components/BiColorButton';
import Courses from '@api/Courses';

export default {
  name: 'CourseInfoLink',
  components: {
    'ni-button': Button,
    'ni-bi-color-button': BiColorButton,
  },
  props: {
    disableLink: { type: Boolean, default: true },
  },
  emits: ['download'],
  setup (props) {
    const { disableLink } = toRefs(props);
    const $store = useStore();
    const course = computed(() => $store.state.course.course);

    const courseLink = () => {
      if (disableLink.value) return;

      return Courses.getConvocationUrl(course.value._id);
    };

    const copy = () => {
      if (disableLink.value) return;

      copyToClipboard(courseLink())
        .then(() => NotifyPositive('Lien copié !'))
        .catch(() => NotifyNegative('Erreur lors de la copie du lien.'));
    };

    return {
      // Methods
      copy,
    };
  },
};
</script>

<style lang="sass" scoped>
.course-link
  @media screen and (min-width: $breakpoint-md-min)
    display: flex
    flex-direction: row
    align-items: center
    justify-content: left
</style>
