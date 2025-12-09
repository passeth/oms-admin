
const ZONE = 'BC';
const API_KEY = '3a1d75b7358ad4b4ea7b78f4b5bc142c23';
const COM_CODE = '81331';
const USER_ID = 'A11502';

async function testErp() {
    try {
        // 1. Login
        const loginUrl = `https://oapi${ZONE}.ecount.com/OAPI/V2/OAPILogin`;
        const loginPayload = {
            COM_CODE,
            USER_ID,
            API_CERT_KEY: API_KEY,
            LAN_TYPE: "ko-KR",
            ZONE
        };

        console.log('Logging in...');
        const loginRes = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginPayload)
        });

        const loginData = await loginRes.json();
        console.log('Login Result:', JSON.stringify(loginData, null, 2));

        if (String(loginData.Status) !== '200') {
            throw new Error('Login failed');
        }

        const sessionId = loginData.Data.Datas.SESSION_ID;
        const hostUrl = loginData.Data.Datas.HOST_URL || `oapi${ZONE}.ecount.com`;
        const setCookie = loginData.Data.Datas.SET_COOKIE;
        
        console.log('Session ID:', sessionId);
        console.log('Host URL:', hostUrl);
        console.log('Set Cookie:', setCookie);

        // 2. Fetch Stock
        const baseUrl = hostUrl.startsWith('http') ? hostUrl : `https://${hostUrl}`;
        const stockUrl = `${baseUrl}/OAPI/V2/InventoryBalance/GetListInventoryBalanceStatusByLocation?SESSION_ID=${sessionId}`;
        
        // Use today's date in YYYYMMDD format
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const baseDate = `${yyyy}${mm}${dd}`;
        
        console.log('Base Date:', baseDate);

        const stockPayload = {
            PROD_CD: "",
            WH_CD: "W106",
            BASE_DATE: baseDate
        };

        console.log('Fetching Stock URL:', stockUrl);
        console.log('Payload:', JSON.stringify(stockPayload));
        console.log('Headers:', JSON.stringify({
            'Content-Type': 'application/json',
            'Cookie': setCookie || `SESSION_ID=${sessionId}`
        }));

        const stockRes = await fetch(stockUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': setCookie || `SESSION_ID=${sessionId}`
            },
            body: JSON.stringify(stockPayload)
        });

        console.log('Stock Response Status:', stockRes.status, stockRes.statusText);
        const text = await stockRes.text();
        console.log('Stock Response Text (First 1000 chars):', text.substring(0, 1000));
        
        try {
            const stockData = JSON.parse(text);
            console.log('Stock Result Data:', JSON.stringify(stockData, null, 2));
        } catch (e) {
            console.error('Failed to parse JSON:', e);
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

testErp();
