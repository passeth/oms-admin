'use client'

import { BookOpen, Package, Gift, Truck, Archive, CheckCircle, AlertTriangle, Info } from 'lucide-react'

export default function GuidePage() {
    return (
        <div className="max-w-5xl mx-auto py-8 px-4 space-y-12 pb-32">

            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-full mb-4">
                    <BookOpen className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">OMS 사용자 가이드</h1>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                    주문 통합 관리 시스템(OMS) 사용 설명서입니다.<br />
                    주문 처리, 프로모션 적용, 출고 및 재고 관리의 주요 흐름을 확인하세요.
                </p>
            </div>

            {/* Workflow Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* 1. Order Processing */}
                <Section
                    icon={Package}
                    title="1. 주문 처리 (Order Processing)"
                    color="text-blue-600"
                    bg="bg-blue-50"
                >
                    <Step
                        num="1"
                        title="주문 엑셀 업로드"
                        desc="'Process New Orders' 메뉴에서 플레이오토(PlayAuto)에서 다운로드한 통합 주문 엑셀/CSV 파일을 업로드합니다."
                    />
                    <Step
                        num="2"
                        title="자동 매칭 (Auto-Matching)"
                        desc="시스템이 미리 정의된 룰에 따라 주문을 'Kit ID'와 자동으로 매칭합니다. 매칭되지 않은 주문은 별도 확인이 필요합니다."
                    />
                    <Step
                        num="3"
                        title="결과 검증"
                        desc="처리된 주문 목록을 확인하고, 상품명과 수량이 정확한지 점검합니다."
                    />
                </Section>

                {/* 2. Promotions */}
                <Section
                    icon={Gift}
                    title="2. 사은품 적용 (Promotions)"
                    color="text-pink-600"
                    bg="bg-pink-50"
                >
                    <Step
                        num="1"
                        title="규칙 정의"
                        desc="'Promotion Rules' 메뉴에서 '2개 사면 1개 증정' 등의 사은품 규칙을 설정합니다. 기간 및 수량 조건을 지정할 수 있습니다."
                    />
                    <Step
                        num="2"
                        title="기프트 적용하기"
                        desc="'Apply Gifts' 메뉴로 이동하여 대상 주문을 스캔하면, 조건에 맞는 프로모션을 자동으로 찾아냅니다."
                    />
                    <Step
                        num="3"
                        title="사은품 주문 생성"
                        desc="적용 결과를 검토한 후 'Apply' 버튼을 누르면, 사은품에 대한 출고 데이터가 별도로 생성됩니다."
                    />
                </Section>

                {/* 3. Dispatch */}
                <Section
                    icon={Truck}
                    title="3. 출고 지시 (Dispatch)"
                    color="text-green-600"
                    bg="bg-green-50"
                >
                    <Step
                        num="1"
                        title="출고 현황 확인"
                        desc="'Dispatch Summary' 메뉴에서 금일 출고해야 할 물량과 피킹 리스트(Picking List)를 확인합니다."
                    />
                    <Step
                        num="2"
                        title="자료 다운로드"
                        desc="창고 전달용 'Picking Report'와 ERP 등록용 'Ecount Upload' 엑셀 파일을 다운로드합니다."
                    />
                    <Step
                        num="3"
                        title="수량 체크"
                        desc="'총 예상 배송 건수'(합포장 기준 송장 수)와 '총 피킹 수량'(상품 개수 합계)을 구분하여 확인하세요."
                    />
                </Section>

                {/* 4. Inventory */}
                <Section
                    icon={Archive}
                    title="4. 재고 및 BOM 관리"
                    color="text-amber-600"
                    bg="bg-amber-50"
                >
                    <Step
                        num="1"
                        title="BOM (자재명세서) 관리"
                        desc="'Inventory > BOM Kits' 메뉴에서 세트(Kit) 상품이 어떤 단품(SKU)들로 구성되는지 정의합니다."
                    />
                    <Step
                        num="2"
                        title="상품 동기화"
                        desc="ERP 시스템의 최신 상품 정보를 주기적으로 동기화하여 데이터의 정확성을 유지합니다."
                    />
                </Section>

            </div>

            {/* Tips Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                    <Info className="w-5 h-5 text-slate-500" />
                    도움말 & 팁 (Tips)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Tip
                        title="매칭이 안 되나요?"
                        desc="'Unmatched' 상태인 주문은 'Inventory > Mappings' 메뉴에서 해당 쇼핑몰 상품 코드에 대한 매핑 규칙을 추가해야 합니다."
                    />
                    <Tip
                        title="사은품 수량이 0인가요?"
                        desc="'Price Discount (가격 할인)' 타입의 프로모션은 실물 사은품이 생성되지 않으므로 Gift Qty가 0입니다."
                    />
                    <Tip
                        title="엑셀 날짜 형식 주의"
                        desc="프로모션 엑셀 일괄 업로드 시, 날짜는 YYYY-MM-DD 형식을 권장합니다. (엑셀 숫자 형식도 자동 변환되긴 함)"
                    />
                    <Tip
                        title="배송 건수와 피킹 수량의 차이"
                        desc="배송 건수는 '수령인+주소' 기준 합포장 건수이며, 피킹 수량은 실제 출고되는 총 상품 개수이므로 숫자가 다를 수 있습니다."
                    />
                </div>
            </div>

        </div>
    )
}

function Section({ icon: Icon, title, children, color, bg }: any) {
    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-lg ${bg} ${color}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            </div>
            <div className="space-y-6 flex-1">
                {children}
            </div>
        </div>
    )
}

function Step({ num, title, desc }: any) {
    return (
        <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-sm border border-slate-200">
                {num}
            </div>
            <div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed word-keep-all">{desc}</p>
            </div>
        </div>
    )
}

function Tip({ title, desc }: any) {
    return (
        <div className="flex gap-3 items-start">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
                <h4 className="font-bold text-sm text-slate-800">{title}</h4>
                <p className="text-sm text-slate-500 mt-1 word-keep-all">{desc}</p>
            </div>
        </div>
    )
}
