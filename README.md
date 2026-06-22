# 天氣查詢系統 (範例)

這個範例專案提供一個簡單的前端網頁，可查詢城市天氣，並將結果透過 Google Apps Script 存入 Google 試算表。

檔案
- [index.html](index.html)
- [style.css](style.css)
- [script.js](script.js)
- [gas/saveToSheet.gs](gas/saveToSheet.gs)

快速說明
1. 取得 OpenWeatherMap API Key（免費帳號即可）並填入 `script.js` 的 `OPENWEATHERMAP_KEY`。
2. 建立一個 Google 試算表，取得試算表 ID，填入 `gas/saveToSheet.gs` 的 `SPREADSHEET_ID`。
3. 在 Google Apps Script 編輯器貼上 `gas/saveToSheet.gs` 的內容，並部署為 Web App（取得部署後的 URL），將該 URL 填入 `script.js` 的 `GAS_URL`。
	- 建議部署權限為「任何人（包含未登入者）」或依需求設定（若為受限內部使用，可選擇已登入的 Google 帳號）。
4. 開啟 `index.html`（直接用瀏覽器開啟或用簡易靜態伺服器），輸入城市名稱後按「查詢」，即可看到天氣資料。

注意事項
- `script.js` 中有兩個 TODO 欄位：`OPENWEATHERMAP_KEY`、`GAS_URL`。請務必替換。
- `gas/saveToSheet.gs` 中有 `SPREADSHEET_ID`，需替換為你的試算表 ID。
- 若想保護金鑰，不建議將 `OPENWEATHERMAP_KEY` 放在公開的前端程式中；生產環境請透過後端代理或環境變數保護。

部署 / 測試建議命令
使用 Python 提供靜態伺服器於本機測試：
```bash
python3 -m http.server 8000
# 然後在瀏覽器開啟 http://localhost:8000/index.html
```

GAS 部署重點
- 在 Apps Script 編輯器中選擇「部署」→「新建立部署」→ 類型選擇「網路應用程式」，確定 `doPost` 可被呼叫。
- 部署後會取得一組 URL，貼到 `script.js` 的 `GAS_URL`。

如需我幫你：
- 生成範例 Sheet 格式或示範如何在 Apps Script 裡用 Properties 儲存 ID。想要我做哪一項？

詳細：Google Apps Script (GAS) 部署步驟
1. 開啟 Google Apps Script 編輯器：點開 https://script.google.com/ 並建立一個新專案。
2. 在專案的 Code.gs（或新增檔案）貼上 `gas/saveToSheet.gs` 的內容，並修改 `SPREADSHEET_ID` 為你要寫入的試算表 ID（或稍後使用 Properties 儲存）。
	- 取得試算表 ID：打開你的 Google 試算表，網址形如 `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`，複製 `<SPREADSHEET_ID>`。

	註：本範例建議使用 Script Properties 儲存 `SPREADSHEET_ID` 與 `OPENWEATHERMAP_KEY`。兩種設定方式：

	A) 手動設定（推薦）
	- 在 Apps Script 編輯器中，前往「專案設定 / Project properties」-> Script properties，新增：
	  - `SPREADSHEET_ID` = <你的試算表 ID>
	  - `OPENWEATHERMAP_KEY` = <你的 OpenWeatherMap API Key>

	B) 使用程式設定（可在編輯器執行）：
	- 在 `gas/saveToSheet.gs` 中有 `setConfig(spreadsheetId, apiKey)`，你可以在 Apps Script 編輯器的即時執行器中呼叫，例如：
```js
// 在 Apps Script 編輯器輸入並執行一次
setConfig('your-spreadsheet-id', 'your-openweathermap-key');
```

設：若要增加簡單驗證，`setConfig` 也支援第三個參數 `sharedSecret`，會把它存入 `SHARED_SECRET`（Script Properties）。例如：
```js
// 同時設定 shared secret
setConfig('your-spreadsheet-id', 'your-openweathermap-key', 'a-strong-token');
```

若你設定了 `SHARED_SECRET`，請在前端 `script.js` 的 `SHARED_TOKEN` 變數填入相同 token，以便前端把 `token` 欄位一起送出供 GAS 驗證。

3. 儲存專案後，選擇「部署」→「新增部署」（或「部署」→「管理部署」→「新增部署」）。
4. 部署類型選擇「網路應用程式（Web app）」。設定：
	- 「執行身份（Execute as）」: 選 `Me`（由你的帳號執行，Apps Script 將有權限寫入你有存取權的試算表）。
	- 「誰有權存取（Who has access）」: 視需求選擇：
	  - 若要允許前端直接呼叫而不需登入：選擇 "Anyone" / "Anyone, even anonymous"（某些 G Suite 帳號或組織可能無此選項）。
	  - 若僅允許登入者：選擇 "Anyone with Google account" 或其他較嚴格權限。
5. 點選部署後會顯示一個 Web App URL，複製並貼到 `script.js` 的 `GAS_URL`。
6. 初次部署可能會要求授權（授予 Spreadsheet 權限），請依提示授權。

測試流程
- 在試算表中建立一個工作表（預設為 Sheet1），或上傳並使用本專案的 [sample_sheet.csv](sample_sheet.csv) 作為欄位範例。
- 確認 `script.js` 的 `OPENWEATHERMAP_KEY` 與 `GAS_URL` 已填寫。
- 在本機啟動靜態伺服器並開啟 `index.html`：
```bash
python3 -m http.server 8000
# 打開 http://localhost:8000/index.html
```
- 輸入城市名稱按查詢，成功後前端會顯示天氣，同時會向 GAS 發送 POST 請求；在試算表中應會看到新增的一列（含時間戳與天氣欄位）。

重要：若前端出現 CORS 或 401/403，請確認 GAS 部署時「誰有權存取」設定為允許匿名（Anyone）或至少允許有權限的帳號。若選擇需要登入的權限，前端呼叫需改為經由後端或使用 OAuth 授權流程。

除錯小技巧
- 若試算表無新增紀錄：打開 Apps Script 的「執行記錄」或在 `doPost` 中加入 `Logger.log(payload)`，在 Apps Script 編輯器中查看日誌。
- 若前端收到 CORS 或 401/403 錯誤：請檢查 GAS 部署權限與是否選擇正確的 `Who has access` 選項；若選擇需要登入的權限，前端也必須以授權方式呼叫（需更多進階流程）。

範例試算表範本
- 已在專案內新增 [sample_sheet.csv](sample_sheet.csv) 作為範例欄位：`Timestamp,City,Temp,Description,Humidity,Wind`。

GAS doGet 測試頁面
- 本專案已新增一個簡單的 doGet 測試頁面（`gas/doGet.html`），部署為 Web App 後直接以瀏覽器開啟 Web App 的 URL 即可看到測試介面。
- 使用方法：開啟 Web App URL（GET），在頁面輸入城市並按下「發送測試查詢」，頁面會向同一 URL 發出 POST，並顯示 GAS 呼叫 OpenWeatherMap 的回傳結果，同時 GAS 會把資料寫入你設定的試算表。
- 若要使用此測試頁面，請確保你已在 Script Properties 或使用 `setConfig` 設定 `SPREADSHEET_ID` 與 `OPENWEATHERMAP_KEY`，且 Web App 部署時允許存取（例如 Anyone, even anonymous）。


還需要我幫你做的項目
- 自動化：把 `SPREADSHEET_ID` 放到 Apps Script 的 `PropertiesService`（我可以幫你改寫 `saveToSheet.gs`）。
- 安全性：示範如何用 Apps Script 建立一個簡易後端，將 OpenWeatherMap Key 放在 Apps Script 上，而非前端（避免在前端暴露 Key）。

                                                        