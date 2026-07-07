const fs = require('fs');
const vm = require('vm');
fetch('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js').then(r => r.text()).then(code => {
  const sandbox = { window: {}, document: {}, console: console };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  console.log("Keys in sandbox:", Object.keys(sandbox));
  console.log("Type of Chart:", typeof sandbox.Chart);
});
