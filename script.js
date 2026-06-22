// 設定區：請填入已部署的 GAS Web App URL
// 注意：OpenWeatherMap 的 API Key 不再放在前端，請在 GAS 的 Script Properties 中設定 `OPENWEATHERMAP_KEY` 與 `SPREADSHEET_ID`。
const GAS_URL = 'YOUR_GAS_WEB_APP_URL'; // TODO: 換成你部署後的 Web App URL
// 若你在 GAS 設定了 SHARED_SECRET，請在此填入同樣的 token（前端會把 token 一併送出於表單欄位 token）
const SHARED_TOKEN = 'YOUR_SHARED_SECRET'; // TODO: 若未使用可留空 ''

const searchBtn = document.getElementById('searchBtn');
const cityInput = document.getElementById('cityInput');
const result = document.getElementById('result');

searchBtn.addEventListener('click', () => {
  const city = cityInput.value.trim();
  if (!city) return alert('請輸入城市名稱');
  getWeather(city);
});

async function getWeather(city) {
  if (!GAS_URL || GAS_URL === 'YOUR_GAS_WEB_APP_URL') return alert('請先在 script.js 設定 GAS_URL');
  try {
    // 使用 application/x-www-form-urlencoded 避免瀏覽器發送 CORS preflight
    const params = {city};
    if (SHARED_TOKEN) params.token = SHARED_TOKEN;
    const body = new URLSearchParams(params).toString();
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
      body: body
    });
    const json = await res.json();
    if (json.status !== 'ok') throw new Error(json.message || JSON.stringify(json));
    const data = json.data; // OpenWeatherMap 回傳的 data
    displayWeather(data);
  } catch (err) {
    alert('取得天氣失敗：' + err.message);
    console.error(err);
  }
}

function displayWeather(d) {
  if (!d) {
    alert('無效的天氣資料');
    return;
  }
  const cityName = d.name || '';
  const country = (d.sys && d.sys.country) ? d.sys.country : '';
  document.getElementById('cityName').textContent = cityName + (country ? (', ' + country) : '');
  const desc = d.weather && d.weather[0] ? d.weather[0].description : '';
  document.getElementById('description').textContent = desc;
  document.getElementById('temp').textContent = d.main && d.main.temp != null ? d.main.temp : '-';
  document.getElementById('humidity').textContent = d.main && d.main.humidity != null ? d.main.humidity : '-';
  document.getElementById('wind').textContent = d.wind && d.wind.speed != null ? d.wind.speed : '-';
  const icon = d.weather && d.weather[0] ? `https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png` : '';
  document.getElementById('icon').src = icon;
  result.classList.remove('hidden');
}

async function saveToGAS(payload) {
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log('GAS response:', text);
  } catch (err) {
    console.warn('送出到 GAS 失敗', err);
  }
}
