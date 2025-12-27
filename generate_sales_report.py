
import pandas as pd
import os
from datetime import datetime

# Configuration
FILES = [
    r'd:\(주)에바스코스메틱 Dropbox\JI SEULKI\claude\@ongoing_SALES\2024.csv',
    r'd:\(주)에바스코스메틱 Dropbox\JI SEULKI\claude\@ongoing_SALES\2025.csv'
]
OUTPUT_FILE = r'C:\Users\passe\@PROJECT\oms-admin\sales_analysis_report.md'

def load_data(files):
    dfs = []
    for f in files:
        if not os.path.exists(f):
            print(f"Warning: File not found: {f}")
            continue
        try:
            # Try cp949 first (common for Korean CSVs)
            df = pd.read_csv(f, encoding='cp949')
        except UnicodeDecodeError:
            df = pd.read_csv(f, encoding='utf-8')
        dfs.append(df)
    
    if not dfs:
        raise ValueError("No data loaded")
    
    full_df = pd.concat(dfs, ignore_index=True)
    return full_df

def clean_data(df):
    # Standardize columns if needed (assuming they match based on inspection)
    # Expected: 일자, 거래처명, 품목명[규격], 금액, 거래처그룹1명
    
    # Date conversion
    df['Date'] = pd.to_datetime(df['일자'], format='%Y/%m/%d', errors='coerce')
    # If standard format fails, try integer format if that was seen (e.g. 20240101)
    if df['Date'].isnull().all():
         df['Date'] = pd.to_datetime(df['일자'], format='%Y%m%d', errors='coerce')

    df['YearMonth'] = df['Date'].dt.to_period('M')
    
    # Fill NA
    df['거래처명'] = df['거래처명'].fillna('Unknown')
    df['품목명'] = df['품목명[규격]'].fillna('Unknown')
    df['거래처그룹'] = df['거래처그룹1명'].fillna('Unknown')
    df['금액'] = pd.to_numeric(df['금액'], errors='coerce').fillna(0)
    
    # Extract Brand (First word of Item Name)
    df['Brand'] = df['품목명'].apply(lambda x: x.split(' ')[0] if isinstance(x, str) else 'Unknown')
    
    return df

def format_currency(val):
    return f"{int(val):,}"

def generate_markdown(df):
    lines = []
    lines.append("# Sales Performance Analysis Report (2024-2025)")
    lines.append(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    total_revenue = df['금액'].sum()
    lines.append(f"**Total Revenue:** {format_currency(total_revenue)} KRW\n")
    lines.append(f"**Total Records:** {len(df):,}\n")
    
    # 1. Monthly Trend
    lines.append("## 1. Monthly Sales Trend")
    monthly = df.groupby('YearMonth')['금액'].sum().reset_index()
    lines.append("| Month | Revenue |")
    lines.append("|---|---|")
    for _, row in monthly.iterrows():
        lines.append(f"| {row['YearMonth']} | {format_currency(row['금액'])} |")
    lines.append("\n")

    # 2. Top Customers
    lines.append("## 2. Top 10 Customers")
    cust_sales = df.groupby('거래처명')['금액'].sum().sort_values(ascending=False).head(10).reset_index()
    lines.append("| Customer | Revenue | Share |")
    lines.append("|---|---|---|")
    for _, row in cust_sales.iterrows():
        share = (row['금액'] / total_revenue) * 100
        lines.append(f"| {row['거래처명']} | {format_currency(row['금액'])} | {share:.1f}% |")
    lines.append("\n")

    # 3. Top Brands
    lines.append("## 3. Brand Performance")
    brand_sales = df.groupby('Brand')['금액'].sum().sort_values(ascending=False).reset_index()
    lines.append("| Brand | Revenue | Share |")
    lines.append("|---|---|---|")
    for _, row in brand_sales.iterrows():
        share = (row['금액'] / total_revenue) * 100
        lines.append(f"| {row['Brand']} | {format_currency(row['금액'])} | {share:.1f}% |")
    lines.append("\n")

    # 4. Customer Group Analysis
    lines.append("## 4. Customer Group Analysis")
    group_sales = df.groupby('거래처그룹')['금액'].sum().sort_values(ascending=False).reset_index()
    lines.append("| Group | Revenue | Share |")
    lines.append("|---|---|---|")
    for _, row in group_sales.iterrows():
        share = (row['금액'] / total_revenue) * 100
        lines.append(f"| {row['거래처그룹']} | {format_currency(row['금액'])} | {share:.1f}% |")
    lines.append("\n")
    
    # 5. Detail Analysis: Top 5 Brands Breakdown
    lines.append("## 5. Detailed Brand Analysis (Top 5)")
    top_5_brands = brand_sales.head(5)['Brand'].tolist()
    
    for brand in top_5_brands:
        lines.append(f"### Brand: {brand}")
        
        # Monthly trend for brand
        b_df = df[df['Brand'] == brand]
        
        # Top items for brand
        b_items = b_df.groupby('품목명')['금액'].sum().sort_values(ascending=False).head(5)
        
        lines.append(f"**Total Revenue:** {format_currency(b_df['금액'].sum())}")
        lines.append("\n**Top 5 Items:**")
        lines.append("| Item | Revenue |")
        lines.append("|---|---|")
        for item, rev in b_items.items():
            lines.append(f"| {item} | {format_currency(rev)} |")
        lines.append("\n")

    # 6. Detail Analysis: Top 5 Customers Breakdown
    lines.append("## 6. Detailed Customer Analysis (Top 5)")
    top_5_cust = cust_sales.head(5)['거래처명'].tolist()

    for cust in top_5_cust:
        lines.append(f"### Customer: {cust}")
        
        c_df = df[df['거래처명'] == cust]
        
        # Top Brands for this customer
        c_brands = c_df.groupby('Brand')['금액'].sum().sort_values(ascending=False).head(5)
        
        lines.append(f"**Total Revenue:** {format_currency(c_df['금액'].sum())}")
        
        lines.append("\n**Top 5 Brands:**")
        lines.append("| Brand | Revenue |")
        lines.append("|---|---|")
        for brand, rev in c_brands.items():
            lines.append(f"| {brand} | {format_currency(rev)} |")
        
        lines.append("\n**Top 5 Items:**")
        c_items = c_df.groupby('품목명')['금액'].sum().sort_values(ascending=False).head(5)
        lines.append("| Item | Revenue |")
        lines.append("|---|---|")
        for item, rev in c_items.items():
            lines.append(f"| {item} | {format_currency(rev)} |")
        lines.append("\n")


    return "\n".join(lines)

def main():
    print("Loading data...")
    raw_df = load_data(FILES)
    print(f"Loaded {len(raw_df)} rows.")
    
    print("Cleaning data...")
    df = clean_data(raw_df)
    
    print("Generating report...")
    report_content = generate_markdown(df)
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(report_content)
    
    print(f"Report saved to: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
