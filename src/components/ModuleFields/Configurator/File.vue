<template>
  <div>
    <b-form-group horizontal
                  :description="$t('field.kind.file.view.modeFootnote')"
                  :label="$t('field.kind.file.view.modeLabel')">
      <b-form-radio-group v-model="f.options.mode"
                          buttons
                          button-variant="outline-secondary"
                          size="sm"
                          name="buttons2"
                          :options="modes">
      </b-form-radio-group>
    </b-form-group>
    <b-form-checkbox
      :disabled="!enableFileNameHiding"
      v-model="f.options.hideFileName"
    >
      {{ $t('field.kind.file.view.showName') }}
    </b-form-checkbox>
  </div>
</template>

<script>
import base from './base'

export default {
  extends: base,

  computed: {
    modes () {
      return [
        { value: 'list', text: this.$t('field.kind.file.view.list') },
        { value: 'grid', text: this.$t('field.kind.file.view.grid') },
        { value: 'single', text: this.$t('field.kind.file.view.single') },
        { value: 'gallery', text: this.$t('field.kind.file.view.gallery') },
      ]
    },

    enableFileNameHiding () {
      return (this.f.options.mode === 'single') || (this.f.options.mode === 'gallery')
    },
  },
}
</script>
