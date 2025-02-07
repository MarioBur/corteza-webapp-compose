<template>
  <div class="py-3">
    <b-container fluid>
      <b-row no-gutters>
        <b-col xl="8" offset-xl="2">
          <b-card no-body
                  class="shadow-sm"
          >
            <b-card-header header-bg-variant="white"
                           class="py-3"
            >
              <h1 class="mb-3">
                {{ $t('chart.title') }}
              </h1>
              <b-row
                class="align-items-center justify-content-between"
                no-gutters
              >
                <div class="text-nowrap flex-grow-1">
                  <b-dropdown
                    v-if="namespace.canCreateChart"
                    variant="primary"
                    size="lg"
                    class="float-left mr-1"
                    :text="$t('block.chart.add')"
                    >
                      <b-dropdown-item-button
                        variant="dark"
                        @click="$router.push({ name: 'admin.charts.create', params: { category: 'generic' } })"
                      >
                        {{ $t('block.chart.addGeneric') }}
                      </b-dropdown-item-button>
                      <b-dropdown-item-button
                        variant="dark"
                        @click="$router.push({ name: 'admin.charts.create', params: { category: 'funnel' } })"
                      >
                        {{ $t('block.chart.addFunnel') }}
                      </b-dropdown-item-button>
                      <b-dropdown-item-button
                        variant="dark"
                        @click="$router.push({ name: 'admin.charts.create', params: { category: 'gauge' } })"
                      >
                        {{ $t('block.chart.addGauge') }}
                      </b-dropdown-item-button>
                    </b-dropdown>

                  <import
                    v-if="namespace.canCreateChart"
                    :namespace="namespace"
                    type="chart"
                    class="float-left mr-1"
                  />

                  <export
                    :list="charts"
                    type="chart"
                    class="float-left mr-1"
                  />
                  <c-permissions-button
                    v-if="namespace.canGrant"
                    resource="compose:chart:*"
                    :buttonLabel="$t('general.label.permissions')"
                    buttonVariant="light"
                    class="btn-lg"
                  />
                </div>
                <div class="flex-grow-1 mt-1">
                  <b-input-group>
                    <b-form-input
                      v-model.trim="query"
                      class="float-right mw-100"
                      type="search"
                      :placeholder="$t('chart.searchPlaceholder')" />
                    <b-input-group-append>
                      <b-input-group-text class="text-primary bg-white">
                        <font-awesome-icon
                          :icon="['fas', 'search']"
                        />
                      </b-input-group-text>
                    </b-input-group-append>
                  </b-input-group>
                </div>
              </b-row>
            </b-card-header>

            <b-card-body class="p-0">
              <b-table
                :fields="tableFields"
                :items="charts"
                :filter="query"
                :filter-included-fields="['handle', 'name']"
                @row-clicked="handleRowClicked"
                head-variant="light"
                tbody-tr-class="pointer"
                responsive
                hover
              >
                <template v-slot:cell(updatedAt)="{ item: c }">
                  {{ (c.updatedAt || c.createdAt) | locDateOnly }}
                </template>
                <template v-slot:cell(actions)="{ item: c }">
                  <c-permissions-button
                    v-if="c.canGrant"
                    :title="c.name"
                    :target="c.name"
                    :resource="'compose:chart:'+c.chartID"
                    link
                    class="btn px-2"
                  />
                </template>
              </b-table>
            </b-card-body>
          </b-card>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>
<script>
import { mapGetters, mapActions } from 'vuex'
import { compose } from '@cortezaproject/corteza-js'
import Import from 'corteza-webapp-compose/src/components/Admin/Import'
import Export from 'corteza-webapp-compose/src/components/Admin/Export'

export default {
  name: 'ChartList',

  components: {
    Import,
    Export,
  },

  props: {
    namespace: {
      type: Object,
      required: false,
    },
  },

  data () {
    return {
      query: '',

      newChart: new compose.Chart({}),
    }
  },

  computed: {
    ...mapGetters({
      charts: 'chart/set',
    }),

    tableFields () {
      return [
        {
          key: 'name',
          sortable: true,
          tdClass: 'align-middle pl-4 text-nowrap',
          thClass: 'pl-4',
        },
        {
          key: 'handle',
          sortable: true,
          tdClass: 'align-middle',
        },
        {
          key: 'updatedAt',
          sortable: true,
          tdClass: 'align-middle',
        },
        {
          key: 'actions',
          label: '',
          tdClass: 'text-right text-nowrap',
        },
      ]
    },
  },

  methods: {
    ...mapActions({
      createChart: 'chart/create',
    }),

    create (subType) {
      let c = new compose.Chart({ ...this.newChart, namespaceID: this.namespace.namespaceID })
      switch (subType) {
        case 'gauge':
          c = new compose.GaugeChart(c)
          break

        case 'funnel':
          c = new compose.FunnelChart(c)
          break
      }

      this.createChart(c).then((chart) => {
        this.$router.push({ name: 'admin.charts.edit', params: { chartID: chart.chartID } })
      }).catch(this.toastErrorHandler(this.$t('notification.chart.createFailed')))
    },
    handleRowClicked ({ chartID, canUpdateChart, canDeleteChart }) {
      if (!(canUpdateChart || canDeleteChart)) {
        return
      }
      this.$router.push({
        name: 'admin.charts.edit',
        params: { chartID },
        query: null,
      })
    },
  },
}
</script>
<style lang="scss" scoped>
$input-height: 42px;

.chart-name-input {
  height: $input-height;
}
</style>
