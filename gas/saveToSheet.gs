/**
 * 改良版 Apps Script：
 * - 使用 Script Properties 存放 `SPREADSHEET_ID` 與 `OPENWEATHERMAP_KEY`
 * - 前端發送城市名稱到此 Web App，GAS 呼叫 OpenWeatherMap，並把結果寫入試算表
 *
 * 使用步驟：
 * 1. 在 Apps Script 專案中，點選「專案內容/Project properties」-> Script properties，新增：
 *    - SPREADSHEET_ID = <你的試算表 ID>
 *    - OPENWEATHERMAP_KEY = <你的 OpenWeatherMap API Key>
 * 2. 或使用下面的 `setConfig(spreadsheetId, apiKey)` 函式來設定（在編輯器執行一次）。
 * 3. 部署為 Web App，並將生成的 URL 填入前端 `script.js` 的 `GAS_URL`。
 */

function setConfig(spreadsheetId, apiKey, sharedSecret) {
  const props = { SPREADSHEET_ID: spreadsheetId, OPENWEATHERMAP_KEY: apiKey };
  if (sharedSecret) props.SHARED_SECRET = sharedSecret;
  PropertiesService.getScriptProperties().setProperties(props);
  return 'ok';
}

function getConfig() {
  const props = PropertiesService.getScriptProperties().getProperties();
  return {
    SPREADSHEET_ID: props.SPREADSHEET_ID,
    OPENWEATHERMAP_KEY: props.OPENWEATHERMAP_KEY
  };
}

function getSecret() {
  const props = PropertiesService.getScriptProperties().getProperties();
  return props.SHARED_SECRET || null;
}

function doPost(e) {
  try {
    const cfg = getConfig();
    if (!cfg.SPREADSHEET_ID || !cfg.OPENWEATHERMAP_KEY) {
      throw new Error('請先在 Script Properties 設定 SPREADSHEET_ID 與 OPENWEATHERMAP_KEY');
    }
    // 支援 JSON 與 form-url-encoded 的解析
    let payload = {};
    if (e.postData && e.postData.type && e.postData.type.indexOf('application/json') !== -1) {
      payload = JSON.parse(e.postData.contents || '{}');
    } else if (e.parameter && Object.keys(e.parameter).length) {
      payload = e.parameter; // Apps Script 會自動解析表單/URL-encoded 的欄位到 e.parameter
    } else if (e.postData && e.postData.contents) {
      // 其他情況嘗試解析為 querystring
      try {
        const params = {};
        e.postData.contents.split('&').forEach(function(pair){
          const parts = pair.split('=');
          params[decodeURIComponent(parts[0])] = parts[1] ? decodeURIComponent(parts[1].replace(/\+/g,' ')) : '';
        });
        payload = params;
      } catch (ex) {
        payload = {};
      }
    }
    const city = payload.city;
    if (!city) throw new Error('缺少 city 欄位');

    // 驗證 shared secret（從 form 或 JSON 的 token 欄位接收）
    const incomingToken = (payload && payload.token) || (e.parameter && e.parameter.token) || '';
    const shared = getSecret();
    if (shared) {
      if (!incomingToken || incomingToken !== shared) {
        return ContentService.createTextOutput(JSON.stringify({status: 'error', message: '未授權的 token'})).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 簡易速率限制：每個 token 每分鐘最多 60 次
    try {
      const cache = CacheService.getScriptCache();
      const key = 'rl_' + (incomingToken || 'anon');
      const cur = cache.get(key);
      let count = cur ? parseInt(cur, 10) : 0;
      if (count >= 60) {
        return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'rate limit'})).setMimeType(ContentService.MimeType.JSON);
      }
      count += 1;
      cache.put(key, String(count), 60); // 存 60 秒
    } catch (ex) {
      // 若 CacheService 發生問題，不阻擋主程序
    }

    // 呼叫 OpenWeatherMap
    const apiUrl = 'https://api.openweathermap.org/data/2.5/weather?q=' + encodeURIComponent(city) + '&units=metric&appid=' + cfg.OPENWEATHERMAP_KEY + '&lang=zh_tw';
    const resp = UrlFetchApp.fetch(apiUrl, {muteHttpExceptions: true});
    const code = resp.getResponseCode();
    const body = resp.getContentText();
    if (code !== 200) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', code: code, body: body})).setMimeType(ContentService.MimeType.JSON);
    }
    const data = JSON.parse(body);

    // 寫入試算表
    const ss = SpreadsheetApp.openById(cfg.SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Sheet1') || ss.getSheets()[0];
    const now = new Date();
    const row = [now, data.name || city, data.main ? data.main.temp : '', data.weather && data.weather[0] ? data.weather[0].description : '', data.main ? data.main.humidity : '', data.wind ? data.wind.speed : ''];
    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({status: 'ok', data: data})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    return HtmlService.createHtmlOutputFromFile('doGet').setTitle('GAS Weather Test');
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'ok', message: 'Web App is running'})).setMimeType(ContentService.MimeType.JSON);
  }
}
