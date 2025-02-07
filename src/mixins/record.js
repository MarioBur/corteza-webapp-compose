// This mixin is used on View component of Records.

import { compose, validator, NoID } from '@cortezaproject/corteza-js'
import { mapGetters, mapActions } from 'vuex'

export default {
  data () {
    return {
      inEditing: false,
      processing: false,
      record: undefined,
      errors: new validator.Validated(),
    }
  },

  computed: {
    ...mapGetters({
      getModuleByID: 'module/getByID',
    }),

    validator () {
      if (!this.module) {
        throw new Error('can not initialize record validator without module')
      }

      return new compose.RecordValidator(this.module)
    },

    isValid () {
      return this.errors.valid()
    },

    /**
     * Tells if given record is deleted; If record not provided, returns undefined
     * @returns {Boolean|undefined}
     */
    isDeleted () {
      if (!this.record) {
        return
      }
      return !!this.record.deletedAt
    },
  },

  methods: {
    ...mapActions({
      updatePrompts: 'wfPrompts/update',
    }),

    /**
     * Handle form submit for record create & update
     *
     *  -> dispatch beforeFormSubmit (on ui:compose:record-page)
     *  -> validate record (see validateRecord())
     *     -> stop on errors
     *  -> send record to the API
     *  -> apply changes received from the API to current record
     *  -> dispatch afterFormSubmit
     *  -> redirect user to record viewer page
     *
     * @returns {Promise<void>}
     */
    async handleFormSubmit (route = 'page.record') {
      this.processing = true
      const isNew = this.record.recordID === NoID
      const queue = []

      // Collect records from all record lines
      this.page.blocks.forEach((b, index) => {
        if (b.kind === 'RecordList' && b.options.editable) {
          const p = new Promise((resolve) => {
            this.$root.$emit(`record-line:collect:${this.page.pageID}-${(this.record || {}).recordID || '0'}-${index}`, resolve)
          })

          queue.push(p)
        }
      })
      const pairs = await Promise.all(queue)

      for (const p of pairs) {
        if (p.positionField) {
          let i = 0
          for (const item of p.items) {
            if (!item.r.deletedAt) {
              item.r.values[p.positionField] = i++
            }
          }
        }
      }

      // Construct batch record payload
      const records = pairs.reduce((acc, cur) => {
        acc.push({
          refField: cur.refField,
          set: cur.items
            .map(({ r }) => r)
            .filter(({ deletedAt, recordID }) => recordID !== NoID || !deletedAt),
          module: cur.module,
          idPrefix: cur.idPrefix,
        })
        return acc
      }, [])

      // Filter out read-only fields from values
      this.module.fields.forEach(({ name, canUpdateRecordValue }) => {
        if (!canUpdateRecordValue) {
          delete this.record.values[name]
        }
      })

      const { recordID = NoID } = this.record || {}
      // Append after the payload construction, so it is not presented as a
      // sub record.
      pairs.push({
        module: this.module,
        items: [{ r: this.record, id: recordID === NoID ? 'parent:0' : recordID }],
      })

      return this
        .dispatchUiEvent('beforeFormSubmit', this.record, { $records: records })
        .then(() => this.validateRecord(pairs))
        .then(() => {
          if (isNew) {
            return this.$ComposeAPI.recordCreate({ ...this.record, records })
          } else {
            return this.$ComposeAPI.recordUpdate({ ...this.record, records })
          }
        })
        .catch(err => {
          const { details = undefined } = err
          if (!!details && Array.isArray(details) && details.length > 0) {
            this.errors = new validator.Validated()
            this.errors.push(...details)

            console.debug(this.errors)

            throw new Error(this.$t('notification.record.validationErrors'))
          }

          throw err
        })
        .then((record) => this.record.apply(record))
        .then(() => this.dispatchUiEvent('afterFormSubmit', this.record, { $records: records }))
        .then(() => this.updatePrompts())
        .then(() => {
          this.$router.push({ name: route, params: { ...this.$route.params, recordID: this.record.recordID } })
        })
        .catch(this.toastErrorHandler(this.$t(
          isNew
            ? 'notification.record.createFailed'
            : 'notification.record.updateFailed',
        )))
        .finally(() => {
          this.processing = false
        })
    },

    /**
     * Handle form submit for record browser
     * @returns {Promise<void>}
     */
    handleFormSubmitSimple (route = 'page.record') {
      const isNew = this.record.recordID === NoID

      return this
        .dispatchUiEvent('beforeFormSubmit')
        .then(() => this.validateRecordSimple())
        .then(() => {
          if (isNew) {
            return this.$ComposeAPI.recordCreate(this.record)
          } else {
            return this.$ComposeAPI.recordUpdate(this.record)
          }
        })
        .catch(err => {
          const { details = undefined } = err
          if (!!details && Array.isArray(details) && details.length > 0) {
            this.errors.push(...details)

            console.debug(this.errors)

            throw new Error(this.$t('notification.record.validationErrors'))
          }

          throw err
        })
        .then((record) => this.record.apply(record))
        .then(() => this.dispatchUiEvent('afterFormSubmit'))
        .then(() => this.updatePrompts())
        .then(() => {
          this.$router.push({ name: route, params: { ...this.$route.params, recordID: this.record.recordID } })
        })
        .catch(this.toastErrorHandler(this.$t(
          isNew
            ? 'notification.record.createFailed'
            : 'notification.record.updateFailed',
        )))
    },

    /**
     * On delete, preserve user's view. Show a notification that the record
     * has been deleted.
     */
    handleDelete () {
      return this
        .dispatchUiEvent('beforeDelete')
        .then(() => this.$ComposeAPI.recordDelete(this.record))
        .then(() => {
          this.record.deletedAt = (new Date()).toISOString()
        })
        .then(() => this.dispatchUiEvent('afterDelete'))
        .then(() => this.updatePrompts())
        .catch(this.toastErrorHandler(this.$t('notification.record.deleteFailed')))
    },

    /**
     * Validates record and dispatches onFormSubmitError
     *
     * onFormSubmitError is dispatched only if there are record errors,
     * if not, we continue with form submit handling
     *
     * After onFormSubmitError, record is re-validated and if errors
     * are still present, we stop form submit handing
     *
     * @returns {Promise<void>}
     */
    async validateRecord (pairs) {
      // Cache validators for later use
      const validators = {}
      for (const p of pairs) {
        validators[p.module.resourceID] = validators[p.module.resourceID] || new compose.RecordValidator(p.module)
      }

      const vRunner = () => {
        // Reset errors
        this.errors = new validator.Validated()

        // validate
        for (const p of pairs) {
          const v = validators[p.module.resourceID]
          const errs = new validator.Validated()

          p.items.forEach(({ r, id }) => {
            if (r.deletedAt) {
              return
            }
            const err = v.run(r)
            if (!err.valid()) {
              err.applyMeta({ id })
              errs.push(...err.set)
            }
          })
          this.errors.push(...errs.set)
        }
      }

      vRunner()
      if (this.errors.valid()) {
        return
      }

      await this.dispatchUiEvent('onFormSubmitError')
      vRunner()
      if (!this.errors.valid()) {
        console.debug(this.errors)
        throw new Error(this.$t('notification.record.validationErrors'))
      }
    },

    /**
     * Validates record browser record
     *
     * @returns {Promise<void>}
     */
    async validateRecordSimple () {
      this.errors = this.validator.run(this.record)
      if (this.errors.valid()) {
        return
      }

      await this.dispatchUiEvent('onFormSubmitError')

      this.errors = this.validator.run(this.record)
      if (!this.errors.valid()) {
        console.debug(this.errors)
        throw new Error(this.$t('notification.record.validationErrors'))
      }
    },

    /**
     * Returns errors, filtered for a specific field
     * @param name
     * @returns {validator.Validated} filtered validation results
     */
    fieldErrors (name) {
      if (!this.errors) {
        return new validator.Validated()
      }

      return this.errors.filterByMeta('field', name)
    },

    /**
     * Generic event dispatcher for ui:compose:record-page resource type
     *
     * This is used when deleting, updating, creating
     * records and where validation errors occur
     *
     * @param eventType
     */
    dispatchUiEvent (eventType, record = this.record, args = {}) {
      const resourceType = `ui:compose:${this.getUiEventResourceType || 'record-page'}`

      const argsBase = {
        errors: this.errors,
        validator: this.validator,
        ...args,
      }

      return this
        .$EventBus
        .Dispatch(compose.RecordEvent(
          record, { eventType, resourceType, args: argsBase }))
    },
  },
}
