import { defineMock } from 'vite-plugin-mock-dev-server'

let formSubmission: any;

export default defineMock([
  {
    url: '/api/form/submit',
    method: 'POST',
    body(request) {
      formSubmission = request;
      return { request };
    }
  },
  {
    url: '/api/form/view',
    method: 'GET',
    body: {
      formSubmission
    }
  }
])