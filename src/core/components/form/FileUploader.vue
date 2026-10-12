<template>
  <div class="margin-input col-xs-12 col-md-6">
    <div v-if="displayCaption" class="row justify-between">
      <p :class="['input-caption', { required: requiredField }]">{{ caption }}</p>
      <q-icon v-if="error" name="error_outline" color="secondary" />
    </div>
    <div v-if="(document && imageSource) || noLinkInFile" class="row justify-between files-container">
      <div v-if="!hiddenImage" class="doc-thumbnail">
        <ni-custom-img :image-source="imageSource" :alt="caption" />
      </div>
      <div v-else class="document-caption">{{ caption }}</div>
      <div class="self-end">
        <ni-button icon="save_alt" :disable="loading || !getDocument(document) || noLinkInFile"
          @click="downloadDoc(document)" />
        <ni-button v-if="canDelete" icon="delete" :disable="disable || noLinkInFile" @click="deleteDocument" />
      </div>
    </div>
    <q-field borderless v-else :error="error" :error-message="errorMessage">
      <q-uploader ref="uploader" flat :bordered="inModal" color="white" :label="label" :url="url" with-credentials
        text-color="navy-80" @failed="failMsg" :form-fields="additionalFields" :max-file-size="maxFileSize"
        @uploaded="documentUploaded" auto-upload :accept="extensions" field-name="file" :multiple="multiple"
        @rejected="rejected" :disable="disable" @start="uploadStarted" @finish="uploadFinished" />
    </q-field>
  </div>
</template>

<script>
import { openURL } from 'quasar';
import get from 'lodash/get';
import Button from '@components/Button';
import CustomImg from '@components/form/CustomImg';
import { NotifyNegative } from '@components/popup/notify';
import { removeDiacritics } from '@helpers/utils';

export default {
  props: {
    caption: { type: String, default: '' },
    error: { type: Boolean, default: false },
    path: { type: String, default: '' },
    alt: { type: String, default: '' },
    name: { type: String, default: 'file' },
    additionalValue: { type: String, default: '' },
    entity: { type: Object, default: () => ({}) },
    url: { type: String, default: '' },
    errorMessage: { type: String, default: 'Document requis' },
    displayCaption: { type: Boolean, default: true },
    disable: { type: Boolean, default: false },
    inModal: { type: Boolean, default: false },
    extensions: { type: String, default: '' },
    requiredField: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    label: { type: String, default: 'Pas de document' },
    maxFileSize: { type: Number, default: 1000 * 1000 },
    docName: { type: String, default: 'download' },
    customFields: { type: Array, default: () => ([]) },
    hideImage: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: true },
    noLinkInFile: { type: Boolean, default: false },
  },
  components: {
    'ni-button': Button,
    'ni-custom-img': CustomImg,
  },
  emits: ['start', 'finish', 'delete', 'uploaded'],
  data () {
    return {
      loading: false,
    };
  },
  computed: {
    additionalFields () {
      const fields = [];
      if (this.customFields.length) fields.push(this.customFields);

      if (this.additionalValue) fields.push({ name: 'fileName', value: removeDiacritics(this.additionalValue) });

      return fields.flat();
    },
    document () {
      return get(this.entity, this.path);
    },
    imageSource () {
      return this.document.link;
    },
    hiddenImage () {
      return this.hideImage;
    },
  },
  methods: {
    uploadStarted () {
      this.$emit('start');
    },
    uploadFinished () {
      this.$emit('finish');
    },
    deleteDocument () {
      this.$emit('delete');
    },
    documentUploaded ({ file, xhr }) {
      this.$emit('uploaded', { file, xhr });
    },
    getDocument (doc) {
      return get(doc, 'link') || '';
    },
    async downloadDoc (doc) {
      return openURL(this.getDocument(doc));
    },
    failMsg () {
      return NotifyNegative('Echec de l\'envoi du document.');
    },
    rejected (errors) {
      for (const error of errors) {
        if (error.failedPropValidation === 'max-file-size') NotifyNegative('Fichier trop volumineux.');
      }
    },
  },
};
</script>

<style lang="sass" scoped>
.files-container
  width: 100%
  background-color: white
  align-items: center
  padding: 8px
  margin-bottom: 16px

.doc-thumbnail
  padding: 13px 0px 40px 12px

:deep(.q-field__control)
  height: 40px
  min-height: 40px
  border: 0

:deep(.q-uploader__header)
  border-radius: 4px

:deep(.q-field__append)
  display: none
:deep(.q-field__bottom)
  color: $secondary
  padding-top: 3px

:deep(.q-uploader)
  width: 100%
  :deep(.q-uploader--bordered)
    border: 1px solid $navy-20
  .q-uploader__list
    display: none
  .q-uploader__header-content
    border-radius: 3px
    height: 38px
    margin: 0
    > div:nth-child(1)
      height: 100%
      margin-top: 0
      margin-left: 0
    .q-btn__content
      color: $petrol-80
  .q-btn
    margin: 0
    padding: 0
  .col
    margin: 0
  .q-uploader__title
    font-weight: 400
    overflow: initial
  .q-uploader__subtitle
    display: none
    height: 0
  .q-uploader__header:before
    opacity:0
</style>
