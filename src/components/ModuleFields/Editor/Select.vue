<template>
  <b-form-group
    label-class="text-primary"
    :class="formGroupStyleClasses"
  >
    <template #label>
      <div
        v-if="!valueOnly"
        class="d-flex align-items-top"
      >
        <label
          class="mb-0"
        >
          {{ label }}
        </label>

        <hint
          :text="hint"
          :id="field.fieldID"
        />
      </div>
      <small
        class="form-text font-weight-light text-muted"
      >
        {{ description }}
      </small>
    </template>

    <template v-if="field.isMulti">
      <multi :value.sync="value" :singleInput="field.options.selectType !== 'each'">
        <template v-slot:single>
          <b-form-select v-if="field.options.selectType === 'default'" @change="selectChange" :options="selectOptions" ref="singleSelect" >
            <template slot="first"><option disabled :value="undefined">{{ $t('field.kind.select.placeholder') }}</option></template>
          </b-form-select>
          <b-form-select v-if="field.options.selectType === 'multiple'" :options="selectOptions" v-model="value" :select-size="6" multiple />
        </template>
        <template v-slot:default="ctx">
          <b-form-select v-if="field.options.selectType === 'each'" :options="selectOptions" v-model="value[ctx.index]" />
          <span v-else>{{ findLabel(value[ctx.index]) }}</span>
        </template>
      </multi>
      <errors :errors="errors" />
    </template>

    <template
      v-else
    >
      <b-form-select
        :options="selectOptions"
        v-model="value" />
      <errors :errors="errors" />
    </template>
  </b-form-group>
</template>
<script>
import base from './base'

export default {
  extends: base,

  computed: {
    selectOptions () {
      return this.field.options.options
    },
  },

  methods: {
    selectChange (value) {
      this.value.push(value)
      // Reset select
      this.$refs.singleSelect.localValue = undefined
    },

    /**
     * Helper to resolve a label for a gievn value
     * @param {String} v Value in question
     * @returns {String}
     */
    findLabel (v) {
      return (this.selectOptions.find(({ value }) => value === v) || {}).text || v
    },
  },
}
</script>
