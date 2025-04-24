<template>
  <div class="fixed-center text-center">
    <p>
      <img src="~assets/sad.svg" class="error-image">
    </p>
    <p class="text-faded">Désolé, il n'y a rien ici...</p>
    <ni-button class="bg-primary" v-if="canGoBack" color="white" @click="goBack" label="Retour" />
    <ni-button class="bg-primary" color="white" @click="goTo" label="Accueil" />
  </div>
</template>

<script>
import Button from '@components/Button';

export default {
  name: 'Error404',
  components: {
    'ni-button': Button,
  },
  data () {
    return {
      canGoBack: window.history.length > 1,
    };
  },
  methods: {
    goBack () {
      window.history.go(-1);
    },
    goTo () {
      return /\/ad\//.test(this.$route.path)
        ? this.$router.replace('/ad').catch((e) => {})
        : this.$router.replace('/').catch((e) => {});
    },
  },
};
</script>

<style lang="sass" scoped>
.q-btn
  margin: 5px
  width: 200px
</style>
