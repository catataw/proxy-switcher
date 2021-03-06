'use strict';

if (/Firefox/.test(navigator.userAgent)) {
  chrome.proxy = {
    callbacks: [],
    errors: []
  };
  chrome.storage.onChanged.addListener(ps => {
    if (ps['ffcurent']) {
      chrome.proxy.callbacks.forEach(c => c(ps['ffcurent'].newValue));
    }
  });

  chrome.proxy.onProxyError = {
    addListener: c => chrome.proxy.errors.push(c)
  };
  chrome.proxy.settings = {};
  chrome.proxy.settings.get = (prop, callback) => chrome.storage.local.get({
    'ffcurent': {
      value: {
        mode: 'system'
      }
    }
  }, prefs => callback(prefs['ffcurent']));

  chrome.proxy.settings.onChange = {
    addListener: c => chrome.proxy.callbacks.push(c)
  };

  chrome.proxy.settings.set = async(config, callback = function() {}) => {
    const proxySettings = {};

    if (config.value.mode === 'direct') {
      proxySettings.proxyType = 'none';
    }
    else if (config.value.mode === 'system') {
      proxySettings.proxyType = 'system';
    }
    else if (config.value.mode === 'auto_detect') {
      proxySettings.proxyType = 'autoDetect';
    }
    else if (config.value.mode === 'fixed_servers') {
      const rules = config.value.rules;
      proxySettings.proxyType = 'manual';

      if (rules.proxyForHttp.scheme.startsWith('socks')) {
        proxySettings.socks = (rules.proxyForHttps.host + ':' + rules.proxyForHttps.port)
          .replace(/.*:\/\//, '');
        proxySettings.socksVersion = rules.proxyForHttp.scheme === 'socks5' ? 5 : 4;
      }
      else {
        if (rules.proxyForFtp.host && rules.proxyForFtp.port) {
          proxySettings.ftp = (rules.proxyForFtp.host + ':' + rules.proxyForFtp.port).trim();
          if (proxySettings.ftp.indexOf('://') === -1) {
            proxySettings.ftp = rules.proxyForFtp.scheme + '://' + proxySettings.ftp;
          }
        }
        if (rules.proxyForHttp.host && rules.proxyForHttp.port) {
          proxySettings.http = (rules.proxyForHttp.host + ':' + rules.proxyForHttp.port).trim();
          if (proxySettings.http.indexOf('://') === -1) {
            proxySettings.http = rules.proxyForHttp.scheme + '://' + proxySettings.http;
          }
        }
        if (rules.proxyForHttps.host && rules.proxyForHttps.port) {
          proxySettings.ssl = (rules.proxyForHttps.host + ':' + rules.proxyForHttps.port).trim();
          if (proxySettings.ssl.indexOf('://') === -1) {
            proxySettings.ssl = rules.proxyForHttps.scheme + '://' + proxySettings.ssl;
          }
        }
      }
      if (config.value.remoteDNS) {
        proxySettings.proxyDNS = true;
      }
      if (config.value.noPrompt) {
        proxySettings.autoLogin = true;
      }
      if (rules.bypassList.length) {
        proxySettings.passthrough = rules.bypassList.join(', ');
      }
    }
    else if (config.value.mode === 'pac_script') {
      proxySettings.proxyType = 'autoConfig';
      proxySettings.autoConfigUrl = config.value.pacScript.url;
    }
    // console.log(proxySettings);
    await browser.browserSettings.proxyConfig.clear({});
    browser.browserSettings.proxyConfig.set({value: proxySettings}, () => {
      const lastError = chrome.runtime.lastError;
      if (chrome.runtime.lastError) {
        chrome.proxy.errors.forEach(c => c(lastError));
      }
    });

    await browser.storage.local.set({
      'ffcurent': {
        value: config.value
      }
    });
    callback();
  };
}
