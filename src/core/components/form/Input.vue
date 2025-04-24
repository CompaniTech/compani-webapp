<template>
  <div v-if="!hidden" :class="{ 'col-xs-12 col-md-6': !inModal, 'margin-input full-width': inModal, last: last }"
    class="input">
    <div class="row justify-between">
      <p :class="['input-caption', { required: requiredField }]">{{ caption }}</p>
      <q-icon v-if="error" name="error_outline" color="secondary" size="1rem" class="q-mb-xs" />
    </div>
    <template v-if="type === 'file'">
      <div class="row input-file-container" :class="{'borders-parent': inModal}">
        <div class="col full-width">
          <span class="input-file-empty" v-if="!modelValue">Pas de document</span>
          <template v-else>{{ modelValue.name }}</template>
        </div>
        <i aria-hidden="true" class="q-icon on-right material-icons self-center relative-position">
          add
          <input ref="inputFile" type="file" @input="updateInputFile" class="input-file absolute-full cursor-pointer"
            @blur="onBlur" :accept="extensions">
        </i>
      </div>
      <div class="file-error" v-if="error">{{ errorMessage }}</div>
    </template>
    <template v-else>
      <q-input borderless dense :ref="name" :model-value="modelValue" bg-color="white" @focus="onFocus"
        :upper-case="upperCase" :lower-case="lowerCase" :type="inputType" :rows="rows" :suffix="suffix" :error="error"
        @blur="onBlur" @update:model-value="update" @keyup.enter="$emit('keyup-enter')" :error-message="errorMessage"
        :autogrow="autogrow" :readonly="readOnly" :debounce="debounce" :placeholder="placeholder"
        :data-cy="dataCy" @click="onClick" :hide-bottom-space="readOnly" :input-class="inputClass" :mask="mask"
        :class="{ 'no-border': noBorder }" :disable="disable">
        <template v-if="icon" #prepend>
          <q-icon size="xs" :name="icon" />
        </template>
        <template v-if="isPassword" #append>
          <ni-button :icon="passwordIcon" @click="toggleIcon" size="sm" />
        </template>
      </q-input>
    </template>
  </div>
</template>

<script>
import { REQUIRED_LABEL } from '@data/constants';
import Button from '@components/Button';

export default {
  name: 'NiInput',
  components: {
    'ni-button': Button,
  },
  props: {
    caption: { type: String, default: '' },
    error: { type: Boolean, default: false },
    errorMessage: { type: String, default: REQUIRED_LABEL },
    modelValue: { type: [String, Number, File], default: '' },
    upperCase: { type: Boolean, default: false },
    lowerCase: { type: Boolean, default: false },
    disable: { type: Boolean, default: false },
    readOnly: { type: Boolean, default: false },
    type: { type: String, default: 'text' },
    rows: { type: Number, default: 1 },
    hidden: { type: Boolean, default: false },
    suffix: { type: String, default: '' },
    requiredField: { type: Boolean, default: false },
    name: { type: String, default: '' },
    inModal: { type: Boolean, default: false },
    last: { type: Boolean, default: false },
    autofocus: { type: Boolean, default: false },
    debounce: { type: Number, default: 500 },
    placeholder: { type: String, default: '' },
    icon: { type: String, default: '' },
    mask: { type: String, default: '' },
    dataCy: { type: String, default: '' },
    inputClass: { type: [Array, String, Object], default: '' },
    noBorder: { type: Boolean, default: false },
    extensions: { type: Array, default: () => [] },
  },
  emits: ['update:model-value', 'blur', 'focus', 'click', 'keyup-enter'],
  data () {
    return {
      showPassword: false,
    };
  },
  computed: {
    isPassword () {
      return this.type === 'password';
    },
    inputType () {
      return this.isPassword && this.showPassword ? 'text' : this.type;
    },
    passwordIcon () {
      return this.isPassword && this.showPassword ? 'visibility' : 'visibility_off';
    },
    autogrow () {
      return this.type === 'textarea' && this.rows === 1;
    },
  },
  methods: {
    toggleIcon () {
      this.showPassword = !this.showPassword;
    },
    updateInputFile () {
      this.$emit('update:model-value', this.$refs.inputFile.files[0]);
    },
    onBlur (event) {
      if (this.type === 'number') this.$nextTick(() => this.$emit('blur'));
      else this.$emit('blur');
    },
    onFocus () {
      this.$emit('focus');
    },
    update (value) {
      this.$emit('update:model-value', value);
    },
    select () {
      this.$refs[this.name].select();
    },
    onClick () {
      this.$emit('click');
    },
  },
  watch: {
    value () {
      if (this.$refs.inputFile && !this.value) {
        // Otherwise you can't pick the same file twice in a row.
        this.$refs.inputFile.value = '';
      }
    },
  },
};
</script>

<style lang="sass" scoped>
.input-file-container
  padding: 6px 10px
  overflow-wrap: break-word
  .input-file-empty
    font-size: 12px
  .input-file
    opacity: 0
    max-width: 100%
    height: 100%
    width: 100%
    font-size: 0
.file-error
  color: $secondary
  line-height: 1
  font-size: 11px
  padding-top: 3px

:deep(.q-field__native, .q-field__prefix, .q-field__suffix, .q-field__input)
  color: $copper-grey-900
</style>
