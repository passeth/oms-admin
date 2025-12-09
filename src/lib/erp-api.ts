export interface ErpStockItem {
    WH_CD: string;
    WH_DES: string;
    PROD_CD: string;
    PROD_DES: string;
    PROD_SIZE_DES: string;
    BAL_QTY: string; // API returns string "3.0000000000"
}

export interface ErpApiResponse {
    Data: {
        IsSuccess: boolean;
        Result: ErpStockItem[];
        TotalCnt: number;
        Error: any;
    };
    Status: string | number;
    Error: any;
    Errors?: any[];
}

const ZONE = process.env.ECOUNT_ZONE || 'BC';
const API_KEY = process.env.ECOUNT_API_KEY || '3a1d75b7358ad4b4ea7b78f4b5bc142c23';
const COM_CODE = process.env.ECOUNT_COM_CODE || '81331';
const USER_ID = process.env.ECOUNT_USER_ID || 'A11502';

interface LoginResponse {
    Data: {
        Datas: {
            SESSION_ID: string;
            HOST_URL?: string;
            SET_COOKIE?: string;
        };
    };
    Status: string | number;
    Error: any;
    Errors?: any[];
}

async function loginErp(): Promise<{ sessionId: string; hostUrl: string; setCookie?: string }> {
    const url = `https://oapi${ZONE}.ecount.com/OAPI/V2/OAPILogin`;
    const payload = {
        COM_CODE: COM_CODE,
        USER_ID: USER_ID,
        API_CERT_KEY: API_KEY,
        LAN_TYPE: "ko-KR",
        ZONE: ZONE
    };

    console.log('Logging into ERP:', url);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`ERP Login Failed: ${response.status}`);
    }

    const data: LoginResponse = await response.json();
    
    // Log full response for debugging
    console.log('Login Response:', JSON.stringify(data, null, 2));

    if (String(data.Status) !== '200' || !data.Data?.Datas?.SESSION_ID) {
        console.error('ERP Login Error:', data);
        throw new Error(data.Error?.Message || data.Errors?.[0]?.Message || 'Failed to retrieve Session ID');
    }

    return {
        sessionId: data.Data.Datas.SESSION_ID,
        hostUrl: data.Data.Datas.HOST_URL || `oapi${ZONE}.ecount.com`,
        setCookie: data.Data.Datas.SET_COOKIE
    };
}

export async function fetchErpStock(baseDate: string, whCds: string[] = []): Promise<ErpStockItem[]> {
    // 1. Get Dynamic Session ID and Host URL
    const { sessionId, hostUrl, setCookie } = await loginErp();
    
    // Ensure protocol is present
    const baseUrl = hostUrl.startsWith('http') ? hostUrl : `https://${hostUrl}`;
    
    let allResults: ErpStockItem[] = [];

    // Fetch for each warehouse individually if provided, otherwise fetch once (all or default)
    const warehousesToFetch = whCds.length > 0 ? whCds : [''];

    for (const whCd of warehousesToFetch) {
        // Construct URL for this specific request (though session ID is same)
        const url = `${baseUrl}/OAPI/V2/InventoryBalance/GetListInventoryBalanceStatusByLocation?SESSION_ID=${sessionId}`;
        
        const payload = {
            PROD_CD: "",
            WH_CD: whCd,
            BASE_DATE: baseDate // YYYYMMDD
        };

        console.log(`Fetching ERP Stock for WH: ${whCd || 'ALL'}`, url);
        console.log('Payload:', JSON.stringify(payload));
        console.log('Headers:', JSON.stringify({
            'Content-Type': 'application/json',
            'Cookie': setCookie,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }));

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': setCookie || '',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`ERP API Error: ${response.status} ${response.statusText}`);
            }

            const data: ErpApiResponse = await response.json();

            console.log(`ERP Stock Raw Response for ${whCd}:`, JSON.stringify(data, null, 2));

            // Check for API-level errors (even if HTTP status is 200)
            if (String(data.Status) !== '200') {
                console.error('ERP API Error Status:', data);
                const errorMsg = data.Error?.Message || data.Errors?.[0]?.Message || 'Unknown ERP API Error';
                throw new Error(errorMsg);
            }

            // Some responses might not have IsSuccess but have Result. 
            // Only throw if IsSuccess is explicitly false.
            if (data.Data && data.Data.IsSuccess === false) {
                 console.error('ERP API Data Failure:', JSON.stringify(data.Data, null, 2));
                 const detailMsg = data.Data.Error?.Message || 'Unknown Data Error';
                 throw new Error(`ERP API returned success=false: ${detailMsg}`);
            }

            if (data.Data?.Result) {
                allResults = [...allResults, ...data.Data.Result];
            } else {
                console.warn(`No Result in ERP response for ${whCd}`);
            }
        } catch (error) {
            console.error(`Fetch ERP Stock Error for WH ${whCd}:`, error);
            // Continue to next warehouse
        }
    }

    return allResults;
}
