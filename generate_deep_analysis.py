
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
OUTPUT_FILE = r'C:\Users\passe\@PROJECT\oms-admin\sales_deep_analysis_report.md'
IMAGE_DIR = r'C:\Users\passe\@PROJECT\oms-admin\report_images'

# Ensure image directory exists
os.makedirs(IMAGE_DIR, exist_ok=True)

# Set Korean Font
matplotlib.rcParams['font.family'] = 'Malgun Gothic'
matplotlib.rcParams['axes.unicode_minus'] = False

def load_and_clean_data(files):
    dfs = []
    for f in files:
        if not os.path.exists(f): continue
        try: df = pd.read_csv(f, encoding='cp949')
        except UnicodeDecodeError: df = pd.read_csv(f, encoding='utf-8')
        dfs.append(df)
    
    full_df = pd.concat(dfs, ignore_index=True)
    
    # Date & Basic Columns
    full_df['Date'] = pd.to_datetime(full_df['일자'], format='%Y/%m/%d', errors='coerce')
    if full_df['Date'].isnull().all():
        full_df['Date'] = pd.to_datetime(full_df['일자'], format='%Y%m%d', errors='coerce')
    
    full_df['Year'] = full_df['Date'].dt.year
    full_df['Month'] = full_df['Date'].dt.month
    full_df['거래처명'] = full_df['거래처명'].fillna('Unknown')
    full_df['품목명'] = full_df['품목명[규격]'].fillna('Unknown')
    full_df['금액'] = pd.to_numeric(full_df['금액'], errors='coerce').fillna(0)
    full_df['수량'] = pd.to_numeric(full_df['수량'], errors='coerce').fillna(0)
    
    # Russia Consolidation
    russia_aliases = ['직수출', '스티물 주식회사', '스티물글로벌 주식회사', '스티물', '스티물글로벌']
    def normalize_cust(n):
        for a in russia_aliases:
            if a in n: return '직수출(러시아)'
        return n
    full_df['거래처명'] = full_df['거래처명'].apply(normalize_cust)
    
    # Brand Extraction
    full_df['Brand'] = full_df['품목명'].apply(lambda x: x.split(' ')[0])
    
    # Categorize Market: Export vs Domestic
    # Assumption: '직수출' or '수출' in Customer Group or Customer Name seems to be Export
    # We will refine based on user guide: "Export performance is accurate", "Domestic is summarized"
    # Let's trust '거래처그룹' if available, otherwise '거래처명'
    full_df['거래처그룹'] = full_df['거래처그룹1명'].fillna('')
    
    def classify_market(row):
        grp = str(row['거래처그룹'])
        cust = str(row['거래처명'])
        if '수출' in grp or '수출' in cust: return 'Export'
        return 'Domestic'
    
    full_df['Market'] = full_df.apply(classify_market, axis=1)
    
    # Flag Dummy Items for Domestic (월마감)
    # User said: "월마감 items are for revenue dummy only, exclude from Item analysis"
    full_df['IsDummy'] = full_df['품목명'].apply(lambda x: '월마감' in x or '배송비' in x)
    
    return full_df

def format_currency(val):
    return f"{int(val):,}"

def generate_report(df):
    lines = []
    lines.append("# 심층 영업 분석 보고서 (2024-2025)")
    lines.append(f"작성일: {datetime.now().strftime('%Y-%m-%d')}")
    lines.append("본 보고서는 24/25년 실적을 상세 비교하며, 특히 내수/수출 시장의 특성을 반영하여 이원화된 분석을 수행하였습니다.")
    lines.append("- **수출:** 매출액(Revenue) 기준 정밀 분석")
    lines.append("- **내수:** '월마감' 더미 데이터 제외 후 판매수량(Qty) 기준 실질 품목 분석\n")
    
    df_25 = df[df['Year'] == 2025]
    df_24 = df[df['Year'] == 2024]
    
    # 1. Market Overview
    lines.append("## 1. 시장별 개요 (Market Overview)")
    
    mkt_perf = df.groupby(['Year', 'Market'])['금액'].sum().unstack()
    lines.append("| 구분 (매출) | 2024년 | 2025년 | 증감율 | 비중(2025) |")
    lines.append("|---|---|---|---|---|")
    
    total_25 = df_25['금액'].sum()
    
    for mkt in ['Export', 'Domestic']:
        v24 = mkt_perf.loc[2024, mkt]
        v25 = mkt_perf.loc[2025, mkt]
        growth = ((v25 - v24)/v24*100) if v24 else 0
        share = (v25 / total_25)*100
        lines.append(f"| {mkt} | {format_currency(v24)} | {format_currency(v25)} | {growth:+.1f}% | {share:.1f}% |")
    
    lines.append("\n")
    
    
    # 2. Deep Dive: Top Brands with Automated Insights
    lines.append("## 2. 브랜드 심층 분석 (Brand Deep-Dive)")
    
    top_brands = df_25.groupby('Brand')['금액'].sum().sort_values(ascending=False).head(5).index.tolist()
    
    for brand in top_brands:
        lines.append(f"### 2.{top_brands.index(brand)+1} [{brand}]")
        b_df = df[df['Brand'] == brand]
        b_25 = b_df[b_df['Year'] == 2025]
        b_24 = b_df[b_df['Year'] == 2024]
        
        # Total Rev
        rev_25 = b_25['금액'].sum()
        rev_24 = b_24['금액'].sum()
        growth = ((rev_25-rev_24)/rev_24*100) if rev_24 else 0
        
        # Export vs Domestic Ratio (Rev)
        ex_rev = b_25[b_25['Market']=='Export']['금액'].sum()
        dom_rev = b_25[b_25['Market']=='Domestic']['금액'].sum()
        total_rev = ex_rev + dom_rev
        ex_ratio = (ex_rev/total_rev*100) if total_rev else 0
        
        # Automated Insight Generation
        insight_tags = []
        if growth > 10: insight_tags.append("🚀 고성장(Star)")
        elif growth < -10: insight_tags.append("📉 쇠퇴주의(Decline)")
        elif growth < 0: insight_tags.append("⚠️ 역성장")
        
        if ex_ratio > 60: insight_tags.append("🌏 수출주도형")
        elif ex_ratio < 20: insight_tags.append("🏠 내수집중형")
        
        if rev_25 > 3_000_000_000: insight_tags.append("💰 캐시카우")
        
        lines.append(f"**Insight Tags:** {' '.join(insight_tags)}")
        
        # Qualitative Summary Construction
        summary = f"**[{brand}]**는 전년 대비 **{growth:+.1f}%** 성장/하락하였습니다. "
        if ex_ratio > 50:
            summary += f"특히 **수출 비중이 {ex_ratio:.1f}%**로 해외 시장 의존도가 높으며, "
        else:
            summary += f"**내수 시장 중심({100-ex_ratio:.1f}%)**으로 운영되고 있으며, "
            
        lines.append(f"> 💡 **Insight:** {summary}전략적 대응이 필요합니다.")
        lines.append(f"\n- **총 매출:** {format_currency(rev_25)} 원")
        lines.append(f"- **시장 구성:** 수출 {format_currency(ex_rev)} / 내수 {format_currency(dom_rev)}")
        
        # A. Export Analysis (Revenue Based)
        lines.append("\n#### A. 수출 성과 (매출 기준)")
        ex_df = b_25[b_25['Market'] == 'Export']
        if ex_df.empty:
            lines.append("- 수출 실적 없음")
        else:
            # Top Customers
            top_ex_cust = ex_df.groupby('거래처명')['금액'].sum().sort_values(ascending=False).head(3)
            lines.append("**주요 수출 거래처:**")
            for c, v in top_ex_cust.items():
                lines.append(f"- {c}: {format_currency(v)} 원")
            
            # Top Items
            top_ex_items = ex_df.groupby('품목명')['금액'].sum().sort_values(ascending=False).head(5)
            lines.append("\n**주요 수출 품목 (매출 Top 5):**")
            lines.append("| 품목명 | 매출 | 수량 |")
            lines.append("|---|---|---|")
            for i, v in top_ex_items.items():
                q = ex_df[ex_df['품목명']==i]['수량'].sum()
                lines.append(f"| {i} | {format_currency(v)} | {int(q):,} |")
                
        # B. Domestic Analysis (Quantity Based, Exclude Dummy)
        lines.append("\n#### B. 내수 성과 (수량 기준, 실품목)")
        dom_df = b_25[(b_25['Market'] == 'Domestic') & (~b_25['IsDummy'])]
        
        if dom_df.empty:
             lines.append("- 내수 실품목 실적 미미 (월마감 위주 가능성)")
        else:
             # Top Items by Qty
             top_dom_items = dom_df.groupby('품목명')['수량'].sum().sort_values(ascending=False).head(5)
             lines.append("\n**주요 내수 품목 (판매수량 Top 5):**")
             lines.append("| 품목명 | 수량 | 트렌드(YoY) |")
             lines.append("|---|---|---|")
             
             for i, q in top_dom_items.items():
                 # Calc YoY Qty
                 q24 = b_24[(b_24['Market'] == 'Domestic') & (b_24['품목명'] == i)]['수량'].sum()
                 q_growth = ((q - q24)/q24*100) if q24 else 0
                 # Add specific insight if growth is extreme
                 trend_mark = ""
                 if q_growth > 50: trend_mark = "🔥"
                 elif q_growth < -20: trend_mark = "📉"
                 
                 lines.append(f"| {i} | {int(q):,} | {q_growth:+.1f}% {trend_mark} |")
                 
        lines.append("\n---\n")

    # 3. Customer Deep Dive with Insights
    lines.append("## 3. 핵심 거래처 영업 보고서 (Customer Reports)")
    
    top_custs = df_25.groupby('거래처명')['금액'].sum().sort_values(ascending=False).head(5).index.tolist()
    
    for cust in top_custs:
        lines.append(f"### 거래처: {cust}")
        c_df = df[df['거래처명'] == cust]
        c_25 = c_df[c_df['Year'] == 2025]
        c_24 = c_df[c_df['Year'] == 2024]
        
        rev_25 = c_25['금액'].sum()
        rev_24 = c_24['금액'].sum()
        growth = ((rev_25 - rev_24)/rev_24*100) if rev_24 else 0
        
        # Customer Insight
        c_insight = ""
        if growth > 20: c_insight = "전략적 파트너로서 거래 규모가 급성장 중입니다."
        elif growth < -10: c_insight = "거래 규모가 축소되고 있어 원인 파악 및 Relationship 관리가 시급합니다."
        else: c_insight = "안정적인 거래 규모를 유지하고 있습니다."
        
        lines.append(f"> 💡 **Account Insight:** {c_insight}")
        lines.append(f"- **2025 매출:** {format_currency(rev_25)} 원 (YoY {growth:+.1f}%)")
        
        # Brand Mix
        b_mix = c_25.groupby('Brand')['금액'].sum().sort_values(ascending=False).head(3)
        lines.append("**Top 3 구매 브랜드:**")
        brand_names = []
        for b, v in b_mix.items():
            lines.append(f"- {b}: {format_currency(v)} ({v/rev_25*100:.1f}%)")
            brand_names.append(b)
            
        # Top Items (Revenue)
        top_i = c_25.groupby('품목명')['금액'].sum().sort_values(ascending=False).head(5)
        lines.append("\n**Top 5 구매 품목:**")
        lines.append("| 품목명 | 매출 | 수량 |")
        lines.append("|---|---|---|")
        for i, v in top_i.items():
            q = c_25[c_25['품목명']==i]['수량'].sum()
            lines.append(f"| {i} | {format_currency(v)} | {int(q):,} |")
        lines.append("\n")

    return "\n".join(lines)

def main():
    print("Processing Deep Analysis...")
    df = load_and_clean_data(FILES)
    report = generate_report(df)
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(report)
    print(f"Report Generated: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
