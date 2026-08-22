(function (global) {
  function getTenantIdFromHost(hostname) {
    try {
      let host = hostname;
      if (!host && typeof global !== 'undefined' && global.location) {
        host = global.location.hostname || '';
      }
      host = (host || '').toString();
      if (!host) return 'futurevip';

      if (host.includes('localhost')) {
        host = 'futurevip.vercel.app';
      }

      host = host.split(':')[0].toLowerCase();

      if (host.endsWith('.vercel.app')) {
        return host.replace(/\.vercel\.app$/i, '');
      }

      if (host.indexOf('.') !== -1) {
        return host.split('.')[0];
      }

      return host;
    } catch (error) {
      return 'futurevip';
    }
  }

  global.getTenantIdFromHost = getTenantIdFromHost;
})(window);
