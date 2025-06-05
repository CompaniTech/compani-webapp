<template>
  <div class="thumbnail">
    <img :src="link" :alt="alt">
  </div>
</template>

<script>
import { toRefs, ref, watch, onMounted } from 'vue';

export default {
  name: 'CustomImg',
  props: {
    imageSource: { type: String, required: true },
    alt: { type: String, required: true },
  },
  setup (props) {
    const link = ref('');
    const { imageSource } = toRefs(props);

    const getThumbnailUrl = async () => {
      try {
        link.value = imageSource.value;
      } catch (e) {
        console.error(e);
      }
    };

    watch(() => imageSource, () => {
      getThumbnailUrl();
    });

    onMounted(() => {
      getThumbnailUrl();
    });

    return {
      // Data
      link,
    };
  },
};
</script>

<style lang="sass" scoped>
  .thumbnail
    position: relative
    width: 150px
    height: 150px
    overflow: hidden
    img
      position: absolute
      left: 50%
      top: 50%
      height: 100%
      width: auto
      -webkit-transform: translate(-50%,-50%)
      -ms-transform: translate(-50%,-50%)
      transform: translate(-50%,-50%)
</style>
