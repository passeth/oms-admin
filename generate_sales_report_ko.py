
import pandas as pd
import os
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import matplotlib

# Configuration
FILES = [
    r'd:\(주)에바스코스메틱 Dropbox\JI SEULKI\claude\@ongoing_SALES\2024.csv',
    r'd:\(주)에바스코스메틱 Dropbox\JI SEULKI\claude\@ongoing_SALES\2025.csv'
]
OUTPUT_FILE = r'C:\Users\passe\@PROJECT\oms-admin\sales_analysis_report_ko.md'
IMAGE_DIR = r'C:\Users\passe\@PROJECT\oms-admin\report_images'

# Ensure image directory exists
os.makedirs(IMAGE_DIR, exist_ok=True)

# Set Korean Font
matplotlib.rcParams['font.family'] = 'Malgun Gothic'
matplotlib.rcParams['axes.unicode_minus'] = False

def load_data(files):
    dfs = []
    for f in files:
        if not os.path.exists(f):
            print(f"Warning: File not found: {f}")
            continue
        try:
            df = pd.read_csv(f, encoding='cp949')
        except UnicodeDecodeError:
            df = pd.read_csv(f, encoding='utf-8')
        dfs.append(df)
    
    if not dfs:
        raise ValueError("No data loaded")
    
    full_df = pd.concat(dfs, ignore_index=True)
    return full_df

def clean_data(df):
    # Date conversion
    df['Date'] = pd.to_datetime(df['일자'], format='%Y/%m/%d', errors='coerce')
    if df['Date'].isnull().all():
         df['Date'] = pd.to_datetime(df['일자'], format='%Y%m%d', errors='coerce')

    df['Year'] = df['Date'].dt.year
    df['Month'] = df['Date'].dt.month
    
    # Fill NA
    df['거래처명'] = df['거래처명'].fillna('Unknown')
    df['품목명'] = df['품목명[규격]'].fillna('Unknown')
    df['거래처그룹'] = df['거래처그룹1명'].fillna('Unknown')
    df['금액'] = pd.to_numeric(df['금액'], errors='coerce').fillna(0)
    
    # Customer Normalization (Russia Consolidation)
    russia_aliases = ['직수출', '스티물 주식회사', '스티물글로벌 주식회사', '스티물', '스티물글로벌']
    # If the customer name contains any of these aliases, rename it to '직수출(러시아)'
    # Using a more robust exact match or startswith might be safer if names vary slightly
    # But based on prev output: '직수출(러시아)', '스티물 주식회사', '스티물글로벌 주식회사'
    
    def normalize_customer(name):
        if pd.isna(name): return 'Unknown'
        # Check specific known names
        for alias in russia_aliases:
            if alias in name: # '직수출' might be too broad if there are other countries, but user said '직수출' is for Russia here
                return '직수출(러시아)'
        return name

    df['거래처명'] = df['거래처명'].apply(normalize_customer)

    # Extract Brand (First word of Item Name)
    df['Brand'] = df['품목명'].apply(lambda x: x.split(' ')[0] if isinstance(x, str) else 'Unknown')
    
    return df

def format_currency(val):
    return f"{int(val):,}"

def plot_monthly_trend(df_24, df_25):
    monthly_24 = df_24.groupby('Month')['금액'].sum()
    monthly_25 = df_25.groupby('Month')['금액'].sum()
    
    plt.figure(figsize=(12, 6))
    plt.plot(monthly_24.index, monthly_24.values, marker='o', label='2024년')
    plt.plot(monthly_25.index, monthly_25.values, marker='o', label='2025년')
    
    plt.title('월별 매출 추이 비교 (2024 vs 2025)')
    plt.xlabel('월')
    plt.ylabel('매출액 (원)')
    plt.legend()
    plt.grid(True)
    plt.savefig(os.path.join(IMAGE_DIR, 'monthly_trend.png'))
    plt.close()

def plot_top_brands(brand_sales_25, top_n=10):
    top_brands = brand_sales_25.head(top_n)
    
    plt.figure(figsize=(12, 6))
    sns.barplot(x='금액', y='Brand', data=top_brands)
    plt.title(f'2025년 상위 {top_n} 브랜드 매출')
    plt.xlabel('매출액 (원)')
    plt.ylabel('브랜드')
    plt.grid(axis='x')
    plt.tight_layout()
    plt.savefig(os.path.join(IMAGE_DIR, 'top_brands_2025.png'))
    plt.close()

def generate_markdown(df):
    lines = []
    lines.append("# 2024-2025년 매출 실적 상세 분석 보고서")
    lines.append(f"작성일: {datetime.now().strftime('%Y-%m-%d')}\n")
    
    df_24 = df[df['Year'] == 2024]
    df_25 = df[df['Year'] == 2025]
    
    total_24 = df_24['금액'].sum()
    total_25 = df_25['금액'].sum()
    yoy_growth = ((total_25 - total_24) / total_24 * 100) if total_24 > 0 else 0
    
    lines.append("## 1. 종합 실적 요약 (Executive Summary)")
    lines.append(f"- **2024년 총 매출:** {format_currency(total_24)} 원")
    lines.append(f"- **2025년 총 매출:** {format_currency(total_25)} 원")
    lines.append(f"- **성장률 (YoY):** {yoy_growth:+.2f}%")
    
    # Monthly Trend Plot
    plot_monthly_trend(df_24, df_25)
    lines.append("\n### 1.1 월별 매출 추이 비교")
    lines.append("![월별 매출 추이](report_images/monthly_trend.png)\n")
    
    lines.append("| 월 | 2024년 매출 | 2025년 매출 | 증감율 |")
    lines.append("|---|---|---|---|")
    
    monthly_24 = df_24.groupby('Month')['금액'].sum()
    monthly_25 = df_25.groupby('Month')['금액'].sum()
    
    for m in range(1, 13):
        rev_24 = monthly_24.get(m, 0)
        rev_25 = monthly_25.get(m, 0)
        growth = ((rev_25 - rev_24) / rev_24 * 100) if rev_24 > 0 else 0
        lines.append(f"| {m}월 | {format_currency(rev_24)} | {format_currency(rev_25)} | {growth:+.1f}% |")
    
    lines.append("\n## 2. 2025년 브랜드별 성과 분석 (Top 10)")
    
    brand_sales_24 = df_24.groupby('Brand')['금액'].sum()
    brand_sales_25 = df_25.groupby('Brand')['금액'].sum().sort_values(ascending=False).reset_index()
    
    plot_top_brands(brand_sales_25, 10)
    lines.append("![2025년 상위 브랜드](report_images/top_brands_2025.png)\n")
    
    lines.append("| 순위 | 브랜드 | 2025년 매출 | 2024년 매출 | 성장률 (YoY) | 비중(2025) |")
    lines.append("|---|---|---|---|---|---|")
    
    for idx, row in brand_sales_25.head(10).iterrows():
        brand = row['Brand']
        rev_25 = row['금액']
        rev_24 = brand_sales_24.get(brand, 0)
        growth = ((rev_25 - rev_24) / rev_24 * 100) if rev_24 > 0 else 0
        share = (rev_25 / total_25) * 100
        lines.append(f"| {idx+1} | {brand} | {format_currency(rev_25)} | {format_currency(rev_24)} | {growth:+.1f}% | {share:.1f}% |")
    
    lines.append("\n## 3. 2025년 거래처별 상세 분석 (Top 10)")
    cust_sales_25 = df_25.groupby('거래처명')['금액'].sum().sort_values(ascending=False).head(10).reset_index()
    
    lines.append("| 순위 | 거래처명 | 2025년 매출 | 비중 | 주요 구매 브랜드 (Top 1) |")
    lines.append("|---|---|---|---|---|")
    
    for idx, row in cust_sales_25.iterrows():
        cust = row['거래처명']
        rev = row['금액']
        share = (rev / total_25) * 100
        
        # Top brand for this customer
        cust_df = df_25[df_25['거래처명'] == cust]
        top_brand = cust_df.groupby('Brand')['금액'].sum().idxmax()
        
        lines.append(f"| {idx+1} | {cust} | {format_currency(rev)} | {share:.1f}% | {top_brand} |")

    lines.append("\n## 4. 2025년 거래처 그룹별 분석")
    group_sales_25 = df_25.groupby('거래처그룹')['금액'].sum().sort_values(ascending=False).reset_index()
    
    lines.append("| 그룹명 | 매출액 | 비중 |")
    lines.append("|---|---|---|")
    for _, row in group_sales_25.iterrows():
         share = (row['금액'] / total_25) * 100
         lines.append(f"| {row['거래처그룹']} | {format_currency(row['금액'])} | {share:.1f}% |")


    lines.append("\n## 5. 핵심 브랜드 상세 분석 (Top 3 - 2025년 기준)")
    top_3_brands = brand_sales_25.head(3)['Brand'].tolist()
    
    for brand in top_3_brands:
        lines.append(f"\n### [{brand}] 상세 분석")
        b_df_25 = df_25[df_25['Brand'] == brand]
        b_df_24 = df_24[df_24['Brand'] == brand]
        
        b_total_25 = b_df_25['금액'].sum()
        b_total_24 = b_df_24['금액'].sum()
        b_growth = ((b_total_25 - b_total_24) / b_total_24 * 100) if b_total_24 > 0 else 0
        
        lines.append(f"- **매출:** {format_currency(b_total_25)} 원 (YoY {b_growth:+.1f}%)")
        
        # Best Items
        best_items = b_df_25.groupby('품목명')['금액'].sum().sort_values(ascending=False).head(5)
        lines.append(f"\n**Best 5 품목 (2025):**")
        lines.append("| 품목명 | 매출액 |")
        lines.append("|---|---|")
        for item, val in best_items.items():
            lines.append(f"| {item} | {format_currency(val)} |")

    return "\n".join(lines)

def main():
    print("데이터 로딩 중...")
    raw_df = load_data(FILES)
    print("데이터 정제 중...")
    df = clean_data(raw_df)
    
    print("보고서 및 차트 생성 중...")
    report_content = generate_markdown(df)
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(report_content)
    
    print(f"완료! 보고서 저장됨: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
