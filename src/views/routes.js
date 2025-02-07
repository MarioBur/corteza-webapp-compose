// public route builder/helper
function r (name, path, component) {
  return {
    path,
    name,
    component: () => import('./' + component + '.vue'),
    props: true,
  }
}

export default [
  {
    name: 'root',
    path: '',
    component: () => import('./Layout.vue'),
    redirect: 'namespaces',
    children: [
      r('namespaces', '/namespaces', 'Namespaces'),
      r('namespace.create', '/admin/namespaces/create', 'Admin/Namespaces/Edit'),
      r('namespace.edit', '/admin/namespaces/edit/:namespaceID', 'Admin/Namespaces/Edit'),
      {
        ...r('namespace', '/ns/:slug', 'Namespace'),
        redirect: { name: 'pages' },

        children: [
          {
            ...r('pages', 'pages', 'Public/Index'),
            children: [
              {
                ...r('page', ':pageID?', 'Public/Pages/View'),

                children: [
                  r('page.record.edit', 'record/:recordID/edit', 'Public/Pages/Records/Edit'),
                  r('page.record', 'record/:recordID', 'Public/Pages/Records/View'),
                  r('page.record.create', 'record', 'Public/Pages/Records/Create'),
                ],
              },
            ],
          },
          {
            ...r('admin', 'admin', 'Admin/Index'),
            redirect: { name: 'admin.modules' },

            children: [
              r('admin.modules', 'modules', 'Admin/Modules/Index'),
              r('admin.modules.create', 'modules/new', 'Admin/Modules/Edit'),
              r('admin.modules.edit', 'modules/:moduleID/edit', 'Admin/Modules/Edit'),
              r('admin.modules.record.list', 'modules/:moduleID/record/list', 'Admin/Modules/Records/List'),
              r('admin.modules.record.view', 'modules/:moduleID/record/:recordID', 'Admin/Modules/Records/View'),
              r('admin.modules.record.create', 'modules/:moduleID/record', 'Admin/Modules/Records/Create'),
              r('admin.modules.record.edit', 'modules/:moduleID/record/:recordID/edit', 'Admin/Modules/Records/Edit'),

              r('admin.pages', 'pages', 'Admin/Pages/Index'),
              r('admin.pages.edit', 'pages/:pageID/edit', 'Admin/Pages/Edit'),
              r('admin.pages.builder', 'pages/:pageID/builder', 'Admin/Pages/Builder'),

              r('admin.charts', 'charts', 'Admin/Charts/Index'),
              r('admin.charts.create', 'charts/new/:category?', 'Admin/Charts/Edit'),
              r('admin.charts.edit', 'charts/:chartID/edit', 'Admin/Charts/Edit'),

              r('admin.configuration', 'configuration', 'Admin/Configuration/Index'),
            ],
          },

          { path: '*', redirect: { name: 'pages' } },
        ],
      },
    ],
  },

  // Help site for field expressions
  { name: 'field.expressions.help', path: '/field-expressions-help', component: () => import('../components/Common/Module/ExpressionsHelp.vue') },

  // When everything else fails, go to namespaces
  { path: '*', redirect: { name: 'root' } },
]
