export const environment = {
  production: true,

  apiBaseUrl: '/cgi/APPSEDSPCH?SEPGM=',

  endpoints: {
    login: 'APILOGIN',
    platformAdmins: 'APIPADMIN',
    tenantPartners: 'APITENANTP',
    auditLog: 'APIAUDIT',
    tpSettings: 'APITPSTNGS',
    tpUsers: 'APITPUSERS',
    products: 'APIPRODUCT',
    productOptions: 'APIOPTIONS',
    productSkus: 'APISKUS',
    brands: 'APIBRANDS',
    categories: 'APICATEGS',
    productImages: 'APIPRDIMGS',
    imageUpload: '/cgi/SEPIMGUPL',
    tpAddresses: 'APITPADDR',
  },
};